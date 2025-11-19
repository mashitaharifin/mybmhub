import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { holidays, leaveApplications, users, leaveTypes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

interface CalendarEvent {
	date: string; // YYYY-MM-DD
	type: 'holiday' | 'leave';
	title: string;
}

export const GET: RequestHandler = async ({ url }) => {
	try {
		const typeFilter = url.searchParams.get('type'); // optional filter

		// --- Fetch holidays ---
		const holidayRows = await db
			.select({
				holidayName: holidays.holidayName,
				startDate: holidays.startDate,
				endDate: holidays.endDate
			})
			.from(holidays);

		const holidayEvents: CalendarEvent[] = [];
		for (const h of holidayRows) {
			const start = new Date(h.startDate);
			const end = h.endDate ? new Date(h.endDate) : start;

			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().slice(0, 10);
				holidayEvents.push({
					date: dateStr,
					type: 'holiday',
					title: h.holidayName
				});

			}
		}

		// --- Fetch approved leaves ---
		// FIX: Use the correct join condition for leaveTypes
		const leaveRows = await db
			.select({
				userName: users.name,
				leaveType: leaveTypes.typeName,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate
			})
			.from(leaveApplications)
			.leftJoin(users, eq(leaveApplications.userID, users.id))
			.leftJoin(leaveTypes, eq(leaveApplications.leaveTypeID, leaveTypes.id)) // FIXED: Use leaveTypeID instead of id
			.where(eq(leaveApplications.status, 'Approved'));

		const leaveEvents: CalendarEvent[] = [];
		for (const l of leaveRows) {
			const start = new Date(l.startDate);
			const end = l.endDate ? new Date(l.endDate) : start;

			for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
				leaveEvents.push({
					date: d.toISOString().slice(0, 10),
					type: 'leave',
					title: `${l.userName} - ${l.leaveType}`
				});
			}
		}

		// Combine events
		let allEvents = [...holidayEvents, ...leaveEvents];

		// Optional filter by type
		if (typeFilter === 'holiday' || typeFilter === 'leave') {
			allEvents = allEvents.filter((e) => e.type === typeFilter);
		}

		return new Response(JSON.stringify(allEvents), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Failed to fetch calendar events:', err);
		return new Response(JSON.stringify([]), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
