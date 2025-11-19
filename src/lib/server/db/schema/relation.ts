// it’s a TypeScript-only helper that tells Drizzle how tables are connected (foreign key relationships).
import { relations } from 'drizzle-orm';
import { employees} from './employee';
import { users } from './user';
import { departments } from './department';

export const employeeRelations = relations(employees, ({ one }) => ({
	user: one(users, {
		fields: [employees.userId],
		references: [users.id]
	}),
	department: one(departments, {
		fields: [employees.departmentId],
		references: [departments.id]
	})
}));

export type EmployeeRelations = typeof employeeRelations;
