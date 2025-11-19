"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.holidays = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.holidays = (0, pg_core_1.pgTable)('holidays', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    holidayName: (0, pg_core_1.varchar)('holiday_name', { length: 100 }).notNull(),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date'),
    isRecurring: (0, pg_core_1.boolean)('is_recurring').default(false),
    type: (0, pg_core_1.varchar)('type', { length: 50 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
