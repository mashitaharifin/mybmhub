// src/routes/notifications/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { notifications, users } from '$lib/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Authentication check
	const user = locals.user;
	if (!user) {
		throw redirect(302, '/auth/login');
	}

	const filter = url.searchParams.get('filter') || 'all';
	const whereClause =
		filter === 'unread'
			? and(eq(notifications.recipientID, user.id), eq(notifications.isRead, false))
			: eq(notifications.recipientID, user.id);

	const notificationList = await db
		.select()
		.from(notifications)
		.where(whereClause)
		.orderBy(desc(notifications.createdAt), desc(notifications.id));

	return {
		notifications: notificationList,
		filter,
		user
	};
};

export const actions: Actions = {
	markAllRead: async ({ locals }) => {
		// Authentication check
		const user = locals.user;
		if (!user) {
			throw redirect(302, '/auth/login');
		}

		await db
			.update(notifications)
			.set({ isRead: true })
			.where(eq(notifications.recipientID, user.id));

		return { success: true };
	}
};
