// src/routes/api/seed-notifications/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications, users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { publishNotification } from '$lib/server/notifications/broadcaster';

export const GET: RequestHandler = async ({ locals }) => {
	const isDevelopment = process.env.NODE_ENV === 'development';
	const isManager = locals.user?.role === 'Manager';

	if (!isDevelopment && !isManager) {
		return new Response('Unauthorized', { status: 401 });
	}

	try {
		// Use the CURRENT logged-in user
		const currentUser = locals.user;

		if (!currentUser) {
			return new Response(JSON.stringify({ success: false, message: 'No user logged in' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Use currentUser instead of fetching from database
		const user = currentUser;

		// ADD THIS DEBUGGING LOG
		console.log('🔍 [Seed] User from database:', {
			id: user.id,
			idType: typeof user.id,
			email: user.email,
			fullObject: user
		});

		const now = new Date();

		const mockData = [
			{
				recipientID: user.id,
				title: 'Probation Period Ending Soon',
				message: `Employee Siti Hajar's probation period ends in 7 days.`,
				type: 'SystemAlert' as const,
				relatedLeaveID: null,
				triggerDate: now,
				sentAt: now,
				sentInApp: true,
				sentEmail: false,
				isRead: false,
				createdAt: now
			}
		];

		const insertedNotifications = [];

		for (const data of mockData) {
			// Insert notification and get the inserted row
			const [inserted] = await db.insert(notifications).values(data).returning();
			insertedNotifications.push(inserted);

			// Publish the notification via SSE
			if (inserted) {
				// ADD THIS DEBUGGING LOG
				console.log('🔍 [Seed] Publishing notification:', {
					notificationId: inserted.id,
					recipientID: inserted.recipientID,
					recipientIDType: typeof inserted.recipientID,
					userIDFromDB: user.id,
					userIDTypeFromDB: typeof user.id
				});

				publishNotification(user.id, {
					id: inserted.id,
					recipientID: inserted.recipientID!,
					title: inserted.title!,
					message: inserted.message!,
					type: inserted.type!,
					relatedLeaveID: inserted.relatedLeaveID,
					triggerDate: inserted.triggerDate,
					sentAt: inserted.sentAt,
					sentInApp: inserted.sentInApp ?? false,
					sentEmail: inserted.sentEmail ?? false,
					isRead: inserted.isRead ?? false,
					createdAt: inserted.createdAt ?? now
				});
			}
		}

		return new Response(
			JSON.stringify({
				success: true,
				message: 'Notifications seeded and broadcasted successfully',
				count: insertedNotifications.length
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (error) {
		console.error('Seed error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				message: 'Failed to seed notifications',
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
