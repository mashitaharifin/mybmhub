import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, employees, auditLogs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Helper: get authenticated user
async function getUserFromLocals(locals: App.Locals) {
	if (!locals.user) return null;
	return locals.user;
}

function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

export const GET: RequestHandler = async ({ locals }) => {
	const user = await getUserFromLocals(locals);
	if (!user) {
		return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
	}

	// Fetch profile joined data (similar to your page.server.ts logic)
	const record = await db
		.select({
			userId: users.id,
			username: users.username,
			email: users.email,
			status: users.status,
			name: employees.name,
			department: employees.departmentId,
			jobTitle: employees.jobTitle,
			employmentType: employees.empType,
			joinDate: employees.dateOfJoining,
			phone: employees.phoneNumber,
			address: employees.address,
			avatarUrl: employees.avatarUrl
		})
		.from(users)
		.leftJoin(employees, eq(users.id, employees.userId))
		.where(eq(users.id, user.id))
		.limit(1);

	if (!record || record.length === 0) {
		return jsonResponse({ success: false, message: 'User not found' }, 404);
	}

	const data = record[0];

	return jsonResponse({
		success: true,
		data: {
			id: data.userId,
			username: data.username,
			name: data.name,
			email: data.email,
			phone: data.phone,
			address: data.address,
			department: data.department,
			jobTitle: data.jobTitle,
			employmentType: data.employmentType,
			joinDate: data.joinDate,
			avatarUrl: data.avatarUrl,
			status: data.status
		}
	});
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const user = await getUserFromLocals(locals);
	if (!user) return jsonResponse({ success: false, message: 'Unauthorized' }, 401);

	const payload = await request.json();
	const { name, email, phone, address } = payload ?? {};

	// Input validation
	if (!name || typeof name !== 'string' || name.length < 2) {
		return jsonResponse({ success: false, message: 'Name must be at least 2 characters.' }, 400);
	}

	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!email || !emailRegex.test(email)) {
		return jsonResponse({ success: false, message: 'Invalid email format' }, 400);
	}

	const phoneRegex = /^[0-9]{7,15}$/;
	if (phone && !phoneRegex.test(phone)) {
		return jsonResponse({ success: false, message: 'Invalid phone number format' }, 400);
	}

	// --- Check email uniqueness ---
	const existingEmail = await db.query.users.findFirst({
		where: eq(users.email, email)
	});
	if (existingEmail && existingEmail.id !== user.id) {
		return jsonResponse(
			{ success: false, message: 'Email already in use by another account.' },
			400
		);
	}

	try {
		// Fetch current values for audit log
		const currentUser = await db.query.users.findFirst({ where: eq(users.id, user.id) });
		const currentEmployee = await db.query.employees.findFirst({
			where: eq(employees.userId, user.id)
		});
		// Update users, employees and auditLogs tables
		await db
			.update(users)
			.set({
				name,
				email,
				updatedAt: new Date()
			})
			.where(eq(users.id, user.id));

		await db
			.update(employees)
			.set({
				phoneNumber: phone,
				address,
				updatedAt: new Date()
			})
			.where(eq(employees.userId, user.id));

		const oldData = {
			name: currentUser?.name,
			email: currentUser?.email,
			phone: currentEmployee?.phoneNumber,
			address: currentEmployee?.address
		};
		const newData = { name, email, phone, address };

		const changedFields = Object.keys(newData).filter(
			(key) => oldData[key as keyof typeof oldData] !== newData[key as keyof typeof newData]
		);

		const summary =
			changedFields.length > 0
				? changedFields
						.map((key) => {
							const label = key.charAt(0).toUpperCase() + key.slice(1);
							return `${label} changed from "${oldData[key as keyof typeof oldData] ?? '—'}" to "${
								newData[key as keyof typeof newData] ?? '—'
							}"`;
						})
						.join(', ')
				: 'No visible changes detected';

		// fetch employee record (the subject)
		const employeeRecord = await db.query.employees.findFirst({
			where: eq(employees.userId, user.id)
		});

		// fallback: if somehow missing, set to null
		const employeeId = employeeRecord?.id ?? null;

		await db.insert(auditLogs).values({
			userID: user.id,
			employeeID: employeeId,
			actionType: 'UPDATE',
			action: 'Updated personal information',
			targetTable: 'employees',
			targetID: employeeId,
			details: summary,
			isUserVisible: true,
			createdAt: new Date()
		});

		return jsonResponse({ success: true, message: 'Profile updated successfully.' }, 200);
	} catch (err) {
		console.error('Profile update error:', err);
		return jsonResponse({ success: false, message: 'Failed to update profile.' }, 500);
	}
};
