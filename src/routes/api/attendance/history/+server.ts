import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { attendance, employees, geofenceLocations, users } from '$lib/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { startOfMonth, endOfMonth } from 'date-fns';

export const GET: RequestHandler = async ({ locals, url }) => {
	try {
		const session = locals.session;
		if (!session) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const userId = session.userId;
		const month = url.searchParams.get('month'); // format: YYYY-MM

		if (!month) {
			return new Response(JSON.stringify({ error: 'Month is required' }), { status: 400 });
		}

		const start = startOfMonth(new Date(month + '-01'));
		const end = endOfMonth(new Date(month + '-01'));

		// Get employee record
		const employee = await db.query.employees.findFirst({
			where: eq(employees.userId, userId)
		});

		if (!employee) {
			return new Response(JSON.stringify({ error: 'Employee not found' }), { status: 404 });
		}

		// Fetch attendance
		const records = await db.query.attendance.findMany({
			where: and(
				eq(attendance.userID, employee.id),
				gte(attendance.checkInTime, start),
				lte(attendance.checkInTime, end)
			),
			orderBy: (t, { asc }) => asc(t.checkInTime)
		});

		// Fetch geofence
		const geofence = await db.query.geofenceLocations.findFirst();

		return new Response(
			JSON.stringify({
				records,
				geofence
			}),
			{ status: 200 }
		);
	} catch (err) {
		console.error(err);
		return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
	}
};
