// src/routes/api/leave/apply/+server.ts
import fs from 'fs';
import path from 'path';
import { json } from '@sveltejs/kit';
import { applyLeave } from '$lib/server/leave/leaveService';
import { calculateLeaveDays } from '$lib/server/leave/calculateLeaveDays';
import { notifyManagerLeaveSubmitted } from '$lib/server/notifications/leave';
import { employees, leaveTypes } from '$lib/server/db/schema';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';

async function getEmployeeName(userId: number): Promise<string> {
	const rows = await db
		.select({ name: employees.name })
		.from(employees)
		.where(eq(employees.userId, userId));

	return rows[0]?.name ?? 'Employee';
}

async function getLeaveTypeName(leaveTypeID: number): Promise<string> {
	const rows = await db
		.select({ name: leaveTypes.typeName })
		.from(leaveTypes)
		.where(eq(leaveTypes.id, leaveTypeID));

	return rows[0]?.name ?? 'Leave';
}

export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user) return json({ success: false, error: 'Unauthorized' }, { status: 401 });

	const formData = await request.formData();
	const leaveTypeID = Number(formData.get('leaveTypeID'));
	const startDateStr = formData.get('startDate')?.toString();
	const endDateStr = formData.get('endDate')?.toString();
	const halfDay = formData.get('halfDay') === 'true';
	const halfDaySessionRaw = formData.get('halfDaySession')?.toString();
	const reason = formData.get('reason')?.toString() ?? '';
	const docFile = formData.get('docImg'); // may be File or null

	if (!leaveTypeID || !startDateStr || !endDateStr) {
		return json({ success: false, error: 'Missing required fields' }, { status: 400 });
	}

	// ---------------------------
	// Parse dates
	// ---------------------------
	const startDate = new Date(startDateStr);
	const endDate = new Date(endDateStr);
	if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
		return json({ success: false, error: 'Invalid dates' }, { status: 400 });
	}

	// ---------------------------
	// Map halfDaySession to enum type
	// ---------------------------
	let halfDaySession: 'Morning' | 'Afternoon' | undefined = undefined;
	if (halfDaySessionRaw === 'AM' || halfDaySessionRaw === 'Morning') {
		halfDaySession = 'Morning';
	} else if (halfDaySessionRaw === 'PM' || halfDaySessionRaw === 'Afternoon') {
		halfDaySession = 'Afternoon';
	}

	// ---------------------------
	// Handle optional file upload
	// ---------------------------
	let savedDocPath: string | undefined = undefined;
	if (docFile && typeof (docFile as any).name === 'string') {
		try {
			const file: any = docFile; // File-like
			const uploadsDir = path.join(process.cwd(), 'static', 'uploads');

			// ensure directory exists
			if (!fs.existsSync(uploadsDir)) {
				fs.mkdirSync(uploadsDir, { recursive: true });
			}

			const safeName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
			const filePath = path.join(uploadsDir, safeName);

			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);
			await fs.promises.writeFile(filePath, buffer);

			// path to store in DB (public URL path)
			savedDocPath = `/uploads/${safeName}`;
		} catch (err) {
			console.error('File save error', err);
			return json({ success: false, error: 'Failed to save attachment' }, { status: 500 });
		}
	}

	// ---------------------------
	// Calculate leave duration (server-side)
	// ---------------------------
	let duration = 0;
	try {
		duration = await calculateLeaveDays(startDate, endDate, halfDay);
	} catch (err) {
		console.error('Error calculating leave days:', err);
		return json({ success: false, error: 'Failed to calculate leave duration' }, { status: 500 });
	}

	// ---------------------------
	// Call leave service and save leave
	// ---------------------------
	try {
		const application = await applyLeave({
			userId: user.id,
			leaveTypeID,
			startDate,
			endDate,
			reason,
			halfDay,
			halfDaySession,
			docImg: savedDocPath
		});

		// Safety check for leaveTypeID
		if (!application.leaveTypeID) {
			throw new Error('Invalid leave type ID in application');
		}

		// Fetch employee name and leave type name
		const employeeName = await getEmployeeName(user.id);
		const leaveType = await getLeaveTypeName(application.leaveTypeID!);

		// Notify manager after leave is submitted
		await notifyManagerLeaveSubmitted({
			employeeId: user.id,
			employeeName,
			leaveType,
			startDate: application.startDate,
			endDate: application.endDate,
			durationDays: duration,
			leaveId: application.id
		});

		return json({ success: true, data: { id: application.id, duration } });
	} catch (err: any) {
		console.error('applyLeave error', err);
		return json(
			{ success: false, error: err?.message || 'Failed to apply leave' },
			{ status: 400 }
		);
	}
}
