// src/routes/api/attendance/test-cron/+server.ts
import { json } from '@sveltejs/kit';
import { autoPunchOutJob } from '$lib/server/autoPunchOutJob';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const result = await autoPunchOutJob();
		return json({
			success: true,
			message: 'Cron job executed manually',
			result
		});
	} catch (error) {
		console.error('Manual cron test failed:', error);

		// Handle the unknown error type safely
		const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

		return json(
			{
				success: false,
				error: errorMessage
			},
			{ status: 500 }
		);
	}
};
