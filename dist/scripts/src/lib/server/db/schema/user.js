"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.users = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var enums_1 = require("./enums");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    username: (0, pg_core_1.varchar)('username', { length: 50 }).notNull().unique(),
    name: (0, pg_core_1.text)('name'),
    email: (0, pg_core_1.varchar)('email', { length: 100 }).unique().notNull(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    mustChangePassword: (0, pg_core_1.boolean)('must_change_password').default(true),
    role: (0, enums_1.roleEnum)('role').default('Employee').notNull(),
    status: (0, enums_1.statusEnum)('status').default('Active'),
    lastLoginAt: (0, pg_core_1.timestamp)('last_login_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at'),
    failedLoginAttempts: (0, pg_core_1.integer)().default(0),
    lockedUntil: (0, pg_core_1.timestamp)(),
    resetToken: (0, pg_core_1.varchar)('reset_token', { length: 255 }),
    resetTokenExpiresAt: (0, pg_core_1.timestamp)('reset_token_expires_at')
});
