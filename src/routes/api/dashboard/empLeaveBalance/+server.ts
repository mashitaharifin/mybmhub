import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { leaveBalances, leaveTypes } from '$lib/server/db/schema';
import type { LeaveBalanceItem } from '$lib/types/empDashboard';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Fetch leave balances for the user
		const rows = await db
			.select({
				id: leaveBalances.id,
				leaveTypeID: leaveBalances.leaveTypeID,
				totalEntitlement: leaveBalances.totalEntitlement,
				daysTaken: leaveBalances.daysTaken,
				year: leaveBalances.year,
				updatedAt: leaveBalances.updatedAt,
				typeName: leaveTypes.typeName
			})
			.from(leaveBalances)
			.leftJoin(leaveTypes, eq(leaveTypes.id, leaveBalances.leaveTypeID))
			.where(eq(leaveBalances.userID, user.id))
			.orderBy(desc(leaveBalances.year));

		// Map rows to frontend LeaveBalanceItem
		const payload: LeaveBalanceItem[] = rows.map((r) => ({
			id: r.id,
			leaveTypeID: r.leaveTypeID ?? 0,
			leaveTypeName: r.typeName ?? 'Unknown',
			year: r.year,
			totalEntitlement: Number(r.totalEntitlement ?? 0),
			daysTaken: Number(r.daysTaken ?? 0),
			remaining: Number(r.totalEntitlement ?? 0) - Number(r.daysTaken ?? 0),
			remainingBalance: Number(r.totalEntitlement ?? 0) - Number(r.daysTaken ?? 0),
			updatedAt: r.updatedAt ? r.updatedAt.toISOString() : null
		}));

		return new Response(JSON.stringify({ success: true, data: payload }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('empLeaveBalance GET error:', err);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch leave balances' }),
			{ status: 500, headers: { 'Content-Type': 'application/json' } }
		);
	}
};
