import { pgTable, integer, timestamp, text } from 'drizzle-orm/pg-core';
import { users } from './user';

export const sessions = pgTable('sessions', {
	id: text('id').primaryKey(), // keep session ID as text (token-based)
	userId: integer('user_id')
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	createdAt: timestamp('created_at').defaultNow()
});

export type Session = typeof sessions.$inferSelect;