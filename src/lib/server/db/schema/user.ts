import { pgTable, serial, varchar, boolean, timestamp, integer, text } from 'drizzle-orm/pg-core';
import { roleEnum, statusEnum } from './enums';

export const users = pgTable('users', {
	id: serial('id').primaryKey(),
	username: varchar('username', { length: 50 }).notNull().unique(),
	name: text('name'),
	email: varchar('email', { length: 100 }).unique().notNull(),
	passwordHash: varchar('password_hash', { length: 255 }).notNull(),
	mustChangePassword: boolean('must_change_password').default(true),
	role: roleEnum('role').default('Employee').notNull(),
	status: statusEnum('status').default('Active'),
	lastLoginAt: timestamp('last_login_at'),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at'),
	failedLoginAttempts: integer().default(0),
	lockedUntil: timestamp(),
	resetToken: varchar('reset_token', { length: 255 }),
	resetTokenExpiresAt: timestamp('reset_token_expires_at')
});

export type users = typeof users.$inferSelect;
