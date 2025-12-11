// src/routes/notifications/stream/+server.ts
import type { RequestHandler } from '@sveltejs/kit';
import {
	subscribe,
	unsubscribe,
	type NotificationRecord
} from '$lib/server/notifications/broadcaster';

export const GET: RequestHandler = async (event) => {
	console.log('[SSE] Connection attempt received');

	const user = event.locals.user;

	// Debug: check what's in locals.user
	console.log('[SSE] User from locals:', {
		hasUser: !!user,
		userId: user?.id,
		userType: typeof user?.id,
		user: user
	});

	if (!user) {
		console.log('[SSE] No user - returning unauthorized');
		// For EventSource, we need to send an error as an SSE message
		const errorStream = new ReadableStream({
			start(controller) {
				const errorData = JSON.stringify({
					type: 'error',
					message: 'Unauthorized - Please log in'
				});
				controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
				controller.close();
			}
		});

		return new Response(errorStream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive'
			}
		});
	}

	console.log(`[SSE] Creating stream for user ${user.id} (type: ${typeof user.id})`);

	// Convert user.id to number if needed
	const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
	console.log(`[SSE] User ID after conversion: ${userId} (type: ${typeof userId})`);

	const stream = new ReadableStream({
		start(controller) {
			console.log(`[SSE] Stream started for user ${userId}`);

			// Send initial connection message
			const connectMsg = JSON.stringify({
				type: 'connected',
				message: 'SSE connection established',
				userId: userId,
				timestamp: new Date().toISOString()
			});
			controller.enqueue(new TextEncoder().encode(`data: ${connectMsg}\n\n`));
			console.log('[SSE] Sent connection message');

			// Send ping every 25 seconds to keep connection alive
			let pingInterval: NodeJS.Timeout | null = setInterval(() => {
				try {
					controller.enqueue(new TextEncoder().encode(': ping\n\n'));
				} catch (err) {
					console.log(`[SSE] Ping failed for user ${userId}, connection closed`);
					if (pingInterval) clearInterval(pingInterval);
					pingInterval = null;
				}
			}, 25000);

			const cb = (payload: NotificationRecord) => {
				try {
					console.log(
					);
					const data = `data: ${JSON.stringify(payload)}\n\n`;
					controller.enqueue(new TextEncoder().encode(data));
				} catch (err) {
					console.error('[SSE] Failed to enqueue SSE event:', err);
				}
			};

			// Subscribe the callback for this user
			console.log(`[SSE] Subscribing user ${userId} to broadcaster`);
			const unsub = subscribe(userId, cb);
			console.log(`[SSE] User ${userId} subscribed successfully`);

			// When client closes connection signal, cleanup
			event.request.signal.addEventListener('abort', () => {
				console.log(`[SSE] Connection aborted for user ${userId}`);
				if (pingInterval) clearInterval(pingInterval);
				pingInterval = null;
				unsub();
				try {
					controller.close();
				} catch (err) {
					// Ignore
				}
				console.log(`[SSE] Cleanup complete for user ${userId}`);
			});

			// Handle stream errors - use a try-catch around controller.enqueue instead
		},

		cancel() {
			console.log(`[SSE] Stream cancelled for user`);
		}
	});

	const headers = new Headers({
		'Content-Type': 'text/event-stream',
		'Cache-Control': 'no-cache, no-transform',
		Connection: 'keep-alive',
		'X-Accel-Buffering': 'no', // Important for some proxies
		'Access-Control-Allow-Origin': event.url.origin,
		'Access-Control-Allow-Credentials': 'true'
	});

	return new Response(stream, { headers });
};
