import { pgTable, serial, integer, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './user';
import { leaveApplications } from './leaveApplication';
import { notificationTypeEnum } from './enums';

export const notifications = pgTable('notifications', {
	id: serial('id').primaryKey(),
	recipientID: integer('recipient_id').references(() => users.id),
	title: varchar('title', { length: 100 }),
	message: text('message'),
	type: notificationTypeEnum('type'),
	relatedLeaveID: integer('related_leave_id').references(() => leaveApplications.id),
	triggerDate: timestamp('trigger_date'),
	sentAt: timestamp('sent_at'),
	sentInApp: boolean('sent_in_app').default(false),
	sentEmail: boolean('sent_email').default(false),
	isRead: boolean('is_read').default(false),
	createdAt: timestamp('created_at').defaultNow()
});

export type Notification = typeof notifications.$inferSelect;
