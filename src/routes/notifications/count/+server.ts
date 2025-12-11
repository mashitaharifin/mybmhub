import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and, count } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
			status: 401
		});
	}

	try {
		const [result] = await db
			.select({ count: count() })
			.from(notifications)
			.where(and(eq(notifications.recipientID, user.id), eq(notifications.isRead, false)));

		const unread = Number(result?.count ?? 0);

		return new Response(JSON.stringify({ success: true, count: unread }), { status: 200 });
	} catch (err) {
		console.error('GET /notifications/count error:', err);
		return new Response(JSON.stringify({ success: false, message: 'Failed to fetch count.' }), {
			status: 500
		});
	}
};
