import { db } from '$lib/server/db';
import { holidays } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';

export const GET = async () => {
	const holidayList = await db.select().from(holidays);
	return json({ success: true, data: holidayList });
};
