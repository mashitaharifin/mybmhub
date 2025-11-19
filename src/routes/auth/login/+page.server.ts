import { fail, redirect, type Actions } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { verify } from '@node-rs/argon2';
import * as table from '$lib/server/db/schema';
import * as auth from '$lib/server/auth';

function validateUsername(username: unknown): username is string {
	return (
		typeof username === 'string' &&
		username.length >= 3 &&
		username.length <= 31 &&
		/^[a-z0-9_-]+$/.test(username)
	);
}

function validatePassword(password: unknown): password is string {
	return typeof password === 'string' && password.length >= 6 && password.length <= 255;
}

const MAX_FAILED_ATTEMPTS = 5;

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const username = formData.get('username');
		const password = formData.get('password');

		if (!validateUsername(username)) return fail(400, { message: 'Invalid username format.' });
		if (!validatePassword(password)) return fail(400, { message: 'Invalid password format.' });

		const results = await db.select().from(table.users).where(eq(table.users.username, username));
		const user = results.at(0);

		if (!user) return fail(400, { message: 'Username does not exist.' });
		if (user.status === 'Inactive')
			return fail(403, { message: 'Your account is inactive. Please contact admin.' });
		if (user.lockedUntil && user.lockedUntil > new Date()) {
			const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
			return fail(403, { message: `Account locked. Try again in ${minutes} minute(s).` });
		}

		const validPassword = await verify(user.passwordHash, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (!validPassword) {
			const newCount = (user.failedLoginAttempts ?? 0) + 1;

			const setting = await db
				.select()
				.from(table.systemSettings)
				.where(eq(table.systemSettings.keyName, 'MAX_FAILED_LOGIN_ATTEMPTS'));
			const limit = parseInt(setting.at(0)?.value ?? `${MAX_FAILED_ATTEMPTS}`);

			let lockUntil: Date | null = null;
			if (newCount >= limit) {
				lockUntil = new Date(Date.now() + 15 * 60 * 1000);
			}

			await db
				.update(table.users)
				.set({ failedLoginAttempts: newCount, lockedUntil: lockUntil })
				.where(eq(table.users.id, user.id));

			return fail(400, { message: 'Incorrect password. Please try again.' });
		}

		// Reset failed attempts on successful login
		await db
			.update(table.users)
			.set({ failedLoginAttempts: 0, lastLoginAt: new Date() })
			.where(eq(table.users.id, user.id));

		// --- Create session ---
		const sessionToken = auth.generateSessionToken();
		const session = await auth.createSession(sessionToken, user.id); // pass integer, not string
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt, {
			secure: true,
			httpOnly: true,
			sameSite: 'strict'
		});

		if (user.role === 'Manager') {
			throw redirect(302, '/manager/dashboard');
		} else {
			throw redirect(302, '/employee/dashboard');
		}
	}
};
