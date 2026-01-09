import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, users, employees } from '$lib/server/db/schema';
import { eq, and, gte, lt, ilike } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const user = locals.user;
		if (!user || user.role !== 'Manager') {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401
			});
		}

		// Read query params
		const month = Number(url.searchParams.get('month'));
		const year = Number(url.searchParams.get('year'));
		const search = url.searchParams.get('search')?.trim();

		if (!month || !year) {
			return new Response(JSON.stringify({ success: false, error: 'Invalid filters' }), {
				status: 400
			});
		}

		// Build date range for selected month
		const startDate = new Date(year, month - 1, 1);
		const endDate = new Date(year, month, 1);

		// Query with filters applied
		const rows = await db
			.select({
				attendanceId: attendance.id,
				summaryDate: attendance.summaryDate,
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
					gte(attendance.summaryDate, startDate.toISOString().split('T')[0]),
					lt(attendance.summaryDate, endDate.toISOString().split('T')[0]),
					search ? ilike(users.name, `%${search}%`) : undefined
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
			entry.autoPunchCount++;
			entry.records.push({
				attendanceId: r.attendanceId,
				date: r.summaryDate,
				reason: r.reason
			});
		}

		// Apply ≥ 3 rule AFTER grouping
		const result = Array.from(grouped.values()).filter((e) => e.autoPunchCount >= 3);
		let emptyReason: 'period' | 'employee' | null = null;

		if (result.length === 0) {
			if (search) {
				emptyReason = 'employee';
			} else {
				emptyReason = 'period';
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				data: result,
				emptyReason
			}),
			{ status: 200 }
		);
	} catch (err) {
		console.error('Auto punch summary error:', err);
		return new Response(JSON.stringify({ success: false, error: 'Server error' }), {
			status: 500
		});
	}
};
