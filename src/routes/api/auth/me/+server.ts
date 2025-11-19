import type { RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
	}

	const user = locals.user;

	return new Response(
		JSON.stringify({
			id: user.id,
			name: user.username,
			role: user.role,
			title: user.jobTitle || 'Employee',
			initials: user.username
				.split(' ')
				.map((n) => n[0] || '')
				.join('')
				.toUpperCase(),
			notificationCount: 0
		}),
		{ headers: { 'Content-Type': 'application/json' } }
	);
};
