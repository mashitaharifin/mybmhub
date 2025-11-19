import { pgTable, serial, integer, timestamp, decimal, text } from 'drizzle-orm/pg-core';
import { users } from './user';
import { punchEventEnum, sourceEnum } from './enums';

export const punch = pgTable('punch', {
	id: serial('id').primaryKey(),
	userID: integer('user_id')
		.references(() => users.id)
		.notNull(),
	eventType: punchEventEnum('event_type').notNull(),
	eventTime: timestamp('event_time').notNull(),
	locationLat: decimal('location_lat', { precision: 10, scale: 6 }), // should've just use geofence ID instead
	locationLng: decimal('location_lng', { precision: 10, scale: 6 }),
	accuracyMeters: integer('accuracy_meters'),
	source: sourceEnum('source').default('Mobile'),
	notes: text('notes'),
	createdAt: timestamp('created_at').defaultNow()
});

export type Punch = typeof punch.$inferSelect;
