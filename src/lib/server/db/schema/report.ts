import { pgTable, serial, integer, json, varchar, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';
import { reportTypeEnum } from './enums';

export const reports = pgTable('reports', {
	id: serial('id').primaryKey(),
	managerID: integer('manager_id').references(() => users.id),
	reportType: reportTypeEnum('report_type').notNull(),
	parameters: json('parameters'),
	filePath: varchar('file_path', { length: 255 }),
	createdAt: timestamp('created_at').defaultNow()
});

export type Report = typeof reports.$inferSelect;
