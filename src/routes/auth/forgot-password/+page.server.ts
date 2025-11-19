import { db } from '$lib/server/db';
import { users, auditLogs, employees } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import { fail, type Actions } from '@sveltejs/kit';
import nodemailer from 'nodemailer';

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SITE_URL, EMAIL_FROM } =
	process.env;

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !SITE_URL || !EMAIL_FROM) {
	// In dev you may allow missing SMTP to continue (so it doesn't crash), but in production throw.
	console.warn('Email env vars are not fully set. Emails will fail until configured.');
}

// create transporter (reuse in server runtime)
const transporter = nodemailer.createTransport({
	host: SMTP_HOST,
	port: Number(SMTP_PORT || 587),
	secure: SMTP_SECURE === 'true' || SMTP_SECURE === '1' || false,
	auth: {
		user: SMTP_USER,
		pass: SMTP_PASS
	}
});

export const actions: Actions = {
	default: async (event) => {
		try {
			const formData = await event.request.formData();
			const email = formData.get('email')?.toString().trim();
			const username = formData.get('username')?.toString().trim();

			if (!email || !username) {
				return fail(400, { message: 'Email and username are required.' });
			}

			// Find matching user
			const result = await db
				.select()
				.from(users)
				.where(and(eq(users.email, email), eq(users.username, username)));

			const user = result.at(0);
			if (!user) {
				// Don't reveal which part failed in prod; OK to be explicit in dev
				return fail(404, { message: 'No user found with that email and username.' });
			}

			// Throttle: if reset token exists and not expired
			if (user.resetToken && user.resetTokenExpiresAt && user.resetTokenExpiresAt > new Date()) {
				return fail(429, { message: 'Password reset already requested. Try again later.' });
			}

			// Generate secure token (plain to send to user)
			const tokenPlain = crypto.randomBytes(32).toString('hex');

			// Hash token for storage (recommended)
			const tokenHash = crypto.createHash('sha256').update(tokenPlain).digest('hex');

			const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

			// Update user with new token
			await db
				.update(users)
				.set({
					resetToken: tokenHash,
					resetTokenExpiresAt: expiry
				})
				.where(eq(users.id, user.id));

			const employeeRecord = await db
				.select()
				.from(employees)
				.where(eq(employees.userId, user.id))
				.then((rows) => rows[0]);

			const employeeId = employeeRecord?.id;

			await db.insert(auditLogs).values({
				userID: user.id,
				employeeID: employeeId,
				actionType: 'FORGOT PASSWORD',
				action: 'Password Reset Requested',
				targetTable: 'users',
				targetID: user.id, // target is the user table, so use user.id
				details: `User ${user.username} requested a password reset.`,
				isUserVisible: false
			});

			// Normally you'd send an email here
			//console.log(`🔗 Password reset link: http://localhost:5173/reset-password/${tokenPlain}`);

			// Build reset URL (use query param token=...)
			const siteUrl = process.env.SITE_URL!;
			const resetUrl = `${siteUrl}/reset-password?token=${tokenPlain}`;

			// Send email (wrap in try/catch so DB update + audit are not lost if email fails)
			try {
				// Prepare message
				const mailOptions = {
					from: EMAIL_FROM,
					to: user.email,
					subject: 'Password reset request',
					text: `You (or someone) requested a password reset for your account. Use this link to reset your password (expires in 15 minutes):\n\n${resetUrl}\n\nIf you didn't request this, ignore this email.`,
					html: `<p>You (or someone) requested a password reset for your account. Use the link below to reset your password (expires in 15 minutes):</p>
                 <p><a href="${resetUrl}">Reset password</a></p>
                 <p>If you didn't request this, ignore this email.</p>`
				};

				await transporter.sendMail(mailOptions);

				// In dev you might want to log the token once; **do not** do this in production
				if (process.env.NODE_ENV !== 'production') {
					console.log(`🔗 Password reset link: ${resetUrl}`);
				}
			} catch (mailErr) {
				console.error('Failed to send reset email:', mailErr);
				// Option: return an error to the user or treat as success but warn admins.
				// For security, it's common to still return a generic success message so attackers cannot enumerate emails.
				return {
					success: true,
					message:
						'Password reset requested. We were unable to send email right now; try again later.'
				};
			}

			return { success: true, message: 'Password reset link sent (check your email).' };
		} catch (err) {
			console.error('❌ Forgot password error:', err);
			return fail(500, { message: 'Internal server error.' });
		}
	}
};
