import { pgTable, serial, varchar, decimal, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const geofenceLocations = pgTable('geofence_locations', {
	id: serial('id').primaryKey(),
	name: varchar('name', { length: 100 }).notNull(),
	latitude: decimal('latitude', { precision: 10, scale: 6 }).notNull(),
	longitude: decimal('longitude', { precision: 10, scale: 6 }).notNull(),
	radiusMeters: integer('radius_meters').notNull(),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at').defaultNow()
});

export type GeofenceLocation = typeof geofenceLocations.$inferSelect;