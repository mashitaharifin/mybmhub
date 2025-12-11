import type { RequestHandler } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, users, employees, punch, geofenceLocations } from '$lib/server/db/schema';
import { eq, and, or, ilike, gt, lt, asc, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm/sql';
import { json } from '@sveltejs/kit';

// Add this function to resolve location names using geofenceLocations table
async function resolveLocationName(lat: number | null, lng: number | null) {
	if (lat == null || lng == null) return null;

	try {
		// Get active geofence from geofenceLocations table
		const activeGeofenceRes = await db
			.select()
			.from(geofenceLocations)
			.where(eq(geofenceLocations.isActive, true))
			.limit(1);

		const activeGeofence = activeGeofenceRes[0];
		if (!activeGeofence) return null;

		// Convert decimal to numbers
		const geofenceLat = Number(activeGeofence.latitude);
		const geofenceLng = Number(activeGeofence.longitude);

		// Use the same haversine distance calculation as employee side
		const distance = haversineDistance(lat, lng, geofenceLat, geofenceLng);

		return distance <= activeGeofence.radiusMeters ? activeGeofence.name : null;
	} catch (err) {
		console.error('Error resolving location name:', err);
		return null;
	}
}

// Haversine distance function (same as employee side)
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const toRad = (v: number) => (v * Math.PI) / 180;
	const R = 6371000; // Earth's radius in meters
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const POST: RequestHandler = async ({ request, locals }) => {
	const currentUser = locals.user;
	if (!currentUser || currentUser.role !== 'Manager') {
		return json({ error: 'Unauthorized' }, { status: 403 });
	}

	const body = await request.json();
	const {
		page = 1,
		pageSize = 20,
		sortBy = { field: 'summaryDate', dir: 'desc' },
		month,
		year,
		employeeQuery
	} = body;

	const limit = Number(pageSize) || 20;
	const offset = (Number(page) - 1) * limit;

	// Build filters
	const filters: any[] = [];

	if (month && year) {
		const startDate = new Date(Number(year), Number(month) - 1, 1);
		const endDate = new Date(startDate);
		endDate.setMonth(endDate.getMonth() + 1);

		filters.push(
			and(
				gt(attendance.summaryDate, startDate.toISOString()),
				lt(attendance.summaryDate, endDate.toISOString())
			)
		);
	} else if (month) {
		filters.push(sql`EXTRACT(MONTH FROM ${attendance.summaryDate}) = ${Number(month)}`);
	} else if (year) {
		filters.push(sql`EXTRACT(YEAR FROM ${attendance.summaryDate}) = ${Number(year)}`);
	}

	if (employeeQuery && employeeQuery.trim()) {
		const q = `%${employeeQuery.trim()}%`;
		filters.push(or(ilike(users.name, q), ilike(users.username, q)));
	}

	try {
		// Total count
		const totalRes = await db
			.select({ total: sql<number>`count(*)` })
			.from(attendance)
			.leftJoin(users, eq(users.id, attendance.userID))
			.leftJoin(employees, eq(employees.userId, users.id))
			.where(filters.length ? and(...filters) : undefined);
		const total = totalRes[0]?.total ?? 0;

		// Sorting
		const sortColumnMap: Record<string, any> = {
			summaryDate: attendance.summaryDate,
			checkInTime: attendance.checkInTime,
			checkOutTime: attendance.checkOutTime,
			workedHours: attendance.workedHours
		};
		const sortColumn = sortColumnMap[sortBy.field] || attendance.summaryDate;

		// Main query
		const recordsRaw = await db
			.select({
				id: attendance.id,
				userId: attendance.userID,
				employeeName: users.name,
				departmentId: employees.departmentId,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours,
				isModified: attendance.isModified,
				autoPunchedOut: attendance.autoPunchedOut,
				autoPunchedOutReason: attendance.autoPunchedOutReason,
				autoPunchedOutReasonRequired: attendance.autoPunchedOutReasonRequired,
				updatedAt: attendance.updatedAt
			})
			.from(attendance)
			.leftJoin(users, eq(users.id, attendance.userID))
			.leftJoin(employees, eq(employees.userId, users.id))
			.where(filters.length ? and(...filters) : undefined)
			.orderBy(sortBy.dir === 'asc' ? asc(sortColumn) : desc(sortColumn))
			.limit(limit)
			.offset(offset);

		// Enrich each record with location data
		const enriched = await Promise.all(
			recordsRaw.map(async (r) => {
				const dayStart = new Date(r.summaryDate);
				dayStart.setUTCHours(0, 0, 0, 0);
				const dayEnd = new Date(dayStart);
				dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

				const checkIn =
					(
						await db
							.select({
								locationLat: punch.locationLat,
								locationLng: punch.locationLng,
								notes: punch.notes,
								eventTime: punch.eventTime
							})
							.from(punch)
							.where(
								and(
									eq(punch.userID, r.userId),
									eq(punch.eventType, 'CheckIn'),
									gt(punch.eventTime, dayStart),
									lt(punch.eventTime, dayEnd)
								)
							)
							.orderBy(asc(punch.eventTime))
							.limit(1)
					)[0] ?? null;

				const checkOut =
					(
						await db
							.select({
								locationLat: punch.locationLat,
								locationLng: punch.locationLng,
								notes: punch.notes,
								eventTime: punch.eventTime
							})
							.from(punch)
							.where(
								and(
									eq(punch.userID, r.userId),
									eq(punch.eventType, 'CheckOut'),
									gt(punch.eventTime, dayStart),
									lt(punch.eventTime, dayEnd)
								)
							)
							.orderBy(desc(punch.eventTime))
							.limit(1)
					)[0] ?? null;

				console.log(
					'🔍 List API - Check-out punch for user',
					r.userId,
					'on',
					r.summaryDate,
					':',
					checkOut
				);

				// Convert string coordinates to numbers and resolve location names
				const checkInLat = checkIn?.locationLat != null ? Number(checkIn.locationLat) : null;
				const checkInLng = checkIn?.locationLng != null ? Number(checkIn.locationLng) : null;
				const checkOutLat = checkOut?.locationLat != null ? Number(checkOut.locationLat) : null;
				const checkOutLng = checkOut?.locationLng != null ? Number(checkOut.locationLng) : null;

				const checkInLocationName =
					checkInLat != null && checkInLng != null
						? await resolveLocationName(checkInLat, checkInLng)
						: null;

				const checkOutLocationName =
					checkOutLat != null && checkOutLng != null
						? await resolveLocationName(checkOutLat, checkOutLng)
						: null;

				return {
					...r,
					isModified: r.isModified === 1,
					checkInLat: checkInLat,
					checkInLng: checkInLng,
					checkOutLat: checkOutLat,
					checkOutLng: checkOutLng,
					//checkInNotes: checkIn?.notes ?? null,
					checkOutNotes: checkOut?.notes ?? null,
					reason: checkOut?.notes || checkIn?.notes || null,
					
					// Add the location objects that LocationDisplay expects
					checkInLocation:
						checkInLat != null
							? {
									lat: checkInLat,
									lng: checkInLng,
									locationName: checkInLocationName
								}
							: null,
					checkOutLocation:
						checkOutLat != null
							? {
									lat: checkOutLat,
									lng: checkOutLng,
									locationName: checkOutLocationName
								}
							: null,
					status: deriveStatus(r, checkIn, checkOut)
				};
			})
		);

		return json({ records: enriched, total, page: Number(page), pageSize: limit });
	} catch (err) {
		console.error('Attendance list error:', err);
		return json({ error: 'Server error' }, { status: 500 });
	}
};

// Simple status derivation
function deriveStatus(att: any, checkIn: any, checkOut: any) {
	if (!checkIn && !checkOut) return 'Missing Punch';
	return 'Present';
}
