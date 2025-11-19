import {
	pgTable,
	serial,
	integer,
	date,
	boolean,
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
	managerRemark: text('manager_remark'),
	applicationDate: timestamp('application_date').defaultNow(),
	approvalDate: timestamp('approval_date'),
	cancelledBy: integer('cancelled_by').references(() => users.id),
	cancelledDate: timestamp('cancelled_date'),
	updatedAt: timestamp('updated_at')
});

export type LeaveApplication = typeof leaveApplications.$inferSelect;
