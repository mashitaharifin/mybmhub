"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.geofenceLocations = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.geofenceLocations = (0, pg_core_1.pgTable)('geofence_locations', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    latitude: (0, pg_core_1.decimal)('latitude', { precision: 10, scale: 6 }).notNull(),
    longitude: (0, pg_core_1.decimal)('longitude', { precision: 10, scale: 6 }).notNull(),
    radiusMeters: (0, pg_core_1.integer)('radius_meters').notNull(),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
