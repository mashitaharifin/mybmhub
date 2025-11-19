import { pgTable, serial, varchar, json, time, date } from 'drizzle-orm/pg-core';

export const workingPatterns = pgTable('working_patterns', {
	id: serial('id').primaryKey(),
	jobTitle: varchar('job_title', { length: 100 }), // should be FK to employee table
	workDays: json('work_days'),
	weekPattern: varchar('week_pattern', { length: 20 }),
	startTime: time('start_time'),
	endTime: time('end_time'),
	effectiveFrom: date('effective_from').defaultNow(),
	effectiveTo: date('effective_to')
});

export type WorkingPattern = typeof workingPatterns.$inferSelect;
