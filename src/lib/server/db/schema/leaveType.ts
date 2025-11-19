import { pgTable, serial, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const leaveTypes = pgTable('leave_types', {
	id: serial('id').primaryKey(),
	typeName: varchar('type_name', { length: 50 }).notNull(),
	isPaid: boolean('is_paid').default(true),
	maxDaysPerYear: integer('max_days_per_year'),
	isCarryForward: boolean('is_carry_forward').default(false),
	carryForwardDays: integer('carry_forward_days').default(0),
	requiresDoc: boolean('requires_doc').default(false),
	createdAt: timestamp('created_at').defaultNow()
});

export type LeaveType = typeof leaveTypes.$inferSelect;
