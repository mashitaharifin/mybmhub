// src/routes/reports/attendance/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance } from '$lib/server/db/schema/attendance';
import { punch } from '$lib/server/db/schema/punch';
import { geofenceLocations, users } from '$lib/server/db/schema';
import { between, eq, and } from 'drizzle-orm';

export async function GET({ url }) {
	const start = url.searchParams.get('start');
	const end = url.searchParams.get('end');

	if (!start || !end) {
		return json({ error: 'start and end query parameters are required' }, { status: 400 });
	}

	// 1. Fetch attendance records in range
	const attRecords = await db
		.select()
		.from(attendance)
		.where(between(attendance.summaryDate, start, end));

	// 2. Count employees
	const allEmployees = await db.select({ id: users.id }).from(users);
	const totalEmployees = allEmployees.length;

	// 3. Working days
	const workingDays = countWorkingDays(start, end);

	// 4. Present / Absent
	const present = attRecords.length;
	const expectedEntries = totalEmployees * workingDays;
	const absent = expectedEntries - present;

	// 5. Missing punches
	const missingPunchCount = attRecords.filter((r) => !r.checkInTime || !r.checkOutTime).length;

	// 6. Geofence compliance
	const checkIns = await db
		.select()
		.from(punch)
		.where(
			and(between(punch.eventTime, new Date(start), new Date(end)), eq(punch.eventType, 'CheckIn'))
		);

	const fences = await db
		.select()
		.from(geofenceLocations)
		.where(eq(geofenceLocations.isActive, true));

	let insideCount = 0;
	let outsideCount = 0;

	checkIns.forEach((p) => {
		let inside = false;
		fences.forEach((f) => {
			// Ensure values exist and convert to number
			if (
				p.locationLat !== null &&
				p.locationLng !== null &&
				f.latitude !== null &&
				f.longitude !== null &&
				f.radiusMeters !== null
			) {
				const lat1 = Number(p.locationLat);
				const lon1 = Number(p.locationLng);
				const lat2 = Number(f.latitude);
				const lon2 = Number(f.longitude);
				const radius = Number(f.radiusMeters);

				if (calculateDistance(lat1, lon1, lat2, lon2) <= radius) {
					inside = true;
				}
			}
		});
		if (inside) insideCount++;
		else outsideCount++;
	});


	// 7. Perfect attendance employees
	type UserMapType = Record<number, { present: number; missing: number; outside: number }>;
	const userMap: UserMapType = {};

	allEmployees.forEach((u) => {
		userMap[u.id] = { present: 0, missing: 0, outside: 0 };
	});

	attRecords.forEach((r) => {
		if (userMap[r.userID]) {
			userMap[r.userID].present++;
			if (!r.checkInTime || !r.checkOutTime) userMap[r.userID].missing++;
		}
	});

	checkIns.forEach((p) => {
		if (!userMap[p.userID]) return;
		let isInside = false;
		fences.forEach((f) => {
			if (
				p.locationLat !== null &&
				p.locationLng !== null &&
				f.latitude !== null &&
				f.longitude !== null &&
				f.radiusMeters !== null
			) {
				const lat1 = Number(p.locationLat);
				const lon1 = Number(p.locationLng);
				const lat2 = Number(f.latitude);
				const lon2 = Number(f.longitude);
				const radius = Number(f.radiusMeters);

				if (calculateDistance(lat1, lon1, lat2, lon2) <= radius) {
					isInside = true;
				}
			}
		});
		if (!isInside) userMap[p.userID].outside++;
	});


	let perfectCount = 0;
	let issueCount = 0;
	Object.values(userMap).forEach((u) => {
		if (u.present === workingDays && u.missing === 0 && u.outside === 0) perfectCount++;
		else issueCount++;
	});

	return json({
		present,
		absent,
		geofence: { inside: insideCount, outside: outsideCount },
		missingPunches: missingPunchCount,
		totalWorkingDays: workingDays,
		perfectAttendanceEmployees: perfectCount,
		employeesWithIssues: issueCount
	});
}

// --- Helpers ---

function countWorkingDays(start: string, end: string): number {
	let s = new Date(start);
	const e = new Date(end);
	let count = 0;

	while (s <= e) {
		const day = s.getDay();
		if (day !== 0 && day !== 6) count++;
		s.setDate(s.getDate() + 1);
	}
	return count;
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000; // meters
	const toRad = (v: number) => (v * Math.PI) / 180;

	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);

	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}
