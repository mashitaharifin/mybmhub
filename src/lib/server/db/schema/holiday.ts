import { pgTable, serial, varchar, boolean, date, timestamp } from 'drizzle-orm/pg-core';

export const holidays = pgTable('holidays', {
	id: serial('id').primaryKey(),
	holidayName: varchar('holiday_name', { length: 100 }).notNull(),
	startDate: date('start_date').notNull(),
	endDate: date('end_date'),
	isRecurring: boolean('is_recurring').default(false),
	type: varchar('type', { length: 50 }),
	createdAt: timestamp('created_at').defaultNow()
});

export type Holiday = typeof holidays.$inferSelect;
