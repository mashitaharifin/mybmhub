import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;

	// 1. Authentication check
	if (!user) {
		return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), {
			status: 401,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	try {
		// 2. Parse and validate query parameters
		const url = new URL(event.request.url);
		const limitParam = url.searchParams.get('limit') || '6';
		const offsetParam = url.searchParams.get('offset') || '0';
		const onlyUnread = url.searchParams.get('unread') === 'true';

		let limit = parseInt(limitParam);
		let offset = parseInt(offsetParam);

		// Validate limit parameter
		if (isNaN(limit) || limit <= 0 || limit > 100) {
			limit = 6;
		}

		// Validate offset parameter
		if (isNaN(offset) || offset < 0) {
			offset = 0;
		}

		// 3. Build query with filtering options
		let query = db
			.select()
			.from(notifications)
			.where(
				onlyUnread
					? and(eq(notifications.recipientID, user.id), eq(notifications.isRead, false))
					: eq(notifications.recipientID, user.id)
			);

		// 4. Execute query with pagination
		const rows = await query.orderBy(desc(notifications.createdAt)).limit(limit).offset(offset);

		// 5. Get total count for pagination metadata
		const countQuery = db
			.select({ count: count() })
			.from(notifications)
			.where(
				onlyUnread
					? and(eq(notifications.recipientID, user.id), eq(notifications.isRead, false))
					: eq(notifications.recipientID, user.id)
			);

		const [countResult] = await countQuery;
		const total = Number(countResult?.count || 0);

		// 6. Return response
		return new Response(
			JSON.stringify({
				success: true,
				data: rows,
				pagination: {
					limit,
					offset,
					total,
					hasMore: offset + rows.length < total
				}
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json'
				}
			}
		);
	} catch (error) {
		console.error('GET /notifications error:', error);
		return new Response(
			JSON.stringify({
				success: false,
				message: 'Failed to fetch notifications.',
				error: error instanceof Error ? error.message : 'Unknown error'
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
