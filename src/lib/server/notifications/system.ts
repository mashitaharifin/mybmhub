// src/lib/server/notifications/system.ts
import { createNotification } from './createNotification';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Helper: get user name by user ID
 */
async function getUsername(userId: number): Promise<string> {
	const rows = await db
		.select({ username: users.username })
		.from(users)
		.where(eq(users.id, userId));

	return rows[0]?.username ?? 'User';
}

/**
 * Helper: get all manager user IDs
 * Assumes managers are identified by role = 'Manager'
 */
async function getManagerUserIds(): Promise<number[]> {
	const rows = await db.select({ id: users.id }).from(users).where(eq(users.role, 'Manager'));

	return rows.map((r) => r.id);
}

/**
 * Notify a user to change their password
 */
export async function notifyPasswordChangeRequired(opts: { userId: number; username?: string }) {
	const username = opts.username ?? (await getUsername(opts.userId));

	const title = 'Password Change Required';
	const message = `Hello ${username}, please change your password. The auto-created password is unsafe.`;

	return createNotification({
		recipientID: opts.userId,
		title,
		message,
		type: 'SystemAlert',
		relatedLeaveID: null
	});
}

/**
 * Notify manager(s) that a new user was created
 */
export async function notifyManagerUserCreated(opts: {
	managerUserId?: number;
	newUsername: string;
	role?: string;
}) {
	const managers = opts.managerUserId ? [opts.managerUserId] : await getManagerUserIds();

	const title = `New User Created: ${opts.newUsername}`;
	const message = `You have successfully created a ${opts.role ?? 'user'} account with username ${opts.newUsername}.`;

	for (const managerId of managers) {
		await createNotification({
			recipientID: managerId,
			title,
			message,
			type: 'General',
			relatedLeaveID: null
		});
	}
}
