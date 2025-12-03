import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { attendance, punch, geofenceLocations, employees } from '$lib/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import dayjs from 'dayjs';

// Haversine distance helper
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const toRad = (v: number) => (v * Math.PI) / 180;
	const R = 6371000; // meters
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET({ locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');

	// Employee record
	const [emp] = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);
	if (!emp) throw error(404, 'Employee record not found');

	const startDate = dayjs().subtract(30, 'day').startOf('day').format('YYYY-MM-DD');
	const endDate = dayjs().endOf('day').format('YYYY-MM-DD');
	// Get all attendance records in last 30 days
	const attendanceRows = await db
		.select()
		.from(attendance)
		.where(
			and(
				eq(attendance.userID, user.id),
				gte(attendance.summaryDate, startDate),
				lte(attendance.summaryDate, endDate)
			)
		)
		.orderBy(attendance.summaryDate);

	const startDatePunch = dayjs().subtract(30, 'day').startOf('day').toDate();
	const endDatePunch = dayjs().endOf('day').toDate();

	// Get all punches in last 30 days
	const punchRows = await db
		.select()
		.from(punch)
		.where(
			and(
				eq(punch.userID, user.id),
				gte(punch.eventTime, startDatePunch),
				lte(punch.eventTime, endDatePunch)
			)
		);

	// Get active geofence locations
	const geofences = await db
		.select()
		.from(geofenceLocations)
		.where(eq(geofenceLocations.isActive, true));

	// Generate full date range
	const records = [];
	let totalPresent = 0;
	let totalAbsent = 0;
	for (let i = 0; i < 30; i++) {
		const day = dayjs(startDate).add(i, 'day').format('YYYY-MM-DD');

		const att = attendanceRows.find((a) => dayjs(a.summaryDate).format('YYYY-MM-DD') === day);

		let record: any = {
			summaryDate: day,
			checkInTime: att?.checkInTime || null,
			checkOutTime: att?.checkOutTime || null,
			workedHours: att?.workedHours || 0,
			status: 'Absent',
			remarks: (att as any)?.remarks || null,
			checkInLocation: null,
			checkOutLocation: null
		};

		// Map punch locations
		const punchesForDay = punchRows.filter((p) => dayjs(p.eventTime).format('YYYY-MM-DD') === day);

		const checkInPunch = punchesForDay.find((p) => p.eventType === 'CheckIn');
		const checkOutPunch = punchesForDay.find((p) => p.eventType === 'CheckOut');

		function mapPunchToLocation(punchRecord: any) {
			if (!punchRecord) return null;

			let insideGeofence = false;
			let locationName = null;

			for (const geo of geofences) {
				const dist = haversineDistance(
					Number(punchRecord.locationLat),
					Number(punchRecord.locationLng),
					Number(geo.latitude),
					Number(geo.longitude)
				);
				if (dist <= geo.radiusMeters) {
					insideGeofence = true;
					locationName = geo.name;
					break;
				}
			}

			return {
				lat: punchRecord.locationLat,
				lng: punchRecord.locationLng,
				isInsideGeofence: insideGeofence,
				locationName
			};
		}

		record.checkInLocation = mapPunchToLocation(checkInPunch);
		record.checkOutLocation = mapPunchToLocation(checkOutPunch);

		// Determine status
		if (checkInPunch && checkOutPunch) {
			record.status = 'Present';
			totalPresent++;
		} else if (checkInPunch && !checkOutPunch) {
			record.status = 'Incomplete';
			totalPresent++;
		} else {
			record.status = 'Absent';
			totalAbsent++;
		}

		records.push(record);
	}

	// Calculate average hours
	const avgHours =
		records.length > 0
			? records.reduce((sum, r) => sum + Number(r.workedHours || 0), 0) / records.length
			: 0;

	return json({
		success: true,
		summary: { totalDays: records.length, present: totalPresent, absent: totalAbsent, avgHours },
		records
	});
}
