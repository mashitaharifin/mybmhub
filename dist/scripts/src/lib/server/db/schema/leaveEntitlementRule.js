"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveEntitlementRules = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var leaveType_1 = require("./leaveType");
var enums_1 = require("./enums");
var pg_core_2 = require("drizzle-orm/pg-core");
exports.leaveEntitlementRules = (0, pg_core_1.pgTable)('leave_entitlement_rules', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    leaveTypeID: (0, pg_core_1.integer)('leave_type_id').references(function () { return leaveType_1.leaveTypes.id; }),
    empType: (0, enums_1.empTypeEnum)('emp_type'),
    minYearsOfService: (0, pg_core_1.integer)('min_years_of_service').default(0),
    maxYearsOfService: (0, pg_core_1.integer)('max_years_of_service').default(999),
    entitlementDays: (0, pg_core_1.integer)('entitlement_days').notNull(),
    effectiveFrom: (0, pg_core_1.date)('effective_from'),
    effectiveTo: (0, pg_core_1.date)('effective_to'),
    createdAt: (0, pg_core_2.timestamp)('created_at').defaultNow()
});
