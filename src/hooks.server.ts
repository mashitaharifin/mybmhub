import type { Handle } from '@sveltejs/kit';
import * as auth from '$lib/server/auth';
import { startCronJobs } from '$lib/server/cron';

// ✅ This runs once when the server starts
console.log('Initializing server...');
console.log('Server time:', new Date().toISOString());
console.log(
	'Malaysia time:',
	new Date().toLocaleString('en-MY', { timeZone: 'Asia/Kuala_Lumpur' })
);

try {
	startCronJobs();
	console.log('Cron jobs initialized successfully');
} catch (error) {
	console.error('Failed to initialize cron jobs:', error);
}

const handleAuth: Handle = async ({ event, resolve }) => {
	const sessionToken = event.cookies.get(auth.sessionCookieName);

	if (!sessionToken) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await auth.validateSessionToken(sessionToken);

	if (session) {
		// Fixed: add cookie options for secure, httpOnly, and sameSite
		auth.setSessionTokenCookie(event, sessionToken, session.expiresAt, {
			secure: process.env.NODE_ENV === 'production',
			httpOnly: true,
			sameSite: 'lax'
		});
	} else {
		auth.deleteSessionTokenCookie(event);
	}

	event.locals.user = user;
	event.locals.session = session;

	return resolve(event);
};

export const handle: Handle = handleAuth;
