import { pgTable, serial, integer, date, decimal, timestamp, boolean, varchar, text } from 'drizzle-orm/pg-core';
import { users } from './user';
import { attendanceStatusEnum } from './enums';

export const attendance = pgTable('attendance', {
	id: serial('id').primaryKey(),
	userID: integer('user_id')
		.references(() => users.id)
		.notNull(),
	summaryDate: date('summary_date').notNull(),
	checkInTime: timestamp('check_in_time'),
	checkOutTime: timestamp('check_out_time'),
	totalHours: decimal('total_hours', { precision: 5, scale: 2 }),
	workedHours: decimal('worked_hours', { precision: 5, scale: 2 }),
	isModified: integer('is_modified').default(0),
	autoPunchedOut: boolean('auto_punched_out').default(false),
	autoPunchedOutReasonRequired: boolean('auto_punched_out_reason_required')
		.default(false)
		.notNull(),
	autoPunchedOutReason: text('auto_punched_out_reason'),
	attendanceStatus: attendanceStatusEnum('attendance_status').notNull().default('present'),
	lateMinutes: integer('late_minutes').default(0),
	workingHoursKey: varchar('working_hours_key', { length: 100 }),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
});

export type Attendance = typeof attendance.$inferSelect;
