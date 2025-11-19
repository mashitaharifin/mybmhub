import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	const res = await db
		.select({ value: systemSettings.value })
		.from(systemSettings)
		.where(eq(systemSettings.keyName, 'company_profile'));

	const rawValue = res[0]?.value;
	if (!rawValue) return new Response(JSON.stringify({ success: false }), { status: 404 });

	const company = JSON.parse(rawValue);

	return new Response(JSON.stringify({ success: true, company }), { status: 200 });
};
