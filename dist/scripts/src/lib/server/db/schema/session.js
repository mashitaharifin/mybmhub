"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessions = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
exports.sessions = (0, pg_core_1.pgTable)('sessions', {
    id: (0, pg_core_1.text)('id').primaryKey(), // keep session ID as text (token-based)
    userId: (0, pg_core_1.integer)('user_id')
        .notNull()
        .references(function () { return user_1.users.id; }, { onDelete: 'cascade' }),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
