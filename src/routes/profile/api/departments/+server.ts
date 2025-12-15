import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db'; // adjust path if needed
import { departments } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		const allDepartments = await db.select().from(departments);

		return new Response(JSON.stringify({ success: true, data: allDepartments }), { status: 200 });
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ success: false, error: 'Failed to fetch departments' }), {
			status: 500
		});
	}
};
