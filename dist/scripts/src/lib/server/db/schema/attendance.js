"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendance = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
exports.attendance = (0, pg_core_1.pgTable)('attendance', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userID: (0, pg_core_1.integer)('user_id')
        .references(function () { return user_1.users.id; })
        .notNull(),
    summaryDate: (0, pg_core_1.date)('summary_date').notNull(),
    checkInTime: (0, pg_core_1.timestamp)('check_in_time'),
    checkOutTime: (0, pg_core_1.timestamp)('check_out_time'),
    totalHours: (0, pg_core_1.decimal)('total_hours', { precision: 5, scale: 2 }),
    breakHours: (0, pg_core_1.decimal)('break_hours', { precision: 5, scale: 2 }),
    workedHours: (0, pg_core_1.decimal)('worked_hours', { precision: 5, scale: 2 }),
    isModified: (0, pg_core_1.integer)('is_modified').default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
});
