import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { users, auditLogs, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

function jsonResponse(data: any, status = 200) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

// Helper: Get user from locals (assuming authentication middleware sets locals.user)
async function getUserFromLocals(locals: App.Locals) {
	return locals.user ?? null;
}

export const PATCH: RequestHandler = async ({ request, locals }) => {
	const user = await getUserFromLocals(locals);
	if (!user) {
		return jsonResponse({ success: false, message: 'Unauthorized' }, 401);
	}

	const { currentPassword, newPassword, confirmPassword } = await request.json();

	// Input validation
	if (!currentPassword || !newPassword || !confirmPassword) {
		return jsonResponse({ success: false, message: 'All fields are required.' }, 400);
	}

	if (newPassword !== confirmPassword) {
		return jsonResponse({ success: false, message: 'Passwords do not match.' }, 400);
	}

	// Password policy (min 8 chars, 1 uppercase, 1 digit, 1 special)
	const pwdPolicy = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
	if (!pwdPolicy.test(newPassword)) {
		return jsonResponse(
			{
				success: false,
				message:
					'New password must be at least 8 characters, including 1 uppercase letter, 1 number, and 1 special symbol.'
			},
			400
		);
	}

	// Fetch existing user
	const existingUser = await db.query.users.findFirst({
		where: eq(users.id, user.id)
	});

	if (!existingUser) {
		return jsonResponse({ success: false, message: 'User not found.' }, 404);
	}

	// Verify current password
	const validPassword = await argon2.verify(existingUser.passwordHash, currentPassword);
	if (!validPassword) {
		return jsonResponse({ success: false, message: 'Current password incorrect.' }, 400);
	}

	// Prevent using same password
	const isSameAsOld = await argon2.verify(existingUser.passwordHash, newPassword);
	if (isSameAsOld) {
		return jsonResponse(
			{ success: false, message: 'New password cannot be the same as current.' },
			400
		);
	}

	// Hash new password
	const newHash = await argon2.hash(newPassword);

	// Update user password
	await db
		.update(users)
		.set({ passwordHash: newHash, mustChangePassword: false })
		.where(eq(users.id, user.id));

	const employee = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);
	
		// Log audit record
	await db.insert(auditLogs).values({
		userID: user.id,
		employeeID: employee[0]?.id ?? null,
		actionType: 'UPDATE',
		action: 'Password Updated',
		targetTable: 'employees',
		targetID: employee[0]?.id ?? null,
		details: 'Password updated (hidden for security)',
		isUserVisible: true,
		createdAt: new Date()
	});

	return jsonResponse({ success: true, message: 'Password updated successfully.' }, 200);
};
