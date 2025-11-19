"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reports = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var enums_1 = require("./enums");
exports.reports = (0, pg_core_1.pgTable)('reports', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    managerID: (0, pg_core_1.integer)('manager_id').references(function () { return user_1.users.id; }),
    reportType: (0, enums_1.reportTypeEnum)('report_type').notNull(),
    parameters: (0, pg_core_1.json)('parameters'),
    filePath: (0, pg_core_1.varchar)('file_path', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
