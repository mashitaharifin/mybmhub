import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { auditLogs, users } from '$lib/server/db/schema';
import { eq, desc, or, and, like, gte, lte, sql} from 'drizzle-orm';

export const GET = async ({ locals, url }) => {
	try {
		const currentUser = locals.user;
		if (!currentUser) throw error(401, '/auth/login');

		const showAll = url.searchParams.get('showAll') === 'true'; 
		const search = url.searchParams.get('search')?.trim()?.toLowerCase();
		const dateFrom = url.searchParams.get('dateFrom');
		const dateTo = url.searchParams.get('dateTo');
		const limit = Number(url.searchParams.get('limit') || 20);
		const offset = Number(url.searchParams.get('offset') || 0);
		const employeeID = url.searchParams.get('employeeID');

		// ---------------------------------------
		// 🔹 Build where clause (audit logs only)
		// ---------------------------------------
		let whereClause: any;

		if (showAll) {
			whereClause = eq(auditLogs.isUserVisible, true); // Manager view

		if (employeeID) {
			whereClause = and(whereClause, eq(auditLogs.userID, Number(employeeID)));
		}
		
		} else {
			// Employee view: Their own actions & actions targeting them
			whereClause = and(
				eq(auditLogs.isUserVisible, true),
				or(eq(auditLogs.userID, currentUser.id), eq(auditLogs.employeeID, currentUser.id))
			);
		}

		// Search filter 9case-insensitive)
		if (search) {
			whereClause = and(
				whereClause,
				or(
					like(sql`LOWER(${auditLogs.action})`, `%${search}%`),
					like(sql`LOWER(${auditLogs.targetTable})`, `%${search}%`)
				)
			);
		}

		// Date filters
		if (dateFrom) {
			whereClause = and(whereClause, gte(auditLogs.createdAt, new Date(dateFrom)));
		}

		if (dateTo) {
			const endOfDay = new Date(dateTo);
			endOfDay.setHours(23, 59, 59, 999);
			whereClause = and(whereClause, lte(auditLogs.createdAt, endOfDay));
		}

		const totalResult = await db
			.select({ count: sql<number>`count(*)` })
			.from(auditLogs)
			.where(whereClause);

		const totalRecords = totalResult[0]?.count ?? 0;

		// ---------------------------------------
		// 🔹 Fetch audit logs only
		// ---------------------------------------
		const logs = await db
			.select({
				id: auditLogs.id,
				userID: auditLogs.userID,
				userName: users.name,
				actionType: auditLogs.actionType,
				action: auditLogs.action,
				targetTable: auditLogs.targetTable,
				targetID: auditLogs.targetID,
				details: auditLogs.details,
				createdAt: auditLogs.createdAt
			})
			.from(auditLogs)
			.leftJoin(users, eq(users.id, auditLogs.userID))
			.where(whereClause)
			.orderBy(desc(auditLogs.createdAt))
			.limit(limit)
			.offset(offset);

		// ---------------------------------------
		// 🔹 Convert logs to final format
		// ---------------------------------------
		const formatted = logs.map((log) => ({
			id: log.id,
			actionType: log.actionType,
			action: log.action ?? '',
			targetTable: log.targetTable ?? '',
			details: log.details ?? '',
			createdAt: new Date(log.createdAt ?? Date.now()).toISOString(),
			userName: log.userName ?? ''
		}));

		return json({
			success: true,
			data: {
				logs: formatted,
				total: totalRecords,
				limit,
				offset
			}
		});
	} catch (err) {
		console.error('Error fetching recent activity:', err);
		return json({ success: false, error: 'Failed to fetch recent activity' }, { status: 500 });
	}
};
