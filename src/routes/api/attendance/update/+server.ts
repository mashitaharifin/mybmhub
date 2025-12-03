import type { RequestHandler } from './$types';
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance } from '$lib/server/db/schema/attendance';
import { punch } from '$lib/server/db/schema/punch';
import { auditLogs, users, employees } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { resolveGeofence } from '$lib/utils/geofence';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const currentUser = locals.user;

		// Check if user is authenticated
		if (!currentUser) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		console.log('📝 UPDATE API - Received payload:', {
			checkOutTime: body.checkOutTime,
			checkOutLat: body.checkOutLat,
			checkOutLng: body.checkOutLng,
			notes: body.notes
		});

		const {
			id,
			userID, // This is the employee ID whose attendance is being modified
			summaryDate,
			checkInTime,
			checkOutTime,
			checkInLat,
			checkInLng,
			checkOutLat,
			checkOutLng,
			notes
		} = body;

		if (!id || !userID || !summaryDate) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Get employee details for audit log
		const employee = await db.query.employees.findFirst({
			where: eq(employees.userId, userID),
			columns: { id: true }
		});

		if (!employee) {
			return json({ error: 'Employee not found' }, { status: 404 });
		}

		// Get original attendance record for comparison
		const originalRecord = await db.query.attendance.findFirst({
			where: eq(attendance.id, id),
			columns: {
				checkInTime: true,
				checkOutTime: true
			}
		});

		// 1. UPDATE ATTENDANCE
		await db
			.update(attendance)
			.set({
				checkInTime: checkInTime ? new Date(checkInTime) : null,
				checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
				isModified: 1,
				updatedAt: new Date()
			})
			.where(eq(attendance.id, id));

		console.log('✅ Updated attendance record');

		// 2. UPDATE CHECK-IN PUNCH (if exists)
		if (checkInTime) {
			const punchRow = await db.query.punch.findFirst({
				where: and(
					eq(punch.userID, userID),
					sql`DATE(${punch.eventTime}) = ${summaryDate}`,
					eq(punch.eventType, 'CheckIn')
				)
			});

			if (punchRow) {
				await db
					.update(punch)
					.set({
						eventTime: new Date(checkInTime),
						locationLat: checkInLat ?? null,
						locationLng: checkInLng ?? null,
						notes: notes ?? punchRow.notes,
						source: 'Web' // Changed to 'Web'
					})
					.where(eq(punch.id, punchRow.id));
				console.log('✅ Updated check-in punch');
			} else if (checkInTime) {
				// CREATE NEW CHECK-IN PUNCH if it doesn't exist
				await db.insert(punch).values({
					userID: userID,
					eventType: 'CheckIn',
					eventTime: new Date(checkInTime),
					locationLat: checkInLat ?? null,
					locationLng: checkInLng ?? null,
					notes: notes ?? null,
					source: 'Web' // Changed to 'Web'
				});
				console.log('✅ Created new check-in punch');
			}
		}

		// 3. UPDATE OR CREATE CHECK-OUT PUNCH
		if (checkOutTime) {
			console.log('🔄 Processing check-out punch update...');

			const punchRow = await db.query.punch.findFirst({
				where: and(
					eq(punch.userID, userID),
					sql`DATE(${punch.eventTime}) = ${summaryDate}`,
					eq(punch.eventType, 'CheckOut')
				)
			});

			console.log('🔍 Found check-out punch row:', punchRow);

			if (punchRow) {
				// UPDATE EXISTING CHECK-OUT PUNCH
				await db
					.update(punch)
					.set({
						eventTime: new Date(checkOutTime),
						locationLat: checkOutLat ?? null,
						locationLng: checkOutLng ?? null,
						notes: notes ?? punchRow.notes,
						source: 'Web' // Changed to 'Web'
					})
					.where(eq(punch.id, punchRow.id));
				console.log('✅ Updated check-out punch with location:', {
					locationLat: checkOutLat,
					locationLng: checkOutLng
				});
			} else {
				// CREATE NEW CHECK-OUT PUNCH if it doesn't exist
				console.log('🆕 Creating new check-out punch...');
				await db.insert(punch).values({
					userID: userID,
					eventType: 'CheckOut',
					eventTime: new Date(checkOutTime),
					locationLat: checkOutLat ?? null,
					locationLng: checkOutLng ?? null,
					notes: notes ?? null,
					source: 'Web' // Changed to 'Web'
				});
				console.log('✅ Created new check-out punch');
			}
		}

		// 4. CREATE AUDIT LOG
		const auditDetails = buildAuditDetails(originalRecord, body, notes);

		await db.insert(auditLogs).values({
			userID: currentUser.id, // Manager who performed the action
			employeeID: employee.id, // Employee whose attendance was modified
			actionType: 'UPDATE',
			action: 'Update Missing Punch',
			targetTable: 'attendance',
			targetID: id,
			details: auditDetails,
			isUserVisible: true
		});

		console.log('📝 Created audit log');

		// 5. Recalculate geofence labels
		const inGeo =
			checkInLat && checkInLng
				? await resolveGeofence(Number(checkInLat), Number(checkInLng))
				: null;
		const outGeo =
			checkOutLat && checkOutLng
				? await resolveGeofence(Number(checkOutLat), Number(checkOutLng))
				: null;

		console.log('📍 Geofence results:', { inGeo, outGeo });

		return json({
			success: true,
			updated: true,
			geofence: {
				checkIn: inGeo,
				checkOut: outGeo
			}
		});
	} catch (err) {
		console.error('❌ Error updating attendance:', err);
		return json({ error: 'Server error' }, { status: 500 });
	}
};

// Helper function to build audit details
function buildAuditDetails(originalRecord: any, updateData: any, reason: string): string {
	const details: string[] = [];

	// Check-in time changes
	if (updateData.checkInTime && originalRecord?.checkInTime !== updateData.checkInTime) {
		const originalTime = originalRecord?.checkInTime
			? new Date(originalRecord.checkInTime).toLocaleString()
			: 'null';
		const newTime = new Date(updateData.checkInTime).toLocaleString();
		details.push(`Check-in: ${originalTime} → ${newTime}`);
	}

	// Check-out time changes
	if (updateData.checkOutTime && originalRecord?.checkOutTime !== updateData.checkOutTime) {
		const originalTime = originalRecord?.checkOutTime
			? new Date(originalRecord.checkOutTime).toLocaleString()
			: 'null';
		const newTime = new Date(updateData.checkOutTime).toLocaleString();
		details.push(`Check-out: ${originalTime} → ${newTime}`);
	}

	// Add reason if provided
	if (reason) {
		details.push(`Reason: ${reason}`);
	}

	// Add location changes if any
	if (updateData.checkInLat || updateData.checkInLng) {
		details.push('Check-in location updated');
	}
	if (updateData.checkOutLat || updateData.checkOutLng) {
		details.push('Check-out location updated');
	}

	return details.join(' | ');
}
