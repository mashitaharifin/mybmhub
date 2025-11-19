import { describe, it, expect, beforeEach } from 'vitest';
import { PATCH as changePassword } from '../+server';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

describe('PATCH /profile/api/password', () => {
	let testUser: { id: number; passwordHash: string };

	beforeEach(async () => {
		// Clean up
		await db.delete(users).where(eq(users.id, 9999));

		// Seed user
		const hash = await argon2.hash('OldPass123!');
		const [user] = await db
			.insert(users)
			.values({
				username: 'testuser',
				email: 'test@example.com',
				passwordHash: hash,
				status: 'Active'
			})
			.returning({ id: users.id });

		testUser = { id: user.id, passwordHash: hash };
	});

	it('rejects empty fields', async () => {
		const event = {
			request: new Request('', { method: 'PATCH', body: '{}' }),
			locals: { user: testUser }
		};
		const response = await changePassword(event as any);
		const body = JSON.parse(await response.text());
		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});

	it('rejects mismatched new passwords', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({
					currentPassword: 'OldPass123!',
					newPassword: 'NewPass123!',
					confirmPassword: 'Mismatch123!'
				})
			}),
			locals: { user: testUser }
		};
		const response = await changePassword(event as any);
		const body = JSON.parse(await response.text());
		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});

	it('rejects weak password', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({
					currentPassword: 'OldPass123!',
					newPassword: 'weak',
					confirmPassword: 'weak'
				})
			}),
			locals: { user: testUser }
		};
		const response = await changePassword(event as any);
		const body = JSON.parse(await response.text());
		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});

	it('rejects same as old password', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({
					currentPassword: 'OldPass123!',
					newPassword: 'OldPass123!',
					confirmPassword: 'OldPass123!'
				})
			}),
			locals: { user: testUser }
		};
		const response = await changePassword(event as any);
		const body = JSON.parse(await response.text());
		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});
});
