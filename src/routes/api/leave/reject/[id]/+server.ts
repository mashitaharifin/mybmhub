import { json } from '@sveltejs/kit';
import { rejectLeave } from '$lib/server/leave/leaveService';
import { leaveApplications, employees, leaveTypes } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { notifyEmployeeLeaveRejected } from '$lib/server/notifications/leave';

/** Helper to fetch employee info by user ID */
async function getEmployeeInfo(userId: number) {
	const row = await db
		.select({ id: employees.id, name: employees.name, userId: employees.userId })
		.from(employees)
		.where(eq(employees.userId, userId))
		.then((rows) => rows[0]);

	if (!row) throw new Error('Employee not found');
	return row;
}

/** Helper to fetch leave type name by leaveTypeID */
async function getLeaveTypeName(leaveTypeID: number) {
	const row = await db
		.select({ typeName: leaveTypes.typeName })
		.from(leaveTypes)
		.where(eq(leaveTypes.id, leaveTypeID))
		.then((rows) => rows[0]);

	return row?.typeName ?? 'Leave';
}

export async function PUT({ params, locals, request }) {
	const user = locals.user;
	if (!user || user.role !== 'Manager') return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const reason = body.reason ?? 'Rejected';

	const applicationId = Number(params.id);
	if (!applicationId) return json({ error: 'Invalid leave ID' }, { status: 400 });

	try {
		// Reject leave
		await rejectLeave({ managerId: user.id, applicationId, reason });

		// Fetch leave record after rejection
		const leaveRecord = await db
			.select()
			.from(leaveApplications)
			.where(eq(leaveApplications.id, applicationId))
			.then((rows) => rows[0]);

		if (!leaveRecord) return json({ error: 'Leave record not found' }, { status: 404 });

		// Fetch employee info and leave type name
		const employee = await getEmployeeInfo(leaveRecord.userID!);
		const leaveType = await getLeaveTypeName(leaveRecord.leaveTypeID!);

		// Notify employee
		await notifyEmployeeLeaveRejected({
			employeeUserId: employee.userId,
			leaveType,
			startDate: leaveRecord.startDate,
			endDate: leaveRecord.endDate,
			leaveId: leaveRecord.id,
			remarks: reason
		});

		return json({ success: true, data: leaveRecord });
	} catch (err: any) {
		console.error('rejectLeave error', err);
		return json({ error: err.message }, { status: 400 });
	}
}
