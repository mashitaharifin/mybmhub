import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, users, employees, departments } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		const attendanceData = await db
			.select({
				id: attendance.id,
				employeeName: users.name,
				departmentName: departments.deptName,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				totalHours: attendance.totalHours,
				workedHours: attendance.workedHours
			})
			.from(attendance)
			.leftJoin(users, eq(users.id, attendance.userID))
			.leftJoin(employees, eq(employees.userId, users.id))
			.leftJoin(departments, eq(departments.id, employees.departmentId))
			.orderBy(desc(attendance.summaryDate));

		return new Response(JSON.stringify({ data: attendanceData }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching attendance:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch attendance' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
