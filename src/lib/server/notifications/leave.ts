// src/lib/server/notifications/leave.ts
import { createNotification } from './createNotification';
import { db } from '$lib/server/db';
import { users, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Helper: get all manager user IDs
 * Assumes managers are identified by role = 'Manager'
 */
async function getManagerUserIds(): Promise<number[]> {
	const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'Manager'));

	return rows.map((r) => r.id);
}

/**
 * Helper: fetch employee name by employee ID
 */
async function getEmployeeName(employeeId: number): Promise<string> {
	const rows = await db
		.select({ name: employees.name })
		.from(employees)
		.where(eq(employees.id, employeeId));

	return rows[0]?.name ?? 'Employee';
}

/**
 * Notify manager(s) when leave is submitted
 */
export async function notifyManagerLeaveSubmitted(opts: {
	employeeId: number;
	employeeName?: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	durationDays: number;
	leaveId?: number;
}) {
	const employeeName = opts.employeeName ?? (await getEmployeeName(opts.employeeId));

	const title = `Leave Submitted: ${employeeName}`;
	const message = `${employeeName} applied for ${opts.leaveType} for ${opts.durationDays} day(s) from ${opts.startDate} to ${opts.endDate}.`;

	const managerIds = await getManagerUserIds();

	for (const managerId of managerIds) {
		await createNotification({
			recipientID: managerId,
			title,
			message,
			type: 'LeaveStatus',
			relatedLeaveID: opts.leaveId ?? null
		});
	}
}

/**
 * Notify manager(s) when leave is cancelled by employee
 */
export async function notifyManagerLeaveCancelled(opts: {
	employeeId: number;
	employeeName?: string;
	leaveType: string;
	startDate: string;
	endDate: string;
	leaveId?: number;
}) {
	const employeeName = opts.employeeName ?? (await getEmployeeName(opts.employeeId));

	const title = `Leave Cancelled: ${employeeName}`;
	const message = `${employeeName} cancelled their ${opts.leaveType} from ${opts.startDate} to ${opts.endDate}.`;

	const managerIds = await getManagerUserIds();

	for (const managerId of managerIds) {
		await createNotification({
			recipientID: managerId,
			title,
			message,
			type: 'LeaveStatus',
			relatedLeaveID: opts.leaveId ?? null
		});
	}
}

/**
 * Notify employee when leave is approved
 */
export async function notifyEmployeeLeaveApproved(opts: {
	employeeUserId: number;
	leaveType: string;
	startDate: string;
	endDate: string;
	durationDays: number;
	leaveId?: number;
	remarks?: string | null;
}) {
	const title = `Leave Approved: ${opts.leaveType}`;
	const message = `Your ${opts.leaveType} (${opts.durationDays} day(s)) from ${opts.startDate} to ${opts.endDate} has been approved.${
		opts.remarks ? ` Remarks: ${opts.remarks}` : ''
	}`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'LeaveStatus',
		relatedLeaveID: opts.leaveId ?? null
	});
}

/**
 * Notify employee when leave is rejected
 */
export async function notifyEmployeeLeaveRejected(opts: {
	employeeUserId: number;
	leaveType: string;
	startDate: string;
	endDate: string;
	leaveId?: number;
	remarks?: string | null;
}) {
	const title = `Leave Rejected: ${opts.leaveType}`;
	const message = `Your ${opts.leaveType} request from ${opts.startDate} to ${opts.endDate} was rejected.${
		opts.remarks ? ` Remarks: ${opts.remarks}` : ''
	}`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'LeaveStatus',
		relatedLeaveID: opts.leaveId ?? null
	});
}

/**
 * Notify employee when manager cancels approved leave
 */
export async function notifyEmployeeLeaveCancelledByManager(opts: {
	employeeUserId: number;
	leaveType: string;
	startDate: string;
	endDate: string;
	leaveId?: number;
	reason?: string | null;
}) {
	const title = `Leave Cancelled by Manager: ${opts.leaveType}`;
	const message = `Approved leave from ${opts.startDate} to ${opts.endDate} has been cancelled by manager.${
		opts.reason ? ` Reason: ${opts.reason}` : ''
	}`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'LeaveStatus',
		relatedLeaveID: opts.leaveId ?? null
	});
}
