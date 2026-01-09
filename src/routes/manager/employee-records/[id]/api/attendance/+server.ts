// api/attendance/+server.ts
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import {
	attendance,
	punch,
	geofenceLocations,
	employees,
	leaveApplications,
	leaveTypes
} from '$lib/server/db/schema';
import { eq, and, gte, lte, or } from 'drizzle-orm';
import dayjs from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// --------------------
// Helpers
// --------------------
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
	const toRad = (v: number) => (v * Math.PI) / 180;
	const R = 6371000;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --------------------
// GET Attendance (Manager / Admin view)
// --------------------
export async function GET({ params }) {
	const empId = Number(params.id);
	if (isNaN(empId)) throw error(400, 'Invalid employee ID');

	const [emp] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
	if (!emp) throw error(404, 'Employee not found');

	const startDate = dayjs().subtract(30, 'day').startOf('day');
	const endDate = dayjs().endOf('day');

	// --------------------
	// Fetch data
	// --------------------
	const attendanceRows = await db
		.select({
			summaryDate: attendance.summaryDate,
			checkInTime: attendance.checkInTime,
			checkOutTime: attendance.checkOutTime,
			workedHours: attendance.workedHours,
			status: attendance.attendanceStatus,
			autoPunchedOut: attendance.autoPunchedOut,
			autoPunchedOutReason: attendance.autoPunchedOutReason,
			autoPunchedOutReasonRequired: attendance.autoPunchedOutReasonRequired
		})
		.from(attendance)
		.where(
			and(
				eq(attendance.userID, emp.userId),
				gte(attendance.summaryDate, startDate.format('YYYY-MM-DD')),
				lte(attendance.summaryDate, endDate.format('YYYY-MM-DD'))
			)
		);

	const approvedLeaves = await db
		.select({
			startDate: leaveApplications.startDate,
			endDate: leaveApplications.endDate,
			halfDay: leaveApplications.halfDay,
			halfDaySession: leaveApplications.halfDaySession,
			status: leaveApplications.status,
			leaveTypeID: leaveApplications.leaveTypeID
		})
		.from(leaveApplications)
		.where(
			and(
				eq(leaveApplications.userID, emp.userId),
				eq(leaveApplications.status, 'Approved'),
				or(
					gte(leaveApplications.startDate, startDate.format('YYYY-MM-DD')),
					gte(leaveApplications.endDate, startDate.format('YYYY-MM-DD'))
				)
			)
		);

	const punchRows = await db
		.select()
		.from(punch)
		.where(
			and(
				eq(punch.userID, emp.userId),
				gte(punch.eventTime, startDate.toDate()),
				lte(punch.eventTime, endDate.toDate())
			)
		);

	const geofences = await db
		.select()
		.from(geofenceLocations)
		.where(eq(geofenceLocations.isActive, true));

	// --------------------
	// Leave helper
	// --------------------
	const leaveTypesMap = new Map<number, string>();
	
	const leaveTypesRows = await db.select().from(leaveTypes);
		leaveTypesRows.forEach((lt) => {
		leaveTypesMap.set(lt.id, lt.typeName);
	});
		
	function getLeaveInfo(dateStr: string) {
		const date = dayjs(dateStr);
		for (const leave of approvedLeaves) {
			if (
				date.isSameOrAfter(dayjs(leave.startDate), 'day') &&
				date.isSameOrBefore(dayjs(leave.endDate), 'day')
			) {
				// ✅ Get leave type from map
				const leaveTypeName =
					typeof leave.leaveTypeID === 'number' ? leaveTypesMap.get(leave.leaveTypeID) : null;

				return {
					onLeave: true,
					halfDay: !!leave.halfDay,
					session: leave.halfDaySession ?? null,
					leaveType: leaveTypeName ?? 'Leave'
				};
			}
		}
		return { onLeave: false };
	}

	// --------------------
	// Build records
	// --------------------
	const records: any[] = [];

	let totalPresent = 0;
	let totalAbsent = 0;
	let totalOnLeave = 0;
	let totalAutoCompleted = 0;

	for (let i = 0; i < 30; i++) {
		const day = startDate.add(i, 'day');
		const dayStr = day.format('YYYY-MM-DD');

		// Skip weekends
		if (day.day() === 0 || day.day() === 6) continue;

		const att = attendanceRows.find((a) => dayjs(a.summaryDate).format('YYYY-MM-DD') === dayStr);

		const leaveInfo = getLeaveInfo(dayStr);

		const punchesForDay = punchRows.filter(
			(p) => dayjs(p.eventTime).format('YYYY-MM-DD') === dayStr
		);

		const checkInPunch = punchesForDay.find((p) => p.eventType === 'CheckIn');
		const checkOutPunch = punchesForDay.find((p) => p.eventType === 'CheckOut');

		function mapPunch(p: any) {
			if (!p) return null;
			let locationName = null;
			let inside = false;

			for (const geo of geofences) {
				const dist = haversineDistance(
					Number(p.locationLat),
					Number(p.locationLng),
					Number(geo.latitude),
					Number(geo.longitude)
				);
				if (dist <= geo.radiusMeters) {
					locationName = geo.name;
					inside = true;
					break;
				}
			}

			return {
				lat: p.locationLat,
				lng: p.locationLng,
				isInsideGeofence: inside,
				locationName
			};
		}

		const record: any = {
			summaryDate: dayStr,
			checkInTime: att?.checkInTime ?? null,
			checkOutTime: att?.checkOutTime ?? null,
			workedHours: Number(att?.workedHours ?? 0),
			checkInLocation: mapPunch(checkInPunch),
			checkOutLocation: mapPunch(checkOutPunch),
			autoPunchedOut: att?.autoPunchedOut ?? false,
			autoPunchedOutReason: att?.autoPunchedOutReason ?? null,
			autoPunchedOutReasonRequired: att?.autoPunchedOutReasonRequired ?? false,
			remarks: att?.autoPunchedOutReason ?? null,
			onLeave: leaveInfo.onLeave,
			leaveType: leaveInfo.leaveType ?? null,
			halfDayLeave: leaveInfo.halfDay,
			leaveSession: leaveInfo.session,
			status: att?.status || 'Absent'
		};

		// Status + counters
		if (leaveInfo.onLeave) {
			record.status = leaveInfo.halfDay
				? `Half Day Leave (${leaveInfo.session || 'AM'})`
				: 'On Leave';
			totalOnLeave++;
		} else if (checkInPunch && checkOutPunch) {
			record.status = 'Present';
			totalPresent++;
		} else if (checkInPunch && !checkOutPunch) {
			record.status = record.autoPunchedOut ? 'Auto-Complete' : 'Incomplete';
			totalPresent++;
		} else {
			record.status = 'Absent';
			totalAbsent++;
		}

		if (record.autoPunchedOut) {
			totalAutoCompleted++;
		}

		records.push(record);
	}

	// --------------------
	// Average hours (worked days only)
	// --------------------
	const workedDays = records.filter((r) => r.workedHours > 0);
	const avgHours =
		workedDays.length > 0
			? (workedDays.reduce((sum, r) => sum + r.workedHours, 0) / workedDays.length).toFixed(2)
			: 0;

	return json({
		summary: {
			totalDays: records.length,
			present: totalPresent,
			absent: totalAbsent,
			onLeave: totalOnLeave,
			autoCompleted: totalAutoCompleted,
			avgHours
		},
		records
	});
}
