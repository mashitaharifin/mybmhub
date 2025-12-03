import {
	pgTable,
	serial,
	integer,
	date,
	boolean,
	decimal,
	varchar,
	text,
	timestamp
} from 'drizzle-orm/pg-core';
import { users } from './user';
import { leaveTypes } from './leaveType';
import { leaveStatusEnum, halfDaySessionEnum } from './enums';

export const leaveApplications = pgTable('leave_applications', {
	id: serial('id').primaryKey(),
	userID: integer('user_id').references(() => users.id),
	leaveTypeID: integer('leave_type_id').references(() => leaveTypes.id),
	startDate: date('start_date').notNull(),
	endDate: date('end_date').notNull(),
	halfDay: boolean('half_day').default(false),
	halfDaySession: halfDaySessionEnum('half_day_session'),
	reason: text('reason'),
	docImg: varchar('doc_img', { length: 255 }),
	status: leaveStatusEnum('status').default('Pending'),
	duration: decimal('duration', { precision: 5, scale: 2 }).notNull(),
	year: integer('year').notNull(),
	managerRemark: text('manager_remark'),
	applicationDate: timestamp('application_date').defaultNow(),
	approvedBy: integer('approved_by').references(() => users.id),
	approvalDate: timestamp('approval_date'),
	rejectedBy: integer('rejected_by').references(() => users.id),
	rejectedDate: timestamp('rejected_date'),
	cancelledBy: integer('cancelled_by').references(() => users.id),
	cancelledDate: timestamp('cancelled_date'),
	updatedAt: timestamp('updated_at')
});

export type LeaveApplication = typeof leaveApplications.$inferSelect;
