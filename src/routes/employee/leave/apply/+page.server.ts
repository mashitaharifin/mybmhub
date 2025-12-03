import { db } from '$lib/server/db';
import { leaveApplications, leaveTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { json } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	const user = locals.user;
	if (!user) return { leaveApplications: [] };

	const apps = await db
		.select({
			id: leaveApplications.id,
			leaveTypeID: leaveApplications.leaveTypeID,
			leaveTypeName: leaveTypes.typeName,
			startDate: leaveApplications.startDate,
			endDate: leaveApplications.endDate,
			duration: leaveApplications.duration,
			status: leaveApplications.status,
			applicationDate: leaveApplications.applicationDate
		})
		.from(leaveApplications)
		.leftJoin(leaveTypes, eq(leaveTypes.id, leaveApplications.leaveTypeID))
		.where(eq(leaveApplications.userID, user.id))
		.orderBy(leaveApplications.applicationDate);

	return { leaveApplications: apps };
};
