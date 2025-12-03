import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, users, employees, punch, systemSettings } from '$lib/server/db/schema';
import { eq, and, or, ilike, gt, lt, asc, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';

export const POST = async ({ request }) => {
	try {
		const { month, year, employeeQuery } = await request.json();

		// Build the same filters as in the attendance list
		const filters: any[] = [];

		if (month && year) {
			const startDate = new Date(Number(year), Number(month) - 1, 1);
			const endDate = new Date(startDate);
			endDate.setMonth(endDate.getMonth() + 1);

			filters.push(
				and(
					gt(attendance.summaryDate, startDate.toISOString()),
					lt(attendance.summaryDate, endDate.toISOString())
				)
			);
		}

		if (employeeQuery && employeeQuery.trim()) {
			const q = `%${employeeQuery.trim()}%`;
			filters.push(or(ilike(users.name, q), ilike(users.username, q)));
		}

		// Fetch attendance records for export
		const records = await db
			.select({
				id: attendance.id,
				employeeName: users.name,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours,
				//status: attendance.status
			})
			.from(attendance)
			.leftJoin(users, eq(users.id, attendance.userID))
			.leftJoin(employees, eq(employees.userId, users.id))
			.where(filters.length ? and(...filters) : undefined)
			.orderBy(desc(attendance.summaryDate));

		return json({ success: true, data: records });
	} catch (err) {
		console.error('Export error', err);
		return json({ success: false, error: 'Failed to fetch attendance data' }, { status: 500 });
	}
};
