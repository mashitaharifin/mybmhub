import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
			status: 401
		});
	}

	try {
		const result = await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.recipientID, user.id))
			.returning({ updated: notifications.id });

		return new Response(JSON.stringify({ success: true, updated: result.length }), { status: 200 });
	} catch (error) {
		console.error('PATCH /notifications/mark-all-read error:', error);
		return new Response(
			JSON.stringify({ success: false, message: 'Failed to update notifications.' }),
			{ status: 500 }
		);
	}
};
