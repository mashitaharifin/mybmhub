import { pgTable, serial, varchar, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './user';
import { systemCategoryEnum } from './enums';

export const systemSettings = pgTable('system_settings', {
	id: serial('id').primaryKey(),
	category: systemCategoryEnum('category'),
	keyName: varchar('key_name', { length: 100 }).unique().notNull(),
	value: text('value'),
	description: text('description'),
	updatedBy: integer('updated_by').references(() => users.id),
	updatedAt: timestamp('updated_at').defaultNow()
});

export type SystemSetting = typeof systemSettings.$inferSelect;
