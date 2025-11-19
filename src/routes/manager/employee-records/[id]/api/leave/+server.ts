import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { employees, leaveApplications } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ params, locals }) {
	// const currentUser = locals.user;
	// if (!currentUser || currentUser.role !== 'Manager') throw error(403, 'Unauthorized');

	const empId = parseInt(params.id);

	if (isNaN(empId)) {
		throw error(400, 'Invalid employee ID');
	}

	const [emp] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
	if (!emp) throw error(404, 'Employee not found');

	const leaves =
		(await db
			.select()
			.from(leaveApplications)
			.where(eq(leaveApplications.userID, emp.userId))
			.orderBy(leaveApplications.startDate)) ?? [];

	if (!leaves.length)
		return json({
			balances: {
				Annual: { used: 0, quota: 12 },
				Medical: { used: 0, quota: 14 },
				Emergency: { used: 0, quota: 5 }
			},
			records: []
		});

	// Compute rough balances (simplified demo)
	const balances = {
		Annual: { used: leaves.filter((l) => l.status === 'Approved').length, quota: 12 },
		Medical: { used: 0, quota: 14 },
		Emergency: { used: 0, quota: 5 }
	};

	return json({
		balances,
		records: leaves
	});
}
