"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveTypes = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.leaveTypes = (0, pg_core_1.pgTable)('leave_types', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    typeName: (0, pg_core_1.varchar)('type_name', { length: 50 }).notNull(),
    isPaid: (0, pg_core_1.boolean)('is_paid').default(true),
    maxDaysPerYear: (0, pg_core_1.integer)('max_days_per_year'),
    isCarryForward: (0, pg_core_1.boolean)('is_carry_forward').default(false),
    carryForwardDays: (0, pg_core_1.integer)('carry_forward_days').default(0),
    requiresDoc: (0, pg_core_1.boolean)('requires_doc').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
