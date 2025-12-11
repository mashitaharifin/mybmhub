// api/attendance/auto-punchout/+server.ts - ENHANCED VERSION (FIXED TYPES)
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	attendance,
	users,
	systemSettings,
	employees,
	auditLogs,
	notifications
} from '$lib/server/db/schema';
import { eq, and, isNull, gte, inArray } from 'drizzle-orm';

export async function GET() {
	try {
		// Get shift end time
		const shiftEndSetting = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.keyName, 'ShiftEnd'))
			.then((rows) => rows[0]);

		if (!shiftEndSetting?.value) {
			return json({ error: 'ShiftEnd not configured' }, { status: 500 });
		}

		const shiftEnd = shiftEndSetting.value; // e.g., "18:00"
		const [shiftHour, shiftMin] = shiftEnd.split(':').map(Number);

		// Get yesterday's date for auto-punching yesterday's records
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString().split('T')[0];

		// Get shift end time for yesterday
		const shiftEndTime = new Date(`${yesterdayISO}T11:00:00.000Z`); //hardcoded 19:00 MYT
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

		const processedUserIds: number[] = [];

		for (const record of pendingAttendances) {
			// Calculate worked hours
			const checkInTime = record.checkInTime;
			const checkOutTime = shiftEndTime;
			const diffMs = checkOutTime.getTime() - checkInTime!.getTime();
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

		// TRACK REPEATED AUTO-PUNCH-OUTS (LAST 30 DAYS) - FROM VERSION 2
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const repeated = await db
			.select({
				userId: attendance.userID
			})
			.from(attendance)
			.where(and(eq(attendance.autoPunchedOut, true), gte(attendance.checkInTime, thirtyDaysAgo)));

		// Count occurrences per user
		const countMap: Record<number, number> = {};
		for (const r of repeated) {
			countMap[r.userId] = (countMap[r.userId] || 0) + 1;
		}

		// List of users who crossed threshold (>= 3)
		const thresholdUsers = Object.entries(countMap)
			.filter(([_, count]) => count >= 3)
			.map(([userId]) => parseInt(userId));

		// Identify which of today's processed users are repeat offenders
		const repeatOffendersToday = processedUserIds.filter((userId) =>
			thresholdUsers.includes(userId)
		);

		// Get HR/Admin/Manager users to notify (excluding Employee role)
		const managers = await db
			.select({
				id: users.id,
				name: users.name,
				email: users.email,
				role: users.role
			})
			.from(users)
			.where(
				// Notify HR, Admin, and Manager roles
				// Adjust these values based on your actual role enum values
				inArray(users.role, ['Employee','Manager'])
			);

		// Get offender details for notification
		let repeatOffenderDetails = '';
		if (repeatOffendersToday.length > 0) {
			const repeatOffenderUsers = await db
				.select({ id: users.id, name: users.name, email: users.email })
				.from(users)
				.where(inArray(users.id, repeatOffendersToday))
				.then((rows) => {
					const map: Record<number, { name: string; email: string; count: number }> = {};
					rows.forEach((row) => {
						map[row.id] = {
							name: row.name || 'Unknown User',
							email: row.email || '',
							count: countMap[row.id] || 0
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
					.join('\n') +
				`\n\nAction Required: Please follow up with these employees regarding consistent failure to punch out.`;

			// 1. Create audit log for system action
			await db.insert(auditLogs).values({
				userID: null, // Null for system-initiated actions
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
						sentEmail: false, // Set to true if you want email notifications
						isRead: false
					})
				);
				await Promise.all(notificationPromises);
			}

			// 3. Optional: Also create notifications for the repeat offenders themselves
			const offenderNotifications = repeatOffendersToday.map((userId) => {
				const user = repeatOffenderUsers[userId];
				return db.insert(notifications).values({
					recipientID: userId,
					title: 'Attendance Reminder',
					message: `Please remember to punch out at the end of your shift. You have been auto-punched out ${countMap[userId]} times in the last 30 days. Repeated incidents may require disciplinary action.`,
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

		// Convert countMap keys to strings for JSON response
		const stringCountMap: Record<string, number> = {};
		Object.entries(countMap).forEach(([key, value]) => {
			stringCountMap[key] = value;
		});

		return json({
			success: true,
			message: 'Auto punch out completed',
			totalProcessed: pendingAttendances.length,
			date: yesterdayISO,
			repeatedAutoPunchOuts: stringCountMap,
			thresholdExceeded: thresholdUsers.map((id) => id.toString()),
			repeatOffendersToday: repeatOffendersToday.map((id) => id.toString()),
			managersNotified: managers.length,
			repeatOffendersCount: repeatOffendersToday.length
		});
	} catch (err) {
		console.error('Auto Punch Out Error:', err);
		return json({ error: 'Internal Server Error', details: err }, { status: 500 });
	}
}
