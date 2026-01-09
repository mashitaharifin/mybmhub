import type { RequestHandler } from '@sveltejs/kit';
import { eq, desc } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { auditLogs, leaveApplications, attendance } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ locals }) => {
	try {
		const user = locals.user;
		if (!user) {
			return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
				status: 401,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const logs = await db
			.select({
				id: auditLogs.id,
				actionType: auditLogs.actionType,
				action: auditLogs.action,
				details: auditLogs.details,
				createdAt: auditLogs.createdAt
			})
			.from(auditLogs)
			.where(eq(auditLogs.userID, user.id))
			.orderBy(desc(auditLogs.createdAt))
			.limit(5);

		const leaves = await db
			.select({
				id: leaveApplications.id,
				startDate: leaveApplications.startDate,
				endDate: leaveApplications.endDate,
				status: leaveApplications.status,
				applicationDate: leaveApplications.applicationDate
			})
			.from(leaveApplications)
			.where(eq(leaveApplications.userID, user.id))
			.orderBy(desc(leaveApplications.applicationDate))
			.limit(5);

		const atts = await db
			.select({
				id: attendance.id,
				summaryDate: attendance.summaryDate,
				checkInTime: attendance.checkInTime,
				checkOutTime: attendance.checkOutTime,
				workedHours: attendance.workedHours
			})
			.from(attendance)
			.where(eq(attendance.userID, user.id))
			.orderBy(desc(attendance.summaryDate))
			.limit(5);

		type ActivityItem = {
			type: 'attendance' | 'leave' | 'notification';
			id: number;
			title: string;
			details: string;
			timestamp: string;
		};

		const activityItems: ActivityItem[] = [];

		// 🕒 Attendance (format readable time)
		for (const a of atts) {
			const inTime = a.checkInTime ? new Date(a.checkInTime) : null;
			const outTime = a.checkOutTime ? new Date(a.checkOutTime) : null;
			const day = new Date(a.summaryDate).toLocaleDateString('en-MY', {
				day: '2-digit',
				month: 'short'
			});

			if (inTime) {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					title: 'Attendance',
					details: `Punched in at ${inTime.toLocaleTimeString('en-MY', {
						hour: '2-digit',
						minute: '2-digit'
					})}`,
					timestamp: inTime.toISOString()
				});
			} else if (outTime) {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					title: 'Attendance',
					details: `Punched out at ${outTime.toLocaleTimeString('en-MY', {
						hour: '2-digit',
						minute: '2-digit'
					})}`,
					timestamp: outTime.toISOString()
				});
			} else {
				activityItems.push({
					type: 'attendance',
					id: a.id,
					title: 'Attendance',
					details: `Worked ${a.workedHours ?? '-'} hours on ${day}`,
					timestamp: new Date(a.summaryDate).toISOString()
				});
			}
		}

		// 🌴 Leave
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

			let statusText = '';
			switch (l.status) {
				case 'Approved':
					statusText = 'Leave approved by Manager';
					break;
				case 'Rejected':
					statusText = 'Leave rejected';
					break;
				default:
					statusText = 'Leave request submitted';
			}

			activityItems.push({
				type: 'leave',
				id: l.id,
				title: 'Leave',
				details: `${statusText} (${start}–${end})`,
				timestamp: ts
			});
		}

		// 🔔 Notifications (Audit)
		for (const log of logs) {
			if (!log.actionType || log.actionType.toLowerCase().includes('system')) continue; // skip system logs
			activityItems.push({
				type: 'notification',
				id: log.id,
				title: log.actionType,
				details: log.details || log.action || 'Activity recorded',
				timestamp: new Date(log.createdAt ?? Date.now()).toISOString()
			});
		}

		// Sort and limit to latest 5
		const merged = activityItems.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1)).slice(0, 5);

		return new Response(JSON.stringify({ success: true, data: merged }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('empActivity GET error:', error);
		return new Response(JSON.stringify({ success: false, error: 'Failed to fetch activities' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
};
