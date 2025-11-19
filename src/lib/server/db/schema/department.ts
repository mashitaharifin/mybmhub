import { pgTable, serial, timestamp, varchar, text } from 'drizzle-orm/pg-core';

export const departments = pgTable('departments', {
	id: serial('id').primaryKey(),
	deptName: varchar('dept_name', { length: 100 }).unique().notNull(),
	description: text('description'),
	createdAt: timestamp('created_at').defaultNow()
});

export type Department = typeof departments.$inferSelect;
