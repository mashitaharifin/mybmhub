import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveApplications, leaveTypes } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET({ url }) {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (!start || !end) {
		return json({ error: 'start and end query parameters are required' }, { status: 400 });
	}

	// Convert to YYYY-MM-DD strings
	const startDate = new Date(start);
	const endDate = new Date(end);
	const startDateStr = startDate.toISOString().split('T')[0];
	const endDateStr = endDate.toISOString().split('T')[0];

	try {
		// 1. Status Distribution
		const statusRows = await db
			.select({
				status: leaveApplications.status,
				count: sql<number>`COUNT(*)`
			})
			.from(leaveApplications)
			.where(
				sql`${leaveApplications.startDate} >= ${startDateStr} AND ${leaveApplications.startDate} <= ${endDateStr}`
			)
			.groupBy(leaveApplications.status);

		const statusDistribution: Record<string, number> = {};
		statusRows.forEach((r) => {
			if (r.status) {
				statusDistribution[r.status] = Number(r.count);
			}
		});

		// Ensure all statuses are present
		const allStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
		allStatuses.forEach((status) => {
			if (!(status in statusDistribution)) {
				statusDistribution[status] = 0;
			}
		});

		// 2. Leave Type Breakdown
		const allLeaveTypes = await db.select().from(leaveTypes);

		const typeCounts = await db
			.select({
				leaveTypeID: leaveApplications.leaveTypeID,
				count: sql<number>`COUNT(*)`
			})
			.from(leaveApplications)
			.where(
				sql`${leaveApplications.startDate} >= ${startDateStr} AND ${leaveApplications.startDate} <= ${endDateStr}`
			)
			.groupBy(leaveApplications.leaveTypeID);

		const typeBreakdown = allLeaveTypes
			.map((leaveType) => {
				const typeCount = typeCounts.find((tc) => tc.leaveTypeID === leaveType.id);
				return {
					typeName: leaveType.typeName || 'Unknown',
					count: typeCount ? Number(typeCount.count) : 0
				};
			})
			.sort((a, b) => a.typeName.localeCompare(b.typeName));

		// 3. Monthly Trend - Simplified: just return actual data
		const sixMonthsAgo = new Date(endDate);
		sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
		const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];

		const trendRows = await db
			.select({
				month: sql<string>`TO_CHAR(${leaveApplications.startDate}, 'YYYY-MM')`,
				count: sql<number>`COUNT(*)`
			})
			.from(leaveApplications)
			.where(
				sql`${leaveApplications.startDate} >= ${sixMonthsAgoStr} AND ${leaveApplications.startDate} <= ${endDateStr}`
			)
			.groupBy(sql`TO_CHAR(${leaveApplications.startDate}, 'YYYY-MM')`)
			.orderBy(sql`TO_CHAR(${leaveApplications.startDate}, 'YYYY-MM')`);

		const monthlyTrend = trendRows.map((row) => ({
			month: row.month,
			count: Number(row.count) || 0
		}));

		// Calculate summary
		const totalApplications = statusRows.reduce((sum, r) => sum + Number(r.count), 0);
		const approved = statusDistribution['Approved'] || 0;
		const pending = statusDistribution['Pending'] || 0;
		const rejected = statusDistribution['Rejected'] || 0;
		const cancelled = statusDistribution['Cancelled'] || 0;

		const approvalRate =
			totalApplications > 0 ? Math.round((approved / totalApplications) * 100) : 0;

		return json({
			statusDistribution,
			typeBreakdown,
			monthlyTrend,
			summary: {
				totalApplications,
				approvalRate,
				pending,
				approved,
				rejected,
				cancelled
			}
		});
	} catch (error) {
		console.error('Error in leave report API:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
}
