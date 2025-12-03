import { db } from '$lib/server/db';
import { holidays } from '$lib/server/db/schema';
import { and, eq, gte, lte, or } from 'drizzle-orm';

export async function calculateLeaveDays(start: Date, end: Date, halfDay = false) {
	let totalDays = 0;

	// --- 1. Generate all weekdays between start and end ---
	const allWeekdays: string[] = [];
	let current = new Date(start);
	while (current <= end) {
		const dow = current.getDay();
		const iso = current.toISOString().split('T')[0];
		if (dow !== 0 && dow !== 6) {
			allWeekdays.push(iso);
		}
		current.setDate(current.getDate() + 1);
	}

	// --- 2. Fetch holidays overlapping the leave range ---
	const startISO = start.toISOString().split('T')[0];
	const endISO = end.toISOString().split('T')[0];

	const holidayList = await db
		.select()
		.from(holidays)
		.where(
			or(
				// Non-recurring holidays that overlap the leave range
				and(lte(holidays.startDate, endISO), gte(holidays.endDate ?? holidays.startDate, startISO)),
				// Recurring holidays (assume applies every year, same month/day)
				eq(holidays.isRecurring, true)
			)
		);

	// --- 3. Expand holiday dates ---
	const holidayDates: string[] = [];

	for (const h of holidayList) {
		// Handle recurring holidays by mapping to current year
		const hStart = new Date(h.startDate);
		const hEnd = h.endDate ? new Date(h.endDate) : hStart;

		let hCurrent = new Date(hStart);

		// If recurring, replace year with current year
		if (h.isRecurring) {
			hCurrent.setFullYear(start.getFullYear());
			hEnd.setFullYear(start.getFullYear());
		}

		while (hCurrent <= hEnd) {
			const iso = hCurrent.toISOString().split('T')[0];
			holidayDates.push(iso);
			hCurrent.setDate(hCurrent.getDate() + 1);
		}
	}

	// --- 4. Remove holidays from weekdays ---
	const workDays = allWeekdays.filter((d) => !holidayDates.includes(d));
	totalDays = workDays.length;

	// --- 5. Apply half-day ---
	if (halfDay) totalDays -= 0.5;

	if (totalDays < 0) totalDays = 0;
	totalDays = Number(totalDays.toFixed(1));

	// --- Debugging logs (optional) ---
	// console.log('All weekdays:', allWeekdays);
	// console.log('Holiday dates:', holidayDates);
	// console.log('Workdays after holiday filter:', workDays);
	// console.log('Total days:', totalDays);

	return totalDays;
}
