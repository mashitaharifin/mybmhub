import type { RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase64url, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

/** Generate a secure random token */
export function generateSessionToken(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(18));
	return encodeBase64url(bytes);
}

/** Create a session in the DB */
export async function createSession(token: string, userId: number) {
	// session ID is a hash of the token
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	const session = {
		id: sessionId,
		userId, // now correctly a number
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
		createdAt: new Date()
	};

	await db.insert(table.sessions).values(session); // note plural 'sessions'

	return session;
}

/** Validate a session token and optionally renew it */
export async function validateSessionToken(token: string) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

	// Join sessions -> users -> employees to get role and jobTitle
	const [result] = await db
		.select({
			user: {
				id: table.users.id,
				username: table.users.username,
				role: table.users.role,
				jobTitle: table.employees.jobTitle
			},
			session: table.sessions
		})
		.from(table.sessions)
		.innerJoin(table.users, eq(table.sessions.userId, table.users.id))
		.leftJoin(table.employees, eq(table.employees.userId, table.users.id))
		.where(eq(table.sessions.id, sessionId));

	if (!result) {
		return { session: null, user: null };
	}

	const { session, user } = result;

	// Type assertion for TypeScript so user has role and jobTitle
	const typedUser: { id: number; username: string; role: string; jobTitle: string | null } = user;

	// Check expiration
	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.sessions).where(eq(table.sessions.id, session.id));
		return { session: null, user: null };
	}

	// Auto-renew if session is close to expiry
	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.sessions)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.sessions.id, session.id));
	}

	return { session, user: typedUser };
}


export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

/** Invalidate a session by ID */
export async function invalidateSession(sessionId: string) {
	await db.delete(table.sessions).where(eq(table.sessions.id, sessionId));
}

/** Set session token cookie */
export function setSessionTokenCookie(
	event: RequestEvent,
	token: string,
	expiresAt: Date,
	options: { secure: boolean; httpOnly: boolean; sameSite: 'strict' | 'lax' | 'none' }
) {
	event.cookies.set(sessionCookieName, token, {
		expires: expiresAt,
		path: '/',
		...options
	});
}

/** Delete session token cookie */
export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, { path: '/' });
}
