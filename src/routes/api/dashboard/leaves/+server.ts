// src/routes/api/dashboard/leaves/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	leaveApplications,
	users,
	employees,
	departments,
	leaveTypes
} from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		// Fetch all leave requests with employee info
		const leaveData = await db
			.select({
				id: leaveApplications.id,
				employeeName: users.name,
				departmentName: departments.deptName,
				leaveType: leaveTypes.typeName,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate,
				status: leaveApplications.status,
				reason: leaveApplications.reason,
				managerRemark: leaveApplications.managerRemark,
				applicationDate: leaveApplications.applicationDate
			})
			.from(leaveApplications)
			.leftJoin(users, eq(users.id, leaveApplications.userID))
			.leftJoin(employees, eq(employees.userId, users.id))
			.leftJoin(departments, eq(departments.id, employees.departmentId))
			.leftJoin(leaveTypes, eq(leaveTypes.id, leaveApplications.leaveTypeID))
			.orderBy(desc(leaveApplications.applicationDate));

		return new Response(JSON.stringify({ data: leaveData }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching leave requests:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch leave requests' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
