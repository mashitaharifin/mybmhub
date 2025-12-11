// Create file: src/routes/api/test-my-notification/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import { publishNotification } from '$lib/server/notifications/broadcaster';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return new Response('Unauthorized', { status: 401 });
	}

	const now = new Date();
	const testNotification = {
		id: Date.now(),
		recipientID: locals.user.id, // This will be YOUR user ID (24)
		title: 'Test Notification for YOU',
		message: 'Hello from the broadcaster! This should appear in your popover.',
		type: 'General' as const,
		relatedLeaveID: null,
		triggerDate: now,
		sentAt: now,
		sentInApp: true,
		sentEmail: false,
		isRead: false,
		createdAt: now
	};

	console.log(`📤 Sending test notification to user ${locals.user.id} (${locals.user.username})`);

	publishNotification(locals.user.id, testNotification);

	return new Response(
		JSON.stringify({
			success: true,
			message: 'Test notification sent to your user',
			userId: locals.user.id
		}),
		{
			headers: { 'Content-Type': 'application/json' }
		}
	);
};
