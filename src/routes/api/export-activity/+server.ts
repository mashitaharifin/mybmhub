import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { auditLogs, users, systemSettings } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

export const POST = async ({ request }) => {
	try {
		const { format = 'excel' } = await request.json();

		// fetch logs (similar to +server.ts for recent activity)
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
			.orderBy(desc(auditLogs.createdAt));

		return json({ success: true, data: logs });
	} catch (err) {
		console.error('Export error', err);
		return json({ success: false, error: 'Failed to fetch logs' }, { status: 500 });
	}
};
