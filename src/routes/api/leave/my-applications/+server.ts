// api/leave/my-applications/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveApplications, leaveTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

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
			status: leaveApplications.status,
			applicationDate: leaveApplications.applicationDate
		})
		.from(leaveApplications)
		.leftJoin(leaveTypes, eq(leaveTypes.id, leaveApplications.leaveTypeID))
		.where(eq(leaveApplications.userID, user.id))
		.orderBy(leaveApplications.applicationDate);

	return json({ success: true, data: { applications: apps, total: apps.length } });
}
