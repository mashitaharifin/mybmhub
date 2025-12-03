// src/routes/api/me/+server.ts
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const session = locals.session;
		if (!session) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const user = await db.query.users.findFirst({
			where: eq(users.id, session.userId),
			columns: {
				id: true,
				email: true,
				name: true
			}
		});

		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Optionally fetch employee info too
		const employee = await db.query.employees.findFirst({
			where: eq(employees.userId, session.userId),
			columns: { id: true, departmentId: true, jobTitle: true }
		});

		return new Response(
			JSON.stringify({
				success: true,
				data: {
					user,
					employee
				}
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
