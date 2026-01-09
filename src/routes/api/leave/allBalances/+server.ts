import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveBalances, users, leaveTypes, employees } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET = async ({ url }) => {
	try {
		const employeeID = url.searchParams.get('employeeID');

		// Base conditions
		const whereConditions: any[] = [eq(users.role, 'Employee')];

		if (employeeID) {
			whereConditions.push(eq(users.id, Number(employeeID)));
		}

		// Join employees table to access isDeleted
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
			.leftJoin(employees, eq(employees.userId, users.id)) // ✅ join employees table
			.leftJoin(leaveTypes, eq(leaveBalances.leaveTypeID, leaveTypes.id))
			.where(and(...whereConditions, eq(employees.isDeleted, false))); // ✅ filter not-deleted

		return json({ success: true, data });
	} catch (err) {
		console.error(err);
		return json({ success: false, error: 'Failed to fetch leave balances' }, { status: 500 });
	}
};
