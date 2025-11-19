import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, employees } from '$lib/server/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import dayjs from 'dayjs';

export async function GET({ params, locals }) {
	// const currentUser = locals.user;
	// if (!currentUser || currentUser.role !== 'Manager') throw error(403, 'Unauthorized');

	const empId = parseInt(params.id);
	if (isNaN(empId)) throw error(400, 'Invalid employee ID');

	// Find employee to get userId
	const [emp] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
	if (!emp) throw error(404, 'Employee not found');

	// Fetch attendance summary (past 30 days)
	const startDate = dayjs().subtract(30, 'day').format('YYYY-MM-DD');
	const endDate = dayjs().format('YYYY-MM-DD');

	console.log('Querying attendance for:', {
		empId,
		userId: emp.userId,
		startDate,
		endDate,
		types: {
			startDate: typeof startDate,
			endDate: typeof endDate
		}
	});

	const records =
		(await db
			.select()
			.from(attendance)
			.where(
				and(
					eq(attendance.userID, emp.userId),
					gte(attendance.summaryDate, startDate),
					lte(attendance.summaryDate, endDate)
				)
			)
			.orderBy(attendance.summaryDate)) ?? [];

	// Safeguard: no records
	if (!records.length)
		return json({
			summary: {
				totalDays: 0,
				present: 0,
				absent: 0,
				avgHours: 0
			},
			records: []
		});

	// Compute simple summary
	const totalDays = records.length;
	const present = totalDays;
	const absent = 0;
	const avgHours =
		totalDays > 0 ? records.reduce((sum, r) => sum + Number(r.workedHours || 0), 0) / totalDays : 0;

	return json({
		summary: {
			totalDays,
			present,
			absent,
			avgHours
		},
		records
	});
}
