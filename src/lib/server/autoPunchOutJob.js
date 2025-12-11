import { db } from './db';
import {
	attendance,
	users,
	systemSettings,
	employees,
	auditLogs,
	notifications
} from './db/schema';
import { eq, and, isNull, gte, inArray } from 'drizzle-orm';

export async function autoPunchOutJob() {
	try {
		let shiftEnd = '19:00'; // Default fallback

		try {
			const shiftEndSetting = await db
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.keyName, 'ShiftEnd'))
				.then((rows) => rows[0]);

			if (shiftEndSetting?.value) {
				shiftEnd = shiftEndSetting.value;
			} else {
				console.warn('ShiftEnd not configured, using default:', shiftEnd);
				
			}
		} catch (dbError) {
			console.warn('Could not fetch ShiftEnd setting, using default:', shiftEnd);
		}

		const [shiftHour, shiftMin] = shiftEnd.split(':').map(Number);

		// Get yesterday's date for auto-punching yesterday's records
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString().split('T')[0];

		// Get shift end time for yesterday
		const shiftEndTime = new Date(`${yesterdayISO}T11:00:00.000Z`);
		shiftEndTime.setHours(shiftHour, shiftMin, 0, 0);

		// Find users who punched in yesterday but didn't punch out
		const pendingAttendances = await db
			.select()
			.from(attendance)
			.where(
				and(
					eq(attendance.summaryDate, yesterdayISO),
					isNull(attendance.checkOutTime),
					eq(attendance.attendanceStatus, 'incomplete')
				)
			);

		console.log(`Found ${pendingAttendances.length} pending attendances for ${yesterdayISO}`);

		/** @type {number[]} */
		const processedUserIds = [];

		for (const record of pendingAttendances) {
			if (!record.checkInTime) continue;

			// Calculate worked hours
			const checkInTime = record.checkInTime;
			const checkOutTime = shiftEndTime;
			const diffMs = checkOutTime.getTime() - checkInTime.getTime();
			const workedHours = diffMs / (1000 * 60 * 60);

			// Update attendance record
			await db
				.update(attendance)
				.set({
					checkOutTime: shiftEndTime,
					autoPunchedOut: true,
					autoPunchedOutReasonRequired: true,
					workedHours: workedHours.toFixed(2),
					totalHours: workedHours.toFixed(2),
					attendanceStatus: 'missing-punch',
					updatedAt: new Date()
				})
				.where(eq(attendance.id, record.id));

			// Track processed users for repeat offender analysis
			processedUserIds.push(record.userID);

			// Add audit log
			const userName = await db
				.select({ name: users.name })
				.from(users)
				.where(eq(users.id, record.userID))
				.then((rows) => rows[0]?.name ?? 'Unknown User');

			const employeeRecord = await db
				.select()
				.from(employees)
				.where(eq(employees.userId, record.userID))
				.then((rows) => rows[0]);

			await db.insert(auditLogs).values({
				userID: record.userID,
				employeeID: employeeRecord?.id ?? null,
				actionType: 'AUTO PUNCH OUT',
				action: 'Auto Punch Out',
				targetTable: 'attendance',
				targetID: record.id,
				details: `${userName} was auto punched out at ${shiftEndTime.toLocaleString('en-MY', {
					timeZone: 'Asia/Kuala_Lumpur',
					hour12: false
				})} for date ${yesterdayISO}`,
				isUserVisible: false
			});
		}

		// TRACK REPEATED AUTO-PUNCH-OUTS (LAST 30 DAYS)
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const repeated = await db
			.select({
				userId: attendance.userID
			})
			.from(attendance)
			.where(and(eq(attendance.autoPunchedOut, true), gte(attendance.checkInTime, thirtyDaysAgo)));

		// Count occurrences per user with proper typing
		/** @type {Record<number, number>} */
		const countMap = {};
		for (const r of repeated) {
			const userId = r.userId;
			countMap[userId] = (countMap[userId] || 0) + 1;
		}

		// List of users who crossed threshold (>= 3)
		const thresholdUsers = Object.entries(countMap)
			.filter(([_, count]) => count >= 3)
			.map(([userId]) => parseInt(userId));

		// Identify which of today's processed users are repeat offenders
		const repeatOffendersToday = processedUserIds.filter((userId) =>
			thresholdUsers.includes(userId)
		);

		// Get HR/Admin/Manager users to notify
		const managers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role
			})
			.from(users)
			.where(inArray(users.role, ['Employee', 'Manager']));

		// Get offender details for notification
		let repeatOffenderDetails = '';

		/** @type {Record<number, {name: string, email: string, count: number}>} */
		let repeatOffenderUsers = {};

		if (repeatOffendersToday.length > 0) {
			repeatOffenderUsers = await db
				.select({ id: users.id, name: users.name, email: users.email })
				.from(users)
				.where(inArray(users.id, repeatOffendersToday))
				.then((rows) => {
					/** @type {Record<number, {name: string, email: string, count: number}>} */
					const map = {};
					rows.forEach((row) => {
						const userId = row.id;
						map[userId] = {
							name: row.name || 'Unknown User',
							email: row.email || '',
							count: countMap[userId] || 0
						};
					});
					return map;
				});

			repeatOffenderDetails =
				`Repeat Auto-Punch Offenders Detected\n\n` +
				`Date: ${yesterdayISO}\n` +
				`Total offenders today: ${repeatOffendersToday.length}\n\n` +
				`Offenders:\n` +
				repeatOffendersToday
					.map((userId) => {
						const user = repeatOffenderUsers[userId];
						return `• ${user.name} (${user.email}): ${user.count} auto-punches in last 30 days`;
					})
					.join('\n');

			// 1. Create audit log for system action
			await db.insert(auditLogs).values({
				userID: null,
				employeeID: null,
				actionType: 'SYSTEM_ALERT',
				action: 'Repeat Offender Detection',
				targetTable: 'system',
				targetID: null,
				details: `System detected ${repeatOffendersToday.length} repeat auto-punch offenders for date ${yesterdayISO}`,
				isUserVisible: false
			});

			// 2. Create notifications for managers/HR/Admins
			if (managers.length > 0) {
				const notificationPromises = managers.map((manager) =>
					db.insert(notifications).values({
						recipientID: manager.id,
						title: 'Repeat Auto-Punch Offenders Detected',
						message: repeatOffenderDetails,
						type: 'General',
						relatedLeaveID: null,
						triggerDate: new Date(),
						sentAt: new Date(),
						sentInApp: true,
						sentEmail: false,
						isRead: false
					})
				);
				await Promise.all(notificationPromises);
			}

			// 3. Notifications for repeat offenders
			const offenderNotifications = repeatOffendersToday.map((userId) => {
				const user = repeatOffenderUsers[userId];
				const userCount = countMap[userId] || 0;

				return db.insert(notifications).values({
					recipientID: userId,
					title: 'Attendance Reminder',
					message: `Please remember to punch out at the end of your shift. You have been auto-punched out ${userCount} times in the last 30 days.`,
					type: 'General',
					relatedLeaveID: null,
					triggerDate: new Date(),
					sentAt: new Date(),
					sentInApp: true,
					sentEmail: false,
					isRead: false
				});
			});
			await Promise.all(offenderNotifications);
		}

		return {
			success: true,
			message: 'Auto punch out completed',
			totalProcessed: pendingAttendances.length,
			date: yesterdayISO,
			repeatedAutoPunchOuts: countMap,
			thresholdExceeded: thresholdUsers,
			repeatOffendersToday: repeatOffendersToday,
			managersNotified: managers.length,
			repeatOffendersCount: repeatOffendersToday.length
		};
	} catch (err) {
		console.error('Auto Punch Out Job Error:', err);
		throw err;
	}
}
