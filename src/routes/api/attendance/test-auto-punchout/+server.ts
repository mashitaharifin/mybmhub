// api/attendance/test-auto-punchout/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, users, employees, auditLogs } from '$lib/server/db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		// Get yesterday's date
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayISO = yesterday.toISOString().split('T')[0];

		// Manually set shift end time (e.g., 18:00)
		const shiftEndTime = new Date(yesterdayISO);
		shiftEndTime.setHours(18, 0, 0, 0); // 6:00 PM

		// Find users who punched in yesterday but didn't punch out
		const pendingAttendances = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.summaryDate, yesterdayISO), isNull(attendance.checkOutTime)));

		const results = [];

		for (const record of pendingAttendances) {
			if (!record.checkInTime) continue;

			// Calculate worked hours
			const diffMs = shiftEndTime.getTime() - record.checkInTime.getTime();
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

			// Get user info for audit log
			const userName = await db
				.select({ name: users.name })
				.from(users)
				.where(eq(users.id, record.userID))
				.then((rows) => rows[0]?.name ?? 'Unknown User');

			results.push({
				userId: record.userID,
				userName,
				checkInTime: record.checkInTime,
				autoPunchedOut: shiftEndTime
			});
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: `Auto-punched ${results.length} users for yesterday (${yesterdayISO})`,
				results,
				timestamp: new Date().toISOString()
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Test auto-punch error:', error);

		// Handle the error properly with type safety
		let errorMessage = 'Failed to test auto-punch';
		let errorDetails = 'Unknown error';

		if (error instanceof Error) {
			errorMessage = error.message;
			errorDetails = error.stack || error.message;
		} else if (typeof error === 'string') {
			errorMessage = error;
			errorDetails = error;
		} else if (error && typeof error === 'object' && 'message' in error) {
			errorMessage = String(error.message);
			errorDetails = JSON.stringify(error);
		}

		return new Response(
			JSON.stringify({
				success: false,
				error: errorMessage,
				details: errorDetails
			}),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
