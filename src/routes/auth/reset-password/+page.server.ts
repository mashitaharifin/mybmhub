import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq, and, gte } from 'drizzle-orm';
import { fail, type Actions } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';

export const actions: Actions = {
	default: async (event) => {
		try {
			const formData = await event.request.formData();
			const token = formData.get('token')?.toString().trim();
			const newPassword = formData.get('newPassword')?.toString().trim();

			if (!token || !newPassword) {
				return fail(400, { message: 'Token and new password are required.' });
			}

			if (newPassword.length < 6) {
				return fail(400, { message: 'Password must be at least 6 characters long.' });
			}

			// Find user with valid (non-expired) token
			const result = await db
				.select()
				.from(users)
				.where(and(eq(users.resetToken, token), gte(users.resetTokenExpiresAt, new Date())));

			const user = result.at(0);
			if (!user) {
				return fail(400, { message: 'Invalid or expired reset token.' });
			}

			// 🔐 Hash password using Argon2
			const passwordHash = await hash(newPassword, {
				memoryCost: 19456,
				timeCost: 2,
				outputLen: 32,
				parallelism: 1
			});

			// Update user record and clear reset token
			await db
				.update(users)
				.set({
					passwordHash,
					resetToken: null,
					resetTokenExpiresAt: null
				})
				.where(eq(users.id, user.id));

			return {
				success: true,
				message: 'Password successfully reset. You can now log in.'
			};
		} catch (err) {
			console.error('❌ Reset password error:', err);
			return fail(500, { message: 'Internal server error.' });
		}
	}
};
