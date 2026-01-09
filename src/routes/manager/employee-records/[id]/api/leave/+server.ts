import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { employees, leaveApplications, leaveTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals }) {
	// const currentUser = locals.user;
	// if (!currentUser || currentUser.role !== 'Manager') throw error(403, 'Unauthorized');

	const empId = parseInt(params.id);

	if (isNaN(empId)) {
		throw error(400, 'Invalid employee ID');
	}

	const [emp] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
	if (!emp) throw error(404, 'Employee not found');

	const leaves =
		(await db
			.select({
				id: leaveApplications.id,
				leaveType: leaveTypes.typeName,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate,
				days: leaveApplications.duration, 
				status: leaveApplications.status,
				managerRemark: leaveApplications.managerRemark
			})
			.from(leaveApplications)
			.leftJoin(leaveTypes, eq(leaveApplications.leaveTypeID, leaveTypes.id))
			.where(eq(leaveApplications.userID, emp.userId))
			.orderBy(leaveApplications.startDate));

	return json({
		records: leaves
	});
}
