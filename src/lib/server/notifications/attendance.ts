// src/lib/server/notifications/attendance.ts
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
 * Helper: get employee name by employee user ID
 */
async function getEmployeeNameByUserId(employeeUserId: number): Promise<string> {
	const rows = await db
		.select({ name: employees.name })
		.from(employees)
		.where(eq(employees.userId, employeeUserId));

	return rows[0]?.name ?? 'Employee';
}

/**
 * notifyPunchIn - notify the employee only
 */
export async function notifyPunchIn(opts: { employeeUserId: number; punchInTime: string }) {
	const title = 'Punch In Successful';
	const message = `You have successfully punched in at ${opts.punchInTime}.`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'Attendance',
		relatedLeaveID: null
	});
}

/**
 * notifyPunchOut - notify the employee only
 */
export async function notifyPunchOut(opts: {
	employeeUserId: number;
	punchOutTime: string;
	totalHours: string;
}) {
	const title = 'Punch Out Successful';
	const message = `You have successfully punched out at ${opts.punchOutTime}. Total hours worked: ${opts.totalHours}.`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'Attendance',
		relatedLeaveID: null
	});
}

/**
 * notifyAutoPunchout - notify employee AND all managers
 */
export async function notifyAutoPunchout(opts: {
	employeeUserId: number;
	employeeName?: string;
	punchDate: string;
	leaveId?: number | null;
}) {
	const employeeName = opts.employeeName ?? (await getEmployeeNameByUserId(opts.employeeUserId));

	// ---- Notify employee ----
	await createNotification({
		recipientID: opts.employeeUserId,
		title: 'Auto Punchout',
		message: `You were auto-punched out for ${opts.punchDate}. Please state your reason before punching in today.`,
		type: 'Attendance',
		relatedLeaveID: null
	});

	// ---- Notify all managers ----
	const managerIds = await getManagerUserIds();

	const managerTitle = `Employee auto-punched: ${employeeName}`;
	const managerMessage = `${employeeName} was auto-punched out for ${opts.punchDate}.`;

	for (const managerId of managerIds) {
		await createNotification({
			recipientID: managerId,
			title: managerTitle,
			message: managerMessage,
			type: 'Attendance',
			relatedLeaveID: null
		});
	}
}

/**
 * notifyForgotToPunchOut - employee reminder only
 */
export async function notifyForgotToPunchOut(opts: { employeeUserId: number; date?: string }) {
	const title = 'Punch Out Reminder';
	const message = `You forgot to punch out${
		opts.date ? ` on ${opts.date}` : ''
	}! Make sure to punch out before the end of today.`;

	return createNotification({
		recipientID: opts.employeeUserId,
		title,
		message,
		type: 'Attendance',
		relatedLeaveID: null
	});
}
