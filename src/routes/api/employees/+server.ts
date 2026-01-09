import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, employees } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const GET = async () => {
	try {
		const employeesList = await db
			.select({
				id: users.id,
				name: users.name
			})
			.from(users)
			.leftJoin(employees, eq(employees.userId, users.id))
			.where(and(eq(users.role, 'Employee'), eq(employees.isDeleted, false)))
			.orderBy(users.name);

		return json({ success: true, data: employeesList });
	} catch (err) {
		console.error('Error fetching employees:', err);
		return json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
	}
};
