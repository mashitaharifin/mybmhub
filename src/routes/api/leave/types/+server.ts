import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { leaveTypes } from '$lib/server/db/schema';

export async function GET() {
	const types = await db.select().from(leaveTypes);
	return json({ success: true, data: types });
}
