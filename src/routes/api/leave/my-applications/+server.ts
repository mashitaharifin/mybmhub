import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveApplications, leaveTypes, users } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	// aliases
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
			halfDay: leaveApplications.halfDay,
			halfDaySession: leaveApplications.halfDaySession,
			duration: leaveApplications.duration,
			reason: leaveApplications.reason,
			docImg: leaveApplications.docImg,
			requiresDoc: leaveTypes.requiresDoc,

			status: leaveApplications.status,
			applicationDate: leaveApplications.applicationDate,

			// approval info
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
		.orderBy(desc(leaveApplications.applicationDate));

	return json({
		success: true,
		data: { applications: apps, total: apps.length }
	});
}
