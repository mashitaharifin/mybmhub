import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		const [profile] = await db
			.select({
				id: users.id,
				name: users.name,
				role: users.role,
				jobTitle: employees.jobTitle,
				avatarUrl: employees.avatarUrl
			})
			.from(users)
			.leftJoin(employees, eq(employees.userId, users.id))
			.where(eq(users.id, user.id));

		if (!profile) {
			return new Response(JSON.stringify({ success: false, error: 'Profile not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ success: true, data: profile }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Profile GET error:', err);
		return new Response(JSON.stringify({ success: false, error: 'Failed to fetch profile' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
