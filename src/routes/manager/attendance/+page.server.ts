import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { attendance, users, employees, punch, geofenceLocations } from '$lib/server/db/schema';
import { eq, and, gte, lt, desc, asc } from 'drizzle-orm';

// Haversine distance helper
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const toRad = (v: number) => (v * Math.PI) / 180;
	const R = 6371000; // meters
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

export const load: PageServerLoad = async ({ locals }) => {
	const currentUser = locals.user;

	if (!currentUser || currentUser.role !== 'Manager') {
		return { status: 403, body: { error: 'Unauthorized' } };
	}

	const today = new Date();
	const pastDate = new Date(today);
	pastDate.setDate(pastDate.getDate() - 30);

	// Convert dates to YYYY-MM-DD strings for PgDateString comparison
	const pastDateStr = pastDate.toISOString().split('T')[0];
	const todayStr = today.toISOString().split('T')[0];

	// Fetch last 30 days attendance
	const attendanceRecords = await db
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
		.where(and(gte(attendance.summaryDate, pastDateStr), lt(attendance.summaryDate, todayStr)))
		.orderBy(desc(attendance.summaryDate));

	// Fetch all geofences
	const geofences = await db
		.select({
			id: geofenceLocations.id,
			name: geofenceLocations.name,
			latitude: geofenceLocations.latitude,
			longitude: geofenceLocations.longitude,
			radiusMeters: geofenceLocations.radiusMeters
		})
		.from(geofenceLocations);

	// Helper to resolve geofence by coordinates
	function resolveGeofence(lat?: number | null, lng?: number | null) {
		if (!lat || !lng) return null;
		for (const g of geofences) {
			const dist = haversineDistance(lat, lng, Number(g.latitude), Number(g.longitude));
			if (dist <= Number(g.radiusMeters)) return g.name;
		}
		return null;
	}

	// Enrich each attendance record with punch locations
	const enriched = await Promise.all(
		attendanceRecords.map(async (r) => {
			const dayStart = new Date(r.summaryDate);
			dayStart.setUTCHours(0, 0, 0, 0);
			const dayEnd = new Date(dayStart);
			dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);

			// Get latest punch in
			const checkIn =
				(
					await db
						.select({
							locationLat: punch.locationLat,
							locationLng: punch.locationLng,
							eventTime: punch.eventTime
						})
						.from(punch)
						.where(
							and(
								eq(punch.userID, r.userId),
								eq(punch.eventType, 'CheckOut'),
								gte(punch.eventTime, dayStart),
								lt(punch.eventTime, dayEnd)
							)
						)
						.orderBy(asc(punch.eventTime))
						.limit(1)
				)[0] ?? null;

			// Get latest punch out
			const checkOut =
				(
					await db
						.select({
							locationLat: punch.locationLat,
							locationLng: punch.locationLng,
							eventTime: punch.eventTime
						})
						.from(punch)
						.where(
							and(
								eq(punch.userID, r.userId),
								eq(punch.eventType, 'CheckOut'),
								gte(punch.eventTime, dayStart),
								lt(punch.eventTime, dayEnd)
							)
						)
						.orderBy(desc(punch.eventTime))
						.limit(1)
				)[0] ?? null;

			return {
				...r,
				isModified: r.isModified === 1,
				checkInLat: checkIn?.locationLat != null ? Number(checkIn.locationLat) : null,
				checkInLng: checkIn?.locationLng != null ? Number(checkIn.locationLng) : null,
				checkOutLat: checkOut?.locationLat != null ? Number(checkOut.locationLat) : null,
				checkOutLng: checkOut?.locationLng != null ? Number(checkOut.locationLng) : null,
				checkInLocation: checkIn
					? {
							lat: checkIn.locationLat != null ? Number(checkIn.locationLat) : null,
							lng: checkIn.locationLng != null ? Number(checkIn.locationLng) : null,
							locationName: resolveGeofence(
								checkIn.locationLat != null ? Number(checkIn.locationLat) : null,
								checkIn.locationLng != null ? Number(checkIn.locationLng) : null
							)
						}
					: null,
				checkOutLocation: checkOut
					? {
							lat: checkOut.locationLat != null ? Number(checkOut.locationLat) : null,
							lng: checkOut.locationLng != null ? Number(checkOut.locationLng) : null,
							locationName: resolveGeofence(
								checkOut.locationLat != null ? Number(checkOut.locationLat) : null,
								checkOut.locationLng != null ? Number(checkOut.locationLng) : null
							)
						}
					: null
			};
		})
	);

	return { records: enriched };
};
