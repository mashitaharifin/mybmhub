import { pgTable, serial, integer, timestamp, decimal, text, boolean } from 'drizzle-orm/pg-core';
import { users } from './user';
import { punchEventEnum, sourceEnum, attendanceStatusEnum } from './enums';

export const punch = pgTable('punch', {
	id: serial('id').primaryKey(),
	userID: integer('user_id')
		.references(() => users.id)
		.notNull(),
	eventType: punchEventEnum('event_type').notNull(),
	eventTime: timestamp('event_time').notNull(),
	locationLat: decimal('location_lat', { precision: 10, scale: 6 }),
	locationLng: decimal('location_lng', { precision: 10, scale: 6 }),
	accuracyMeters: integer('accuracy_meters'),
	source: sourceEnum('source').default('Mobile'),
	notes: text('notes'),
	status: attendanceStatusEnum('attendance_status').notNull().default('present'),
	isAuto: boolean('is_auto').default(false),
	createdAt: timestamp('created_at').defaultNow()
});

export type Punch = typeof punch.$inferSelect;
