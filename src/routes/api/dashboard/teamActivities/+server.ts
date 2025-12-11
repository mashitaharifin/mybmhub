import type { RequestHandler } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm'; // Added 'eq' import
import { db } from '$lib/server/db';
import { auditLogs, leaveApplications, attendance, users, employees } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		// Fetch all employees' activities
		const logs = await db
			.select({
				id: auditLogs.id,
				employeeId: users.id,
				employeeName: users.name,
				actionType: auditLogs.actionType,
				action: auditLogs.action,
				details: auditLogs.details,
				createdAt: auditLogs.createdAt
			})
			.from(auditLogs)
			.innerJoin(users, eq(users.id, auditLogs.userID))
			.orderBy(desc(auditLogs.createdAt))
			.limit(20);

		const leaves = await db
			.select({
				id: leaveApplications.id,
				employeeId: users.id,
				employeeName: users.name,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate,
				status: leaveApplications.status,
				applicationDate: leaveApplications.applicationDate,
				reason: leaveApplications.reason
			})
			.from(leaveApplications)
			.innerJoin(users, eq(users.id, leaveApplications.userID))
			.orderBy(desc(leaveApplications.applicationDate))
			.limit(20);

		const atts = await db
			.select({
				id: attendance.id,
				employeeId: users.id,
				employeeName: users.name,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours
			})
			.from(attendance)
			.innerJoin(users, eq(users.id, attendance.userID))
			.orderBy(desc(attendance.summaryDate))
			.limit(20);

		type TeamActivityItem = {
			type: 'attendance' | 'leave' | 'notification';
			id: number;
			employeeId: string;
			employeeName: string;
			title: string;
			details: string;
			timestamp: string;
		};

		const activityItems: TeamActivityItem[] = [];

		// 🕒 Attendance
		for (const a of atts) {
			const inTime = a.checkInTime ? new Date(a.checkInTime) : null;
			const outTime = a.checkOutTime ? new Date(a.checkOutTime) : null;
			const day = new Date(a.summaryDate).toLocaleDateString('en-MY', {
				day: '2-digit',
				month: 'short'
			});

			const employeeId = a.employeeId?.toString() || 'unknown';
			const employeeName = a.employeeName || 'Unknown Employee';

			if (inTime) {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					employeeId,
					employeeName,
					title: 'Attendance',
					details: `${employeeName} punched in at ${inTime.toLocaleTimeString('en-MY', {
						hour: '2-digit',
						minute: '2-digit'
					})}`,
					timestamp: inTime.toISOString()
				});
			}

			if (outTime) {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					employeeId,
					employeeName,
					title: 'Attendance',
					details: `${employeeName} punched out at ${outTime.toLocaleTimeString('en-MY', {
						hour: '2-digit',
						minute: '2-digit'
					})}`,
					timestamp: outTime.toISOString()
				});
			}

			// Add summary if no punch times but has worked hours
			if (!inTime && !outTime && a.workedHours) {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					employeeId,
					employeeName,
					title: 'Attendance',
					details: `${employeeName} worked ${a.workedHours} hours on ${day}`,
					timestamp: new Date(a.summaryDate).toISOString()
				});
			}
		}

		// 🌴 Leave applications
		for (const l of leaves) {
			const start = new Date(l.startDate).toLocaleDateString('en-MY', {
				day: '2-digit',
				month: 'short'
			});
			const end = new Date(l.endDate).toLocaleDateString('en-MY', {
				day: '2-digit',
				month: 'short'
			});
			const ts = l.applicationDate
				? new Date(l.applicationDate).toISOString()
				: new Date().toISOString();

			const employeeId = l.employeeId?.toString() || 'unknown';
			const employeeName = l.employeeName || 'Unknown Employee';

			let statusText = '';
			switch (l.status) {
				case 'Approved':
					statusText = 'Leave approved';
					break;
				case 'Rejected':
					statusText = 'Leave rejected';
					break;
				case 'Pending':
					statusText = 'Leave requested';
					break;
				case 'Cancelled':
					statusText = 'Leave cancelled';
					break;
				default:
					statusText = 'Leave request submitted';
			}

			activityItems.push({
				type: 'leave',
				id: l.id,
				employeeId,
				employeeName,
				title: 'Leave',
				details: `${employeeName}: ${statusText} (${start}–${end})`,
				timestamp: ts
			});
		}

		// 🔔 Notifications (Audit logs)
		for (const log of logs) {
			if (!log.actionType || log.actionType.toLowerCase().includes('system')) continue;

			const employeeId = log.employeeId?.toString() || 'unknown';
			const employeeName = log.employeeName || 'Unknown Employee';

			activityItems.push({
				type: 'notification',
				id: log.id,
				employeeId,
				employeeName,
				title: log.actionType,
				details: `${employeeName}: ${log.details || log.action || 'Activity recorded'}`,
				timestamp: new Date(log.createdAt ?? Date.now()).toISOString()
			});
		}

		// Sort by timestamp (newest first) and limit to 15 items
		const merged = activityItems
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 5);

		return new Response(JSON.stringify({ data: merged }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Team activities GET error:', error);
		return new Response(JSON.stringify({ error: 'Failed to fetch team activities' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
