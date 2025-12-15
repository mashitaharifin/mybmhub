import type { RequestHandler } from '@sveltejs/kit';
import { eq, and, desc, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	attendance,
	punch,
	geofenceLocations,
	auditLogs,
	users,
	employees,
	systemSettings
} from '$lib/server/db/schema';
import { notifyPunchIn, notifyPunchOut } from '$lib/server/notifications/attendance';

// --- Helper: fetch shift start and grace from system settings ---
async function getShiftSettings() {
	const settings = await db
		.select()
		.from(systemSettings)
		.where(eq(systemSettings.category, 'WorkingHours'));
	const shiftStart = settings.find((s) => s.keyName === 'ShiftStart')?.value ?? '09:00';
	const graceMinutes = Number(settings.find((s) => s.keyName === 'GraceMinutes')?.value ?? 10);
	return { shiftStart, graceMinutes };
}

// --- Helper: calculate status for a given day ---
function calculateAttendanceStatus(
	checkInTime: Date | null,
	checkOutTime: Date | null,
	shiftStart: string,
	graceMinutes: number,
	shiftDate: Date
): 'present' | 'late' | 'absent' | 'incomplete' | 'complete' | 'missing-punch' {
	if (!checkInTime && !checkOutTime) return 'absent';
	if (!checkInTime && checkOutTime) return 'missing-punch';
	if (checkInTime && !checkOutTime) return 'incomplete';

	// both checkIn and checkOut exist
	const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number);
	const shiftStartDate = new Date(shiftDate);
	shiftStartDate.setHours(shiftHour, shiftMinute, 0, 0);

	const diffMinutes = (checkInTime!.getTime() - shiftStartDate.getTime()) / 1000 / 60;
	return diffMinutes <= graceMinutes ? 'present' : 'late';
}

// --- Helper: calculate worked hours ---
function calculateWorkedHours(checkInTime: Date | null, checkOutTime: Date | null) {
	if (!checkInTime || !checkOutTime) return 0;
	const diff = (checkOutTime.getTime() - checkInTime.getTime()) / 1000 / 3600;
	return +diff.toFixed(2);
}

// --- Helper: Determine day completion status ---
function getDayStatus(checkInTime: Date | null, checkOutTime: Date | null) {
	if (!checkInTime && !checkOutTime) return 'absent';
	if (!checkInTime && checkOutTime) return 'missing-punch';
	if (checkInTime && !checkOutTime) return 'incomplete';
	return 'complete'; // both checkIn and checkOut exist
}

// --- Helper: Determine punch timeliness (only based on check-in) ---
function getPunchTimeliness(
	checkInTime: Date,
	shiftStart: string,
	graceMinutes: number,
	timezone = 'Asia/Kuala_Lumpur'
) {
	// Convert checkInTime to target timezone
	const checkInLocal = new Date(checkInTime.toLocaleString('en-US', { timeZone: timezone }));

	const [shiftHour, shiftMinute] = shiftStart.split(':').map(Number);
	const shiftStartDate = new Date(checkInLocal);
	shiftStartDate.setHours(shiftHour, shiftMinute, 0, 0);

	const diffMinutes = (checkInLocal.getTime() - shiftStartDate.getTime()) / (1000 * 60);

	console.log('Debug:', {
		checkInTime: checkInTime.toISOString(),
		shiftStartDate: shiftStartDate.toISOString(),
		diffMinutes,
		graceMinutes
	});

	if (diffMinutes < 0) return 'early';
	return diffMinutes <= graceMinutes ? 'on-time' : 'late';
}

// --- Helper: auto punch out (private) ---
async function performAutoPunchOut() {
	const now = new Date();
	const todayISO = now.toISOString().split('T')[0];
	const { shiftStart, graceMinutes } = await getShiftSettings();

	const pendingAttendances = await db
		.select()
		.from(attendance)
		.where(and(isNull(attendance.checkOutTime), eq(attendance.summaryDate, todayISO)));

	for (const record of pendingAttendances) {
		const workedHours = calculateWorkedHours(record.checkInTime, now);

		// get employee ID for audit log
		const employeeRecord = await db
			.select()
			.from(employees)
			.where(eq(employees.userId, record.userID))
			.then((r) => r[0]);

		await db
			.update(attendance)
			.set({
				checkOutTime: now,
				autoPunchedOut: true,
				autoPunchedOutReasonRequired: true, // ✔ require reason tomorrow
				workedHours: workedHours.toString(),
				totalHours: workedHours.toString(),
				attendanceStatus: calculateAttendanceStatus(
					record.checkInTime,
					now,
					shiftStart,
					graceMinutes,
					new Date(record.summaryDate)
				),
				updatedAt: now
			})
			.where(eq(attendance.id, record.id));

		const userName = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, record.userID))
			.then((rows) => rows[0]?.name ?? 'Unknown User');

		await db.insert(auditLogs).values({
			userID: record.userID,
			employeeID: employeeRecord?.id ?? null,
			actionType: 'AUTO PUNCH OUT',
			action: 'Auto Punch Out',
			targetTable: 'attendance',
			targetID: record.id,
			details: `${userName} was auto punched out at ${now.toLocaleString('en-MY', {
				timeZone: 'Asia/Kuala_Lumpur',
				hour12: false
			})}`,
			isUserVisible: false
		});
	}
}

// --- GET handler ---
export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user)
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});

		const todayISO = new Date().toISOString().split('T')[0];

		// Get yesterday's date for auto-punch check
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString().split('T')[0];

		const { shiftStart, graceMinutes } = await getShiftSettings();

		const lastRecords = await db
			.select()
			.from(attendance)
			.where(eq(attendance.userID, user.id))
			.orderBy(desc(attendance.summaryDate))
			.limit(7);

		const todayRecord = lastRecords.find((r) => r.summaryDate === todayISO) ?? null;
		const shiftDate = todayRecord ? new Date(todayRecord.summaryDate) : new Date(todayISO);

		let status: 'IN' | 'OUT' | 'ABSENT' = 'ABSENT';
		if (todayRecord) {
			if (todayRecord.checkInTime && !todayRecord.checkOutTime) status = 'IN';
			else if (todayRecord.checkInTime && todayRecord.checkOutTime) status = 'OUT';
		}

		const attendanceStatus = calculateAttendanceStatus(
			todayRecord?.checkInTime ?? null,
			todayRecord?.checkOutTime ?? null,
			shiftStart,
			graceMinutes,
			shiftDate
		);

		// Check yesterday's record for auto-punch requirement
		const yesterdayRecord = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.userID, user.id), eq(attendance.summaryDate, yesterdayISO)))
			.then((rows) => rows[0]);

		// Check if auto-punch reason is required for yesterday
		// User needs to provide reason if:
		// 1. They were auto-punched out yesterday (autoPunchedOutReasonRequired is true)
		// 2. They haven't provided a reason yet (autoPunchedOutReason is null/empty)
		const needsReason =
			yesterdayRecord?.autoPunchedOutReasonRequired &&
			(!yesterdayRecord?.autoPunchedOutReason ||
				yesterdayRecord.autoPunchedOutReason.trim() === '');

		const payload = {
			summaryDate: todayISO,
			checkInTime: todayRecord?.checkInTime ?? null,
			checkOutTime: todayRecord?.checkOutTime ?? null,
			workedHours: todayRecord?.workedHours ?? null,
			totalHours: todayRecord?.totalHours ?? null,
			status,
			attendanceStatus
		};

		return new Response(
			JSON.stringify({
				success: true,
				data: payload,
				// Return auto-punch reason requirement for yesterday
				autoPunchedOutReasonRequired: needsReason,
				// Return the attendance record ID for yesterday if reason is needed
				id: needsReason ? yesterdayRecord.id : (todayRecord?.id ?? null),
				// Indicate which date needs the reason
				pendingRecordDate: needsReason ? yesterdayISO : null,
				// Still include today's record info for completeness
				todayRecordId: todayRecord?.id ?? null
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('empQuickAttendance GET error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch quick attendance' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};

// --- POST handler ---
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user)
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});

		const { actionType, latitude, longitude, accuracyMeters } = await request.json();
		if (!['IN', 'OUT'].includes(actionType))
			return new Response(JSON.stringify({ success: false, error: 'Invalid action type' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});

		// --- BLOCK PUNCH IN IF YESTERDAY HAD AUTO PUNCH OUT WITHOUT REASON ---
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString().split('T')[0];

		const ytdRecord = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.userID, user.id), eq(attendance.summaryDate, yesterdayISO)))
			.then((r) => r[0]);

		// Block if auto-punched out AND reason is required AND reason not submitted
		if (actionType === 'IN' && 
			ytdRecord?.autoPunchedOut && 
			ytdRecord?.autoPunchedOutReasonRequired && 
			(!ytdRecord?.autoPunchedOutReason || ytdRecord.autoPunchedOutReason.trim() === '')) {
			
			return new Response(
				JSON.stringify({
					success: false, // Changed to false to indicate error
					blocked: true,
					autoPunchedOutReasonRequired: true,
					id: ytdRecord.id,
					message: 'You must submit a reason for yesterday\'s auto punch-out before punching in today.'
				}),
				{ status: 403, headers: { 'Content-Type': 'application/json' } }
			);
		}

		const geofence = await db
			.select()
			.from(geofenceLocations)
			.where(eq(geofenceLocations.isActive, true))
			.limit(1)
			.then((r) => r[0]);
		let withinGeofence = false;

		if (geofence && typeof latitude === 'number' && typeof longitude === 'number') {
			const toRad = (val: number) => (val * Math.PI) / 180;
			const R = 6371000;
			const dLat = toRad(latitude - Number(geofence.latitude));
			const dLon = toRad(longitude - Number(geofence.longitude));
			const lat1 = toRad(Number(geofence.latitude));
			const lat2 = toRad(latitude);
			const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			const distance = R * c;
			withinGeofence = distance <= Number(geofence.radiusMeters);
		}

		const now = new Date();
		const todayISO = now.toISOString().split('T')[0];
		const { shiftStart, graceMinutes } = await getShiftSettings();

		let todayAttendance = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.userID, user.id), eq(attendance.summaryDate, todayISO)))
			.then((rows) => rows[0]);

		if (!todayAttendance) {
			const inserted = await db
				.insert(attendance)
				.values({ userID: user.id, summaryDate: todayISO })
				.returning();
			todayAttendance = inserted[0];
		}

		await db.insert(punch).values({
			userID: user.id,
			eventType: actionType === 'IN' ? 'CheckIn' : 'CheckOut',
			eventTime: now,
			locationLat: latitude,
			locationLng: longitude,
			accuracyMeters: accuracyMeters ? Math.round(accuracyMeters) : null,
			source: 'Web',
			notes: withinGeofence ? 'Within geofence radius' : 'Outside geofence radius'
		});

		let updatedData: any = { updatedAt: now };
		if (actionType === 'IN') updatedData.checkInTime = now;

		if (actionType === 'IN') {
			updatedData.autoPunchedOutReasonRequired = false; // ✔ cleared once punch in allowed

			// Send punch in notification
			await notifyPunchIn({
				employeeUserId: user.id,
				punchInTime: now.toISOString()
			});
		}

		if (actionType === 'OUT') {
			updatedData.checkOutTime = now;
			const workedHours = calculateWorkedHours(todayAttendance.checkInTime, now);
			updatedData.workedHours = workedHours.toString();
			updatedData.totalHours = workedHours.toString();

			// Send punch out notification
			await notifyPunchOut({
				employeeUserId: user.id,
				punchOutTime: now.toISOString(),
				totalHours: `${workedHours.toFixed(2)}h` // you can format as '8h 10m' if needed
			});
		}

		const shiftDate = new Date(todayISO);
		// ✅ Determine day status
		const dayStatus = getDayStatus(
			todayAttendance.checkInTime ?? (actionType === 'IN' ? now : null),
			actionType === 'OUT' ? now : todayAttendance.checkOutTime
		);
		updatedData.attendanceStatus = dayStatus;

		// ✅ Determine punch timeliness (only if check-in exists)
		let punchTimeliness: 'early' | 'on-time' | 'late' | null = null;
		if (todayAttendance.checkInTime || actionType === 'IN') {
			const checkInTime = todayAttendance.checkInTime ?? now;
			punchTimeliness = getPunchTimeliness(checkInTime, shiftStart, graceMinutes);
		}

		await db.update(attendance).set(updatedData).where(eq(attendance.id, todayAttendance.id));

		const userName = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, user.id))
			.then((r) => r[0]?.name ?? 'Unknown User');
		const employeeRecord = await db
			.select()
			.from(employees)
			.where(eq(employees.userId, user.id))
			.then((r) => r[0]);
		const employeeId = employeeRecord?.id;

		await db.insert(auditLogs).values({
			userID: user.id,
			employeeID: employeeId ?? null,
			actionType: actionType === 'IN' ? 'PUNCH IN' : 'PUNCH OUT',
			action: actionType === 'IN' ? 'Employee Punch In' : 'Employee Punch Out',
			targetTable: 'attendance',
			targetID: todayAttendance.id,
			details: `${userName} punches ${actionType === 'IN' ? 'in' : 'out'} at ${now.toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour12: false })} ${withinGeofence ? 'within office area' : 'outside office area'}.`,
			isUserVisible: true
		});

		const message = withinGeofence
			? `Successfully punched ${actionType === 'IN' ? 'in' : 'out'} within office area.`
			: `You have punched ${actionType === 'IN' ? 'in' : 'out'} successfully, but your location is outside the specified geofence.`;

		return new Response(
			JSON.stringify({
				success: true,
				message,
				withinGeofence,
				dayStatus,
				punchTimeliness,
				autoPunchedOutReasonRequired: todayAttendance?.autoPunchedOutReasonRequired ?? false,
				id: todayAttendance?.id ?? null
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('empQuickAttendance POST error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to process punch action' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
