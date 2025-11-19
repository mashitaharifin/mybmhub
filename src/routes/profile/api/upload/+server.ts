import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { employees, auditLogs } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

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

export const POST: RequestHandler = async ({ request, locals }) => {
	const user = await getUserFromLocals(locals);
	if (!user) return jsonResponse({ success: false, message: 'Unauthorized' }, 401);

	const formData = await request.formData();
	const file = formData.get('avatar') as unknown as File;

	if (!file || (file as any).size === 0) {
		return jsonResponse({ success: false, message: 'No file uploaded' }, 400);
	}

	// Basic file type & size validation (example: max 5MB)
	const maxBytes = 5 * 1024 * 1024;
	if ((file as any).size > maxBytes) {
		return jsonResponse({ success: false, message: 'File too large (max 5MB).' }, 400);
	}

	// Generate safe filename
	const ext = path.extname((file as any).name) || '.jpg';
	const filename = `avatar_${user.id}_${randomUUID()}${ext}`;
	const uploadDir = path.resolve('./static/uploads/avatars'); // adjust as needed

	try {
		// Ensure dir exists
		if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

		const arrayBuffer = await (file as any).arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const filePath = path.join(uploadDir, filename);
		fs.writeFileSync(filePath, buffer);

		const publicUrl = `/uploads/avatars/${filename}`;

		// Update user's avatarUrl in employees table
		const [employee] = await db
			.update(employees)
			.set({ avatarUrl: publicUrl, updatedAt: new Date() })
			.where(eq(employees.userId, user.id));

		// fetch employee record
		const employeeRecord = await db.query.employees.findFirst({
			where: eq(employees.userId, user.id)
		});
		const employeeId = employeeRecord?.id ?? null;

		// Audit log for upload
		await db.insert(auditLogs).values({
			userID: user.id,
			employeeID: employeeId,
			actionType: 'UPLOAD AVATAR',
			action: 'Updated profile avatar',
			targetTable: 'employees',
			targetID: employeeId,
			details: `Profile avatar changed to ${publicUrl}`,
			isUserVisible: true,
			createdAt: new Date()
		});

		return jsonResponse(
			{ success: true, data: { url: publicUrl }, message: 'Upload successful' },
			200
		);
	} catch (err) {
		console.error('Avatar upload error:', err);
		return jsonResponse({ success: false, message: 'Failed to upload avatar.' }, 500);
	}
};
