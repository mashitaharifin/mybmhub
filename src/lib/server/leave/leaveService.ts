import { db } from '$lib/server/db';
import {
	leaveBalances,
	leaveApplications,
	employees,
	auditLogs,
	users,
	leaveTypes
} from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import { calculateLeaveDays } from '$lib/server/leave/calculateLeaveDays';
import { generateLeaveBalanceForEmployee } from './generateBalance';

interface ApplyLeaveParams {
	userId: number;
	leaveTypeID: number;
	startDate: Date;
	endDate: Date;
	reason: string;
	halfDay?: boolean;
	halfDaySession?: 'Morning' | 'Afternoon';
	docImg?: string;
	duration?: number;
}

export async function applyLeave(params: ApplyLeaveParams) {
	const {
		userId,
		leaveTypeID,
		startDate,
		endDate,
		reason,
		halfDay = false,
		halfDaySession,
		docImg
	} = params;

	// 1. Fetch employee record
	const [employee] = await db.select().from(employees).where(eq(employees.userId, userId));

	if (!employee) throw new Error('Employee not found');

	// 2. Fetch leave type info
	const leaveType = await db
		.select()
		.from(leaveTypes)
		.where(eq(leaveTypes.id, leaveTypeID))
		.limit(1)
		.then((r) => r[0]);

	if (!leaveType) throw new Error('Leave type not found');

	// 3. Get or generate leave balance (if not unlimited)
	let balance: any = null;

	if (!leaveType.isUnlimited) {
		[balance] = await db
			.select()
			.from(leaveBalances)
			.where(and(eq(leaveBalances.userID, userId), eq(leaveBalances.leaveTypeID, leaveTypeID)));

		if (!balance) {
			await generateLeaveBalanceForEmployee(employee.id);

			[balance] = await db
				.select()
				.from(leaveBalances)
				.where(and(eq(leaveBalances.userID, userId), eq(leaveBalances.leaveTypeID, leaveTypeID)));
		}
	}

	// 4. Annual Leave rule (ID = 1)
	if (leaveTypeID === 1) {
		const today = new Date();
		const diff = (startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

		if (diff < 5) {
			throw new Error('Annual Leave must be applied at least 5 days in advance');
		}
	}

	// 5. Calculate leave duration
	const totalDays = await calculateLeaveDays(startDate, endDate, halfDay);

	if (halfDay && !halfDaySession)
		throw new Error('Please provide Morning/Afternoon session for half-day leave');

	if (!totalDays || totalDays <= 0) throw new Error('Invalid leave duration');

	// 6. Document required?
	if (leaveType.requiresDoc && !docImg) {
		throw new Error('Supporting document is required for this leave type');
	}

	// 7. Balance validation (skip if unlimited)
	if (!leaveType.isUnlimited) {
		if (totalDays > Number(balance.remainingBalance ?? 0)) {
			throw new Error('Insufficient leave balance');
		}
	}

	// 8. Insert leave application (WITH duration!)
	const [application] = await db
		.insert(leaveApplications)
		.values({
			userID: userId,
			leaveTypeID,
			startDate: startDate.toISOString().split('T')[0],
			endDate: endDate.toISOString().split('T')[0],
			reason,
			halfDay,
			halfDaySession: halfDaySession ?? null,
			duration: totalDays.toString(),
			status: 'Pending',
			docImg,
			year: new Date().getFullYear(),
			applicationDate: new Date()
		})
		.returning();

	// 9. Audit log
	await db.insert(auditLogs).values({
		userID: userId,
		employeeID: employee.id,
		actionType: 'APPLY LEAVE',
		action: 'Employee applied for leave',
		targetTable: 'leave_applications',
		targetID: application.id,
		details: `Applied ${totalDays} day(s) from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
		isUserVisible: true
	});

	return application;
}

interface CancelLeaveParams {
	userId: number; // Who is performing the cancel (employee or manager)
	applicationId: number;
}

export async function cancelLeave(params: CancelLeaveParams) {
	const { userId, applicationId } = params;

	const [performingUser] = await db.select().from(users).where(eq(users.id, userId));
	if (!performingUser) throw new Error('User not found');

	// Fetch leave application
	const [application] = await db
		.select()
		.from(leaveApplications)
		.where(eq(leaveApplications.id, applicationId));

	if (!application) throw new Error('Leave application not found');

	const today = new Date();

	// Determine if cancel is allowed
	const isOwner = application.userID === userId;
	const isManager = performingUser.role === 'Manager';

	if (!isOwner && !isManager) {
		throw new Error('Not authorized to cancel this leave');
	}

	if (application.status === 'Pending') {
		// Anyone can cancel their own pending leave, manager can too
	} else if (application.status === 'Approved') {
		// Only allow cancelling future approved leaves
		const startDate = new Date(application.startDate);
		if (startDate <= today) throw new Error('Cannot cancel leave that has already started');

		// Employees can cancel their own approved leave, managers can cancel any future approved leave
		if (!isOwner && !isManager) throw new Error('Not authorized to cancel this approved leave');
	} else {
		throw new Error('Cannot cancel this leave');
	}

	// Update leave application
	await db
		.update(leaveApplications)
		.set({
			status: 'Cancelled',
			cancelledBy: userId,
			cancelledDate: new Date()
		})
		.where(eq(leaveApplications.id, applicationId));

	// Restore leave balance if applicable
	if (!application.userID) throw new Error('Invalid leave application: missing user ID');
	const [balance] = await db
		.select()
		.from(leaveBalances)
		.where(
			and(
				eq(leaveBalances.userID, application.userID),
				eq(leaveBalances.leaveTypeID, Number(application.leaveTypeID))
			)
		);

	if (balance) {
		const restoreDays = Number(application.duration ?? (application.halfDay ? 0.5 : 1));

		await db
			.update(leaveBalances)
			.set({
				remainingBalance: String((Number(balance.remainingBalance ?? 0) + restoreDays).toFixed(2))
			})
			.where(eq(leaveBalances.id, balance.id));
	}

	// Audit log - FIXED FIELD NAMES
	await db.insert(auditLogs).values({
		userID: userId, // CORRECT: matches schema field name
		employeeID: application.userID, // CORRECT: matches schema field name
		actionType: 'CANCEL LEAVE', // CORRECT: matches schema field name
		action: isManager ? 'Manager cancelled leave' : 'Employee cancelled leave',
		targetTable: 'leave_applications',
		targetID: application.id, // CORRECT: matches schema field name
		details: `Cancelled leave from ${application.startDate} to ${application.endDate} (${application.duration} day(s))`,
		isUserVisible: true
	});

	return { success: true };
}

interface ApproveLeaveParams {
	managerId: number;
	applicationId: number;
}

export async function approveLeave(params: ApproveLeaveParams) {
	const { managerId, applicationId } = params;

	// 1. Verify manager
	const [managerUser] = await db.select().from(users).where(eq(users.id, managerId));
	if (!managerUser || managerUser.role !== 'Manager')
		throw new Error('Only managers can approve leave');

	// 2. Fetch leave application
	const [application] = await db
		.select()
		.from(leaveApplications)
		.where(eq(leaveApplications.id, applicationId));
	if (!application) throw new Error('Leave application not found');
	if (application.status !== 'Pending')
		throw new Error('Only pending applications can be approved');
	if (!application.userID) throw new Error('Invalid leave application: missing user ID');

	// 3. Fetch employee
	const [employee] = await db
		.select()
		.from(employees)
		.where(eq(employees.userId, application.userID));
	if (!employee) throw new Error('Employee not found');

	// 4. Fetch leave type
	if (!application.leaveTypeID) throw new Error('Leave application has no leave type');
	
	const [leaveType] = await db
		.select()
		.from(leaveTypes)
		.where(eq(leaveTypes.id, application.leaveTypeID));
	if (!leaveType) throw new Error('Leave type not found');

	// 5. Handle leave balance (only if not unlimited)
	let balance;
	if (!leaveType.isUnlimited) {
		[balance] = await db
			.select()
			.from(leaveBalances)
			.where(
				and(
					eq(leaveBalances.userID, application.userID),
					eq(leaveBalances.leaveTypeID, Number(application.leaveTypeID))
				)
			);

		if (!balance) throw new Error('Leave balance not found');

		// Deduct leave (consider half-day)
		const deduction = application.halfDay ? 0.5 : Number(application.duration ?? 1);
		const newBalance = Number(balance.remainingBalance ?? 0) - deduction;
		if (newBalance < 0) throw new Error('Insufficient balance to approve');

		await db
			.update(leaveBalances)
			.set({ remainingBalance: String(newBalance) })
			.where(eq(leaveBalances.id, balance.id));
	}

	// 6. Update leave application
	await db
		.update(leaveApplications)
		.set({
			status: 'Approved',
			approvedBy: managerId,
			approvalDate: new Date()
		})
		.where(eq(leaveApplications.id, applicationId));

	// 7. Insert audit log
	await db.insert(auditLogs).values({
		userID: managerId,
		employeeID: employee?.id || managerId,
		actionType: 'APPROVE LEAVE',
		action: 'Leave approved',
		targetTable: 'leave_applications',
		targetID: application.id,
		details: `Approved leave from ${application.startDate} to ${application.endDate} (${application.duration} day(s))`,
		isUserVisible: true
	});

	return { success: true };
}

interface RejectLeaveParams {
	managerId: number;
	applicationId: number;
	reason: string;
}

export async function rejectLeave(params: RejectLeaveParams) {
	const { managerId, applicationId, reason } = params;

	// Verify manager
	const [managerUser] = await db.select().from(users).where(eq(users.id, managerId));

	if (!managerUser || managerUser.role !== 'Manager') {
		throw new Error('Only managers can reject leave');
	}

	// Fetch application
	const [application] = await db
		.select()
		.from(leaveApplications)
		.where(eq(leaveApplications.id, applicationId));

	if (!application) throw new Error('Leave application not found');
	if (application.status !== 'Pending')
		throw new Error('Only pending applications can be rejected');

	// Update status
	await db
		.update(leaveApplications)
		.set({
			status: 'Rejected',
			rejectedBy: managerId,
			rejectedDate: new Date(),
			managerRemark: reason
		})
		.where(eq(leaveApplications.id, applicationId));

	// Audit
	await db.insert(auditLogs).values({
		userID: managerId,
		employeeID: application.userID,
		actionType: 'REJECT LEAVE',
		action: 'Leave rejected',
		targetTable: 'leave_applications',
		targetID: application.id,
		details: `Rejected leave request: ${reason}`,
		isUserVisible: true
	});

	return { success: true };
}
