import { pgTable, serial, integer, date, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';

export const attendance = pgTable('attendance', {
	id: serial('id').primaryKey(),
	userID: integer('user_id')
		.references(() => users.id)
		.notNull(),
	summaryDate: date('summary_date').notNull(),
	checkInTime: timestamp('check_in_time'),
	checkOutTime: timestamp('check_out_time'),
	totalHours: decimal('total_hours', { precision: 5, scale: 2 }),
	breakHours: decimal('break_hours', { precision: 5, scale: 2 }),
	workedHours: decimal('worked_hours', { precision: 5, scale: 2 }),
	isModified: integer('is_modified').default(0), 
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
});

export type Attendance = typeof attendance.$inferSelect;
