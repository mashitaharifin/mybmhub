import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { geofenceLocations } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		const active = await db
			.select()
			.from(geofenceLocations)
			.where(eq(geofenceLocations.isActive, true));

		if (!active.length) {
			return new Response(JSON.stringify({ success: false, error: 'No active geofence found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		return new Response(JSON.stringify({ success: true, data: active[0] }), {
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Failed to fetch active geofence', err);
		return new Response(
			JSON.stringify({ success: false, error: 'Failed to fetch active geofence' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
