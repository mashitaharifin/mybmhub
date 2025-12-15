import { db } from '$lib/server/db';
import { leaveApplications, leaveTypes, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export const load = async ({ locals }) => {
	const user = locals.user;
	if (!user) return { leaveApplications: [] };

	// aliases for approver, rejector, canceller
	const approver = alias(users, 'approver');
	const rejector = alias(users, 'rejector');
	const canceller = alias(users, 'canceller');

	const apps = await db
		.select({
			id: leaveApplications.id,
			leaveTypeID: leaveApplications.leaveTypeID,
			leaveTypeName: leaveTypes.typeName,

			startDate: leaveApplications.startDate,
			endDate: leaveApplications.endDate,
			duration: leaveApplications.duration,
			applicationDate: leaveApplications.applicationDate,
			status: leaveApplications.status,
			reason: leaveApplications.reason,
			halfDay: leaveApplications.halfDay,
			halfDaySession: leaveApplications.halfDaySession,
			docImg: leaveApplications.docImg,
			requiresDoc: leaveTypes.requiresDoc,

			approvedByName: approver.name,
			rejectedByName: rejector.name,
			cancelledByName: canceller.name,
			approvalDate: leaveApplications.approvalDate,
			rejectedDate: leaveApplications.rejectedDate,
			cancelledDate: leaveApplications.cancelledDate,
			managerRemark: leaveApplications.managerRemark
		})
		.from(leaveApplications)
		.leftJoin(leaveTypes, eq(leaveTypes.id, leaveApplications.leaveTypeID))
		.leftJoin(approver, eq(approver.id, leaveApplications.approvedBy))
		.leftJoin(rejector, eq(rejector.id, leaveApplications.rejectedBy))
		.leftJoin(canceller, eq(canceller.id, leaveApplications.cancelledBy))
		.where(eq(leaveApplications.userID, user.id))
		.orderBy(leaveApplications.applicationDate);

	return { leaveApplications: apps };
};
