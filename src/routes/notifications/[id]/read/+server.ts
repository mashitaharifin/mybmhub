import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
			status: 401
		});
	}
	const id = Number(event.params.id);

	try {
		// Ensure notification belongs to this user
		const target = await db
			.select()
			.from(notifications)
			.where(and(eq(notifications.id, id), eq(notifications.recipientID, user.id)))
			.limit(1);

		if (target.length === 0) {
			return new Response(JSON.stringify({ success: false, message: 'Notification not found.' }), {
				status: 404
			});
		}

		await db
			.update(notifications)
			.set({
				isRead: true
			})
			.where(and(eq(notifications.id, id), eq(notifications.recipientID, user.id)));

		return new Response(JSON.stringify({ success: true }), { status: 200 });
	} catch (error) {
		console.error('PATCH /notifications/:id/read error:', error);
		return new Response(
			JSON.stringify({ success: false, message: 'Failed to update notification.' }),
			{ status: 500 }
		);
	}
};
