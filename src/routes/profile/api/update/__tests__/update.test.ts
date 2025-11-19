import { describe, it, expect, beforeEach } from 'vitest';
import { PATCH as updateProfile } from '../+server';
import { db } from '$lib/server/db';
import { users, employees } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import argon2 from 'argon2';

describe('PATCH /profile/api/update', () => {
	let testUser: { id: number };

	beforeEach(async () => {
		// Clean up previous test data
		await db.delete(employees).where(eq(employees.userId, 9999));
		await db.delete(users).where(eq(users.id, 9999));

		const hash = await argon2.hash('OldPass123!');

		// Seed a test user
		const [user] = await db
			.insert(users)
			.values({
				id: 9999,
				username: 'testuser',
				email: 'test@example.com',
				passwordHash: hash,
				status: 'Active'
			})
			.returning({ id: users.id });

		// Insert employee record
		const dateOfJoining = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
		await db.insert(employees).values({
			userId: user.id,
			name: 'Test User',
			departmentId: 1,
			jobTitle: 'Tester',
			empType: 'Intern',
			dateOfJoining,
			phoneNumber: '1234567890',
			address: '123 Test St'
		});

		testUser = { id: user.id };
	});

	it('rejects missing email', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({ name: 'New Name' }),
				headers: { 'Content-Type': 'application/json' }
			}),
			locals: { user: testUser }
		};

		const response = await updateProfile(event as any);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
		expect(body.message).toMatch(/email/i);
	});

	it('rejects invalid phone number', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({ name: 'New Name', email: 'a@b.com', phoneNumber: 'abc123' }),
				headers: { 'Content-Type': 'application/json' }
			}),
			locals: { user: testUser }
		};

		const response = await updateProfile(event as any);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(400);
		expect(body.success).toBe(false);
	});

	it('updates successfully with valid data', async () => {
		const event = {
			request: new Request('', {
				method: 'PATCH',
				body: JSON.stringify({
					name: 'Updated Name',
					email: 'update@example.com',
					phoneNumber: '1234567890',
					address: 'Updated Address'
				}),
				headers: { 'Content-Type': 'application/json' }
			}),
			locals: { user: testUser }
		};

		const response = await updateProfile(event as any);
		const body = JSON.parse(await response.text());

		expect(response.status).toBe(200);
		expect(body.success).toBe(true);
	});
});
