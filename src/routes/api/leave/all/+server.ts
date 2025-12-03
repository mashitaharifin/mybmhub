import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveApplications, employees, leaveTypes, users } from '$lib/server/db/schema';
import { eq, ilike, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

export async function GET({ url, locals }) {
	const user = locals.user;
	if (!user || user.role !== 'Manager') {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const limit = Number(url.searchParams.get('limit') ?? 10);
	const offset = Number(url.searchParams.get('offset') ?? 0);

	const statusParam = url.searchParams.get('status');
	const leaveTypeParam = url.searchParams.get('leaveType');
	const employeeName = url.searchParams.get('employee');

	const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'] as const;
	const status = validStatuses.includes(statusParam as any)
		? (statusParam as (typeof validStatuses)[number])
		: undefined;

	// aliases for joins
	const approver = alias(users, 'approver');
	const rejector = alias(users, 'rejector');
	const canceller = alias(users, 'canceller');

	let whereClause: any = undefined;

	if (status || leaveTypeParam || employeeName) {
		const conditions: any[] = [];

		if (status) conditions.push(eq(leaveApplications.status, status));
		if (leaveTypeParam) conditions.push(eq(leaveApplications.leaveTypeID, Number(leaveTypeParam)));
		if (employeeName) conditions.push(ilike(employees.name, `%${employeeName}%`));

		whereClause = and(...conditions);
	}

	try {
		// COUNT
		const countBase = db
			.select()
			.from(leaveApplications)
			.leftJoin(employees, eq(employees.userId, leaveApplications.userID));

		const total = whereClause
			? (await countBase.where(whereClause)).length
			: (await countBase).length;

		// MAIN QUERY
		const appsBase = db
			.select({
				id: leaveApplications.id,
				userID: leaveApplications.userID,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate,
				halfDay: leaveApplications.halfDay,
				halfDaySession: leaveApplications.halfDaySession,
				duration: leaveApplications.duration,
				reason: leaveApplications.reason,
                requiresDoc: leaveTypes.requiresDoc,
				docImg: leaveApplications.docImg,
				status: leaveApplications.status,

				employeeName: employees.name,
				leaveTypeName: leaveTypes.typeName,

				approvedByName: approver.name,
				rejectedByName: rejector.name,
				cancelledByName: canceller.name,

				approvalDate: leaveApplications.approvalDate,
				rejectedDate: leaveApplications.rejectedDate,
				cancelledDate: leaveApplications.cancelledDate,
				managerRemark: leaveApplications.managerRemark
			})
			.from(leaveApplications)
			.leftJoin(employees, eq(employees.userId, leaveApplications.userID))
			.leftJoin(leaveTypes, eq(leaveTypes.id, leaveApplications.leaveTypeID))
			.leftJoin(approver, eq(approver.id, leaveApplications.approvedBy))
			.leftJoin(rejector, eq(rejector.id, leaveApplications.rejectedBy))
			.leftJoin(canceller, eq(canceller.id, leaveApplications.cancelledBy));

		const appsWithWhere = whereClause ? appsBase.where(whereClause) : appsBase;

		const applications = await appsWithWhere
			.limit(limit)
			.offset(offset)
			.orderBy(leaveApplications.startDate);

		return json({ success: true, data: { applications, total } });
	} catch (err: any) {
		console.error('API /leave/all error:', err);
		return json({ error: err.message }, { status: 500 });
	}
}
