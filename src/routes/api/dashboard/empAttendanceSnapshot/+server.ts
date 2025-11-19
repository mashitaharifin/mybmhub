// src/routes/api/dashboard/empAttendanceSnapshot/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Get last 7 attendance rows ordered descending by summaryDate
		const rows = await db
			.select({
				id: attendance.id,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours,
				totalHours: attendance.totalHours,
				breakHours: attendance.breakHours
			})
			.from(attendance)
			.where(eq(attendance.userID, user.id))
			.orderBy(desc(attendance.summaryDate))
			.limit(7);

		// convert to chronological order (oldest -> newest) for frontend charts
		const chronological = [...rows].reverse();

		// compute aggregates (week window returned)
		const totalDays = rows.length;
		const totalWorked = rows.reduce(
			(acc, r) => acc + (r.workedHours ? Number(r.workedHours) : 0),
			0
		);
		const avgWorkedPerDay = totalDays > 0 ? +(totalWorked / totalDays).toFixed(2) : 0;

		// Create simple day-level summary for chart (day label + workedHours)
		const chart = chronological.map((r) => ({
			date: r.summaryDate ? new Date(r.summaryDate).toISOString().split('T')[0] : null,
			workedHours: r.workedHours ? Number(r.workedHours) : 0
		}));

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					totalDaysInWindow: totalDays,
					totalWorkedHours: +totalWorked.toFixed(2),
					averageWorkedHours: avgWorkedPerDay,
					chart
				}
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('empAttendanceSnapshot GET error:', error);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch attendance snapshot' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
