import {
	pgTable,
	serial,
	varchar,
	text,
	integer,
	date,
	boolean,
	timestamp
} from 'drizzle-orm/pg-core';
import { empTypeEnum } from './enums';
import { departments } from './department';
import { users } from './user';

export const employees = pgTable('employees', {
	id: serial('id').primaryKey(),
	userId: integer('user_id')
		.references(() => users.id)
		.notNull()
		.unique(), 
	name: varchar('name', { length: 100 }).notNull(),
	departmentId: integer('department_id').references(() => departments.id),
	empType: empTypeEnum('emp_type'),
	jobTitle: varchar('job_title', { length: 100 }),
	dateOfJoining: date('date_of_joining'),
	probationEnd: date('probation_end'),
	phoneNumber: varchar('phone_number', { length: 20 }),
	address: text('address'),
	avatarUrl: varchar('avatar_url', { length: 255 }),
	isDeleted: boolean('is_deleted').default(false),
	createdAt: timestamp('created_at').defaultNow(),
	updatedAt: timestamp('updated_at')
});

export type Employee = typeof employees.$inferSelect;
