"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employees = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var enums_1 = require("./enums");
var department_1 = require("./department");
var user_1 = require("./user");
exports.employees = (0, pg_core_1.pgTable)('employees', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userId: (0, pg_core_1.integer)('user_id')
        .references(function () { return user_1.users.id; })
        .notNull()
        .unique(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    departmentId: (0, pg_core_1.integer)('department_id').references(function () { return department_1.departments.id; }),
    empType: (0, enums_1.empTypeEnum)('emp_type'),
    jobTitle: (0, pg_core_1.varchar)('job_title', { length: 100 }),
    dateOfJoining: (0, pg_core_1.date)('date_of_joining'),
    probationEnd: (0, pg_core_1.date)('probation_end'),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 20 }),
    address: (0, pg_core_1.text)('address'),
    avatarUrl: (0, pg_core_1.varchar)('avatar_url', { length: 255 }),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
});
