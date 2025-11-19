import { pgTable, serial, integer, decimal, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';
import { leaveTypes } from './leaveType';
import { leaveEntitlementRules } from './leaveEntitlementRule';

export const leaveBalances = pgTable('leave_balances', {
	id: serial('id').primaryKey(),
	userID: integer('user_id').references(() => users.id),
	leaveTypeID: integer('leave_type_id').references(() => leaveTypes.id),
	leaveEntitlementRuleID: integer('entitlement_rule_id')
		.references(() => leaveEntitlementRules.id)
		.notNull(),
	year: integer('year').notNull(),
	initialCarryForward: integer('initial_carry_forward').default(0),
	totalEntitlement: integer('total_entitlement').notNull(),
	daysTaken: decimal('days_taken', { precision: 5, scale: 2 }).default('0'),
	remainingBalance: decimal('remaining_balance', { precision: 5, scale: 2 }),
	updatedAt: timestamp('updated_at').defaultNow()
});

export type LeaveBalance = typeof leaveBalances.$inferSelect;
