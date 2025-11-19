import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const lastAttendance = await db
			.select({
				summaryDate: attendance.summaryDate
			})
			.from(attendance)
			.where(eq(attendance.userID, user.id))
			.orderBy(desc(attendance.summaryDate));

		const streakCount = lastAttendance.length;

		const payload = {
			streakCount
		};

		return new Response(JSON.stringify({ success: true, data: payload }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('empHeader GET error:', error);
		return new Response(JSON.stringify({ success: false, error: 'Failed to fetch streak' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
