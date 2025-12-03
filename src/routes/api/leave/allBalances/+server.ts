import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveBalances, users, leaveTypes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET = async ({ url }) => {
	try {
		const employeeID = url.searchParams.get('employeeID');

		// Base conditions: ALWAYS restrict to Employees only
		let whereConditions = [eq(users.role, 'Employee')];

		// If filtering by employee
		if (employeeID) {
			whereConditions.push(eq(users.id, Number(employeeID)));
		}

		const data = await db
			.select({
				employeeID: users.id,
				employeeName: users.name,
				leaveTypeID: leaveTypes.id,
				leaveTypeName: leaveTypes.typeName,
				totalEntitlement: leaveBalances.totalEntitlement,
				daysTaken: leaveBalances.daysTaken,
				remaining: leaveBalances.remainingBalance
			})
			.from(leaveBalances)
			.leftJoin(users, eq(leaveBalances.userID, users.id))
			.leftJoin(leaveTypes, eq(leaveBalances.leaveTypeID, leaveTypes.id))
			.where(and(...whereConditions));

		return json({ success: true, data });
	} catch (err) {
		console.error(err);
		return json({ success: false, error: 'Failed to fetch leave balances' }, { status: 500 });
	}
};
// THIS IS SEPARATE API THAT FETCH ALL EMPLOYEEs LEAVE BALANCE) //