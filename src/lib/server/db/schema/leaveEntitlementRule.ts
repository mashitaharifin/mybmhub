import { pgTable, serial, integer, boolean } from 'drizzle-orm/pg-core';
import { leaveTypes } from './leaveType';
import { empTypeEnum } from './enums';
import { timestamp } from 'drizzle-orm/pg-core';

export const leaveEntitlementRules = pgTable('leave_entitlement_rules', {
	id: serial('id').primaryKey(),
	leaveTypeID: integer('leave_type_id').references(() => leaveTypes.id),
	empType: empTypeEnum('emp_type'),
	minYearsOfService: integer('min_years_of_service').default(0),
	maxYearsOfService: integer('max_years_of_service').default(999),
	entitlementDays: integer('entitlement_days').notNull(),
	effectiveYear: integer('effective_year').notNull(),
	isActive: boolean('is_active').default(true),
	createdAt: timestamp('created_at').defaultNow()
});

export type LeaveEntitlementRule = typeof leaveEntitlementRules.$inferSelect;
