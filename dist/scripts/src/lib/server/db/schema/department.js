"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.departments = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.departments = (0, pg_core_1.pgTable)('departments', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    deptName: (0, pg_core_1.varchar)('dept_name', { length: 100 }).unique().notNull(),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
