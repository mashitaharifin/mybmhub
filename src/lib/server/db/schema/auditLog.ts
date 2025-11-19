import { pgTable, serial, integer, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './user';
import { employees } from './employee';

export const auditLogs = pgTable('audit_logs', {
	id: serial('id').primaryKey(),
	userID: integer('user_id').references(() => users.id), //who performed the action
	employeeID: integer('employee_id').references(() => employees.id), //which employee the action is related to
	actionType: varchar('action_type', { length: 50 }),
	action: varchar('action', { length: 100 }),
	targetTable: varchar('target_table', { length: 100 }),
	targetID: integer('target_id'),
	details: text('details'),
	isUserVisible: boolean('is_user_visible').default(false),
	createdAt: timestamp('created_at').defaultNow()
});

export type AuditLog = typeof auditLogs.$inferSelect;
