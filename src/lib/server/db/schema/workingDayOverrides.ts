import {
	pgTable,
	serial,
	integer,
	date,
	boolean,
	text,
	timestamp,
	uniqueIndex
} from 'drizzle-orm/pg-core';
import { users } from './user';

export const workingDayOverrides = pgTable(
	'working_day_overrides',
	{
		id: serial('id').primaryKey(),
		userID: integer('user_id')
			.references(() => users.id)
			.notNull(),
		date: date('date').notNull(),
		isWorkingDay: boolean('is_working_day').notNull(),
		reason: text('reason'),
		createdAt: timestamp('created_at').defaultNow()
	},
	(table) => {
		return {
			uniqueUserDate: uniqueIndex('working_day_overrides_user_date_idx').on(
				table.userID,
				table.date
			)
		};
	}
);


export type WorkingDayOverride = typeof workingDayOverrides.$inferSelect;
export type NewWorkingDayOverride = typeof workingDayOverrides.$inferInsert;
