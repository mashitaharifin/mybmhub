"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditLogs = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var employee_1 = require("./employee");
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userID: (0, pg_core_1.integer)('user_id').references(function () { return user_1.users.id; }), //who performed the action
    employeeID: (0, pg_core_1.integer)('employee_id').references(function () { return employee_1.employees.id; }), //which employee the action is related to
    actionType: (0, pg_core_1.varchar)('action_type', { length: 50 }),
    action: (0, pg_core_1.varchar)('action', { length: 100 }),
    targetTable: (0, pg_core_1.varchar)('target_table', { length: 100 }),
    targetID: (0, pg_core_1.integer)('target_id'),
    details: (0, pg_core_1.text)('details'),
    isUserVisible: (0, pg_core_1.boolean)('is_user_visible').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
