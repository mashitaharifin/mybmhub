"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.punch = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var enums_1 = require("./enums");
exports.punch = (0, pg_core_1.pgTable)('punch', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userID: (0, pg_core_1.integer)('user_id')
        .references(function () { return user_1.users.id; })
        .notNull(),
    eventType: (0, enums_1.punchEventEnum)('event_type').notNull(),
    eventTime: (0, pg_core_1.timestamp)('event_time').notNull(),
    locationLat: (0, pg_core_1.decimal)('location_lat', { precision: 10, scale: 6 }), // should've just use geofence ID instead
    locationLng: (0, pg_core_1.decimal)('location_lng', { precision: 10, scale: 6 }),
    accuracyMeters: (0, pg_core_1.integer)('accuracy_meters'),
    source: (0, enums_1.sourceEnum)('source').default('Mobile'),
    notes: (0, pg_core_1.text)('notes'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
