import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, users, employees } from '$lib/server/db/schema';
import { eq, and, gte, lt, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;

		if (!user || user.role !== 'Manager') {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401
			});
		}

		const now = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		// Fetch auto-punched records in last 30 days
		const rows = await db
			.select({
				attendanceId: attendance.id,
				summaryDate: attendance.summaryDate,
				autoPunchedOut: attendance.autoPunchedOut,
				reason: attendance.autoPunchedOutReason,
				userId: users.id,
				userName: users.name,
				employeeId: employees.id
			})
			.from(attendance)
			.innerJoin(users, eq(users.id, attendance.userID))
			.innerJoin(employees, eq(employees.userId, users.id))
			.where(
				and(
					eq(attendance.autoPunchedOut, true),
					gte(attendance.summaryDate, thirtyDaysAgo.toISOString().split('T')[0]),
					lt(attendance.summaryDate, now.toISOString().split('T')[0])
				)
			)
			.orderBy(attendance.summaryDate);

		// Group by employee
		const grouped = new Map<number, any>();

		for (const r of rows) {
			if (!grouped.has(r.userId)) {
				grouped.set(r.userId, {
					userId: r.userId,
					employeeId: r.employeeId,
					employeeName: r.userName,
					autoPunchCount: 0,
					records: []
				});
			}

			const entry = grouped.get(r.userId);
			entry.autoPunchCount += 1;
			entry.records.push({
				attendanceId: r.attendanceId,
				date: r.summaryDate,
				reason: r.reason
			});
		}

		// Filter ≥ 3 occurrences
		const result = Array.from(grouped.values()).filter((e) => e.autoPunchCount >= 3);

		return new Response(
			JSON.stringify({
				success: true,
				data: result
			}),
			{ status: 200 }
		);
	} catch (err) {
		console.error('Auto punch summary error:', err);
		return new Response(JSON.stringify({ success: false, error: 'Server error' }), { status: 500 });
	}
};
