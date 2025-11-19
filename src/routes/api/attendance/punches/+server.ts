import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { punch } from '$lib/server/db/schema';
import { and, eq, gte, lte } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	try {
		const dateStr = url.searchParams.get('date');
		if (!dateStr)
			return new Response(JSON.stringify({ error: 'Date query is required' }), { status: 400 });

		const startOfDay = new Date(dateStr + 'T00:00:00');
		const endOfDay = new Date(dateStr + 'T23:59:59');

		// Assuming you have employee info in locals.session.user.id
		const employeeId = locals.session?.userId;
		if (!employeeId)
			return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

		const records = await db
			.select()
			.from(punch)
			.where(
				and(
					eq(punch.userID, employeeId),
					gte(punch.eventTime, startOfDay),
					lte(punch.eventTime, endOfDay)
				)
			);

		return new Response(JSON.stringify({ success: true, records }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ success: false, error: 'Failed to fetch punches' }), {
			status: 500
		});
	}
};
