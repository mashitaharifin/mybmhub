import { redirect, type RequestEvent } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';

export const actions = {
	default: async (event: RequestEvent) => {
		const sessionToken = event.cookies.get(auth.sessionCookieName);

		if (sessionToken) {
			// Invalidate session in DB
			const { session } = await auth.validateSessionToken(sessionToken);
			if (session) {
				await auth.invalidateSession(session.id);
			}

			// Delete the session cookie
			auth.deleteSessionTokenCookie(event);
		}

		// Redirect to login page
		throw redirect(303, '/auth/login');
	}
};
