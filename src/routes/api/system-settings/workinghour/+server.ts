import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		const settings = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.category, 'WorkingHours'));

		if (!settings.length) {
			return new Response(JSON.stringify({ error: 'No working hours found' }), { status: 404 });
		}

		const workingHours = settings.map((row) => row.value);

		return new Response(JSON.stringify(workingHours), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ error: 'Failed to fetch working hours' }), {
			status: 500
		});
	}
};
