"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveBalances = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var leaveType_1 = require("./leaveType");
var leaveEntitlementRule_1 = require("./leaveEntitlementRule");
exports.leaveBalances = (0, pg_core_1.pgTable)('leave_balances', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userID: (0, pg_core_1.integer)('user_id').references(function () { return user_1.users.id; }),
    leaveTypeID: (0, pg_core_1.integer)('leave_type_id').references(function () { return leaveType_1.leaveTypes.id; }),
    leaveEntitlementRuleID: (0, pg_core_1.integer)('entitlement_rule_id')
        .references(function () { return leaveEntitlementRule_1.leaveEntitlementRules.id; })
        .notNull(),
    year: (0, pg_core_1.integer)('year').notNull(),
    initialCarryForward: (0, pg_core_1.integer)('initial_carry_forward').default(0),
    totalEntitlement: (0, pg_core_1.integer)('total_entitlement').notNull(),
    daysTaken: (0, pg_core_1.decimal)('days_taken', { precision: 5, scale: 2 }).default('0'),
    remainingBalance: (0, pg_core_1.decimal)('remaining_balance', { precision: 5, scale: 2 }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
