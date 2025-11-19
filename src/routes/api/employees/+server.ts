import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET = async () => {
	try {
		const employees = await db
			.select({
				id: users.id,
				name: users.name
			})
			.from(users)
			.where(eq(users.role, 'Employee'))
			.orderBy(users.name);

		return json({ success: true, data: employees });
	} catch (err) {
		console.error('Error fetching employees:', err);
		return json({ success: false, error: 'Failed to fetch employees' }, { status: 500 });
	}
};

// THIS IS SEPARATE API THAT FETCH ALL EMPLOYEES (USED IN RECENT-ACTIVITY MODULE) //