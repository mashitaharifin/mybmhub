import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		// Fetch all working hours rows
		const rows = await db
			.select({
				keyName: systemSettings.keyName,
				value: systemSettings.value
			})
			.from(systemSettings)
			.where(eq(systemSettings.category, 'WorkingHours')); 

		// Parse the JSON values
		const workingHours = rows
			.map((r) => {
				try {
					// Add null check before parsing
					if (!r.value) return null;
					return JSON.parse(r.value);
				} catch {
					return null;
				}
			})
			.filter(Boolean);

		return new Response(JSON.stringify(workingHours[0] ?? null), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Error fetching working hours:', err);
		return new Response(JSON.stringify({ message: 'Failed to fetch working hours' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
