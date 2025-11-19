import type { RequestHandler } from '@sveltejs/kit';
import { eq, and, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, punch, geofenceLocations, auditLogs, users, employees } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const todayISO = new Date().toISOString().split('T')[0];

		// Find today's attendance by summaryDate
		const todayRecord = await db
			.select({
				id: attendance.id,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours,
				totalHours: attendance.totalHours
			})
			.from(attendance)
			.where(eq(attendance.userID, user.id))
			.orderBy(desc(attendance.summaryDate))
			.limit(7) // fetch recent few in case summaryDate not normalized
			.then((rows) => {
				// find a row with summaryDate === todayISO
				return (
					rows.find((r) => {
						if (!r.summaryDate) return false;
						const d = new Date(r.summaryDate).toISOString().split('T')[0];
						return d === todayISO;
					}) ?? null
				);
			});

		// Determine quick status
		let status: 'IN' | 'OUT' | 'ABSENT' = 'ABSENT';
		if (todayRecord) {
			if (todayRecord.checkInTime && !todayRecord.checkOutTime) status = 'IN';
			else if (todayRecord.checkInTime && todayRecord.checkOutTime) status = 'OUT';
			else if (!todayRecord.checkInTime && !todayRecord.checkOutTime) status = 'ABSENT';
		}

		const payload = {
			summaryDate: todayRecord?.summaryDate
				? new Date(todayRecord.summaryDate).toISOString().split('T')[0]
				: todayISO,
			checkInTime: todayRecord?.checkInTime
				? new Date(todayRecord.checkInTime).toISOString()
				: null,
			checkOutTime: todayRecord?.checkOutTime
				? new Date(todayRecord.checkOutTime).toISOString()
				: null,
			workedHours: todayRecord?.workedHours ?? null,
			totalHours: todayRecord?.totalHours ?? null,
			status
		};

		return new Response(JSON.stringify({ success: true, data: payload }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('empQuickAttendance GET error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch quick attendance' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const { actionType, latitude, longitude, accuracyMeters } = await request.json();

		if (!['IN', 'OUT'].includes(actionType)) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid action type' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Fetch active geofence location(s)
		const geofence = await db
			.select()
			.from(geofenceLocations)
			.where(eq(geofenceLocations.isActive, true))
			.limit(1)
			.then((rows) => rows[0]);

		// Compute geofence distance (Haversine formula)
		const toRad = (val: number) => (val * Math.PI) / 180;
		let withinGeofence = false;

		if (geofence && latitude && longitude) {
			const R = 6371000; // meters
			const dLat = toRad(Number(latitude) - Number(geofence.latitude));
			const dLon = toRad(Number(longitude) - Number(geofence.longitude));
			const lat1 = toRad(Number(geofence.latitude));
			const lat2 = toRad(Number(latitude));

			const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
			const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
			const distance = R * c;

			withinGeofence = distance <= Number(geofence.radiusMeters);
		}

		const now = new Date();
		const today = now.toISOString().split('T')[0];

		// Find or create attendance summary
		let todayAttendance = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.userID, user.id), eq(attendance.summaryDate, today)))
			.then((rows) => rows[0]);

		if (!todayAttendance) {
			const inserted = await db
				.insert(attendance)
				.values({
					userID: user.id,
					summaryDate: today
				})
				.returning();
			todayAttendance = inserted[0];
		}

		// Insert punch event
		await db.insert(punch).values({
			userID: user.id,
			eventType: actionType === 'IN' ? 'CheckIn' : 'CheckOut',
			eventTime: now,
			locationLat: latitude,
			locationLng: longitude,
			accuracyMeters: accuracyMeters ?? null,
			source: 'Web',
			notes: withinGeofence ? 'Within geofence radius' : 'Outside geofence radius'
		});

		// Update attendance summary
		if (actionType === 'IN') {
			await db
				.update(attendance)
				.set({
					checkInTime: now,
					updatedAt: now
				})
				.where(eq(attendance.id, todayAttendance.id));
		} else if (actionType === 'OUT') {
			const updated = await db
				.update(attendance)
				.set({
					checkOutTime: now,
					updatedAt: now
				})
				.where(eq(attendance.id, todayAttendance.id))
				.returning({ checkInTime: attendance.checkInTime });

			// Calculate worked hours
			if (updated[0]?.checkInTime) {
				const diff = (now.getTime() - new Date(updated[0].checkInTime).getTime()) / 1000 / 3600;
				await db
					.update(attendance)
					.set({
						workedHours: diff.toFixed(2),
						totalHours: diff.toFixed(2)
					})
					.where(eq(attendance.id, todayAttendance.id));
			}
		}

		// Insert audit log
		const userName = await db
			.select({ name: users.name })
			.from(users)
			.where(eq(users.id, user.id))
			.then((rows) => rows[0]?.name ?? 'Unknown User');

		const localTime = now.toLocaleString('en-MY', {
			timeZone: 'Asia/Kuala_Lumpur', 
			hour12: false,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		const auditDetail = `${userName} punches ${actionType === 'IN' ? 'in' : 'out'} at ${localTime} ${
			withinGeofence ? 'within office area' : 'outside office area'
		}.`;

		const employeeRecord = await db
			.select()
			.from(employees)
			.where(eq(employees.userId, user.id))
			.then((rows) => rows[0]);

		if (!employeeRecord) {
			console.error('No employee record found for user.id:', user.id);
		}

		const employeeId = employeeRecord?.id;

		await db.insert(auditLogs).values({
			userID: user.id,
			employeeID: employeeId,
			actionType: actionType === 'IN' ? 'PUNCH IN' : 'PUNCH OUT',
			action: actionType === 'IN' ? 'Employee Punch In' : 'Employee Punch Out',
			targetTable: 'attendance',
			targetID: todayAttendance.id,
			details: auditDetail,
			isUserVisible: true
		});

		const message = withinGeofence
			? `Successfully punched ${actionType === 'IN' ? 'in' : 'out'} within office area.`
			: `You have punched ${actionType === 'IN' ? 'in' : 'out'} successfully, but your location is outside the specified geofence.`;

		return new Response(JSON.stringify({ success: true, message, withinGeofence }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('empQuickAttendance POST error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to process punch action' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
