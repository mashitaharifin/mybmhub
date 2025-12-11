import { pgTable, serial, integer, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';
import { attendance } from './attendance';

export const lateExplanations = pgTable('late_explanations', {
	id: serial('id').primaryKey(),
	attendanceID: integer('attendance_id')
		.references(() => attendance.id)
		.notNull(),
	userID: integer('user_id')
		.references(() => users.id)
		.notNull(),
	reasonKey: varchar('reason_key', { length: 100 }).notNull(),
	notes: text('notes'),
	createdAt: timestamp('created_at').defaultNow()
});

export type LateExplanation = typeof lateExplanations.$inferSelect;
export type NewLateExplanation = typeof lateExplanations.$inferInsert;
