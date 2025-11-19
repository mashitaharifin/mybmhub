import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { auditLogs, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals }) {
	const currentUser = locals.user;
	if (!currentUser || currentUser.role !== 'Manager') throw error(403, 'Unauthorized');

	const empId = parseInt(params.id);
	if (isNaN(empId)) throw error(400, 'Invalid employee ID');

	// Validate employee exists
	const [emp] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
	if (!emp) throw error(404, 'Employee not found');

	// Fetch audit logs related to this employee
	const logs =
		(await db
			.select({
				id: auditLogs.id,
				actionType: auditLogs.actionType,
				action: auditLogs.action,
				details: auditLogs.details,
				createdAt: auditLogs.createdAt
			})
			.from(auditLogs)
			.where(eq(auditLogs.employeeID, empId))
			.orderBy(auditLogs.createdAt)) ?? [];

	return json({ records: logs });
}
