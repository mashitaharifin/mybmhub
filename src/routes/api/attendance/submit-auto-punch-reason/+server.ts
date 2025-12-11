import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, notifications, users, employees } from '$lib/server/db/schema';
import { eq, and, gte, lt } from 'drizzle-orm';

// Helper: get manager ID
async function getManagerUserId(userId: number): Promise<number | null> {
	// Find any user with Manager role
	const manager = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.role, 'Manager'))
		.orderBy(users.id) // Get consistent manager
		.limit(1)
		.then((rows) => rows[0]);

	return manager?.id ?? null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const { reason, recordId } = await request.json();

		if (!reason || !recordId) {
			return new Response(JSON.stringify({ success: false, error: 'Missing reason or recordId' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Fetch the attendance record
		const record = await db
			.select()
			.from(attendance)
			.where(and(eq(attendance.id, recordId), eq(attendance.userID, user.id)))
			.then((r) => r[0]);

		if (!record) {
			return new Response(JSON.stringify({ success: false, error: 'Record not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Update attendance with reason
		await db
			.update(attendance)
			.set({
				autoPunchedOutReason: reason,
				autoPunchedOutReasonRequired: false,
				updatedAt: new Date()
			})
			.where(eq(attendance.id, recordId));

		// Count auto-punched-out in last 30 days
		const now = new Date();
		const thirtyDaysAgo = new Date();
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		const autoCounts = await db
			.select()
			.from(attendance)
			.where(
				and(
					eq(attendance.userID, user.id),
					eq(attendance.autoPunchedOut, true),
					gte(attendance.summaryDate, thirtyDaysAgo.toISOString().split('T')[0]),
					lt(attendance.summaryDate, now.toISOString().split('T')[0])
				)
			);

		const autoCount = autoCounts.length;

		// If 3 occurrences → notify manager
		if (autoCount >= 3) {
			const employeeRow = await db
				.select()
				.from(employees)
				.where(eq(employees.userId, user.id))
				.then((r: any) => r[0]);

			const managerUserId = employeeRow ? await getManagerUserId(employeeRow.id) : null;

			if (managerUserId) {
				// Fetch user's name
				const userDetails = await db
					.select()
					.from(users)
					.where(eq(users.id, user.id))
					.then((r: any) => r[0]);

				const userName = userDetails?.name || userDetails?.username || 'Employee';

				// Insert notification for manager
				await db.insert(notifications).values({
					recipientID: managerUserId,
					title: 'Repeated Auto Punch-Out Notice',
					message: `${userName} has had ${autoCount} auto punch-out occurrences in the last 30 days.`,
					type: 'SystemAlert', 
					isRead: false,
					createdAt: new Date()
					// Note: Add other required fields from your notifications schema if needed
				});
			}
		}

		// Return SUCCESS response instead of error
		return new Response(
			JSON.stringify({
				success: true,
				message: 'Reason submitted successfully',
				autoCount // Include count for debugging
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('auto punch-out reason error:', err);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Server error',
				details: err instanceof Error ? err.message : String(err)
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
