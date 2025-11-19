"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemSettings = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var enums_1 = require("./enums");
exports.systemSettings = (0, pg_core_1.pgTable)('system_settings', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    category: (0, enums_1.systemCategoryEnum)('category'),
    keyName: (0, pg_core_1.varchar)('key_name', { length: 100 }).unique().notNull(),
    value: (0, pg_core_1.text)('value'),
    description: (0, pg_core_1.text)('description'),
    updatedBy: (0, pg_core_1.integer)('updated_by').references(function () { return user_1.users.id; }),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
