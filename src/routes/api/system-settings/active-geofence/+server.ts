import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { geofenceLocations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		const active = await db.select().from(geofenceLocations).where(eq(geofenceLocations.isActive, true));

		if (!active.length) {
			return new Response(JSON.stringify({ error: 'No active geofence found' }), { status: 404 });
		}

		return new Response(JSON.stringify(active[0]), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ error: 'Failed to fetch active geofence' }), {
			status: 500
		});
	}
};
