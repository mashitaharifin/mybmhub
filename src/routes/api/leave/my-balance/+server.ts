import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveBalances, leaveTypes } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	const year = new Date().getFullYear();

	const balances = await db
		.select({
			leaveTypeID: leaveBalances.leaveTypeID,
			name: leaveTypes.typeName,
			requiresDocument: leaveTypes.requiresDoc,
			totalEntitlement: leaveBalances.totalEntitlement,
			daysTaken: leaveBalances.daysTaken,
			remainingBalance: leaveBalances.remainingBalance
		})
		.from(leaveBalances)
		.leftJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeID))
		.where(and(eq(leaveBalances.userID, user.id), eq(leaveBalances.year, year)));

	return json({ success: true, data: balances });
}
