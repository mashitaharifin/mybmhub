// src/routes/api/leave/cancel/+server.ts
import { json } from '@sveltejs/kit';
import { cancelLeave } from '$lib/server/leave/leaveService';
import { leaveApplications, employees, leaveTypes } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import {
	notifyManagerLeaveCancelled,
	notifyEmployeeLeaveCancelledByManager
} from '$lib/server/notifications/leave';

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

export async function PUT({ params, locals }) {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });

	const applicationId = Number(params.id);
	if (!applicationId) return json({ error: 'Invalid leave ID' }, { status: 400 });

	try {
		// 1. Cancel the leave in the database
		await cancelLeave({
			userId: user.id,
			applicationId
		});

		// 2. Fetch the leave record after cancellation
		const leaveRecord = await db
			.select()
			.from(leaveApplications)
			.where(eq(leaveApplications.id, applicationId))
			.then((rows) => rows[0]);

		if (!leaveRecord) return json({ error: 'Leave record not found' }, { status: 404 });
		if (!leaveRecord.leaveTypeID) throw new Error('Invalid leave type');

		// 3. Fetch employee info and leave type name
		const employee = await getEmployeeInfo(leaveRecord.userID!);
		const leaveType = await getLeaveTypeName(leaveRecord.leaveTypeID);

		// 4. Notify accordingly
		// Employee cancelled
		if (leaveRecord.status === 'Cancelled' && leaveRecord.cancelledBy === user.id) {
			await notifyManagerLeaveCancelled({
				employeeId: employee.id,
				employeeName: employee.name,
				leaveType,
				startDate: leaveRecord.startDate,
				endDate: leaveRecord.endDate,
				leaveId: leaveRecord.id
			});
		}

		// Manager cancelled
		if (
			leaveRecord.status === 'Cancelled' &&
			leaveRecord.cancelledBy &&
			leaveRecord.cancelledBy !== user.id
		) {
			await notifyEmployeeLeaveCancelledByManager({
				employeeUserId: employee.userId,
				leaveType,
				startDate: leaveRecord.startDate,
				endDate: leaveRecord.endDate,
				leaveId: leaveRecord.id,
				reason: leaveRecord.managerRemark ?? ''
			});
		}

		return json({ success: true, data: leaveRecord });
	} catch (err: any) {
		console.error('Error cancelling leave:', err);
		return json({ error: err.message ?? 'Failed to cancel leave' }, { status: 400 });
	}
}
