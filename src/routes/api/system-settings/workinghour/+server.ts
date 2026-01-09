// api/system-settings/workinghour/+server.ts 
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { systemSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async () => {
	try {
		// Get the default/active working hours configuration
		// Assuming 'working_hours' is the default key
		const defaultSetting = await db
			.select()
			.from(systemSettings)
			.where(eq(systemSettings.keyName, 'working_hours'));

		if (!defaultSetting.length) {
			// Try to get any working hours configuration
			const anySetting = await db
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.category, 'WorkingHours'))
				.limit(1);

			if (!anySetting.length) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'No working hours configuration found'
					}),
					{
						status: 404,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}

			const setting = anySetting[0];
			try {
				const parsedValue = JSON.parse(setting.value || '{}');

				return new Response(
					JSON.stringify({
						success: true,
						data: {
							title: parsedValue.title || 'Standard',
							start: parsedValue.start || '11:00',
							end: parsedValue.end || '19:00',
							graceMinutes: parsedValue.graceMinutes || 10
						},
						source: setting.keyName // For debugging
					}),
					{
						headers: { 'Content-Type': 'application/json' }
					}
				);
			} catch (parseError) {
				return new Response(
					JSON.stringify({
						success: false,
						error: 'Invalid working hours configuration format'
					}),
					{
						status: 500,
						headers: { 'Content-Type': 'application/json' }
					}
				);
			}
		}

		const setting = defaultSetting[0];

		try {
			const parsedValue = JSON.parse(setting.value || '{}');

			return new Response(
				JSON.stringify({
					success: true,
					data: {
						title: parsedValue.title || 'Standard',
						start: parsedValue.start || '11:00',
						end: parsedValue.end || '19:00',
						graceMinutes: parsedValue.graceMinutes || 10
					}
				}),
				{
					headers: { 'Content-Type': 'application/json' }
				}
			);
		} catch (parseError) {
			console.error('JSON parse error:', parseError);
			return new Response(
				JSON.stringify({
					success: false,
					error: 'Invalid JSON format in working hours configuration'
				}),
				{
					status: 500,
					headers: { 'Content-Type': 'application/json' }
				}
			);
		}
	} catch (err) {
		console.error('Working hours fetch error:', err);
		return new Response(
			JSON.stringify({
				success: false,
				error: 'Failed to fetch working hours',
				details: err instanceof Error ? err.message : String(err)
			}),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' }
			}
		);
	}
};
