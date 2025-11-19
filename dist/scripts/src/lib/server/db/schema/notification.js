"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifications = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var leaveApplication_1 = require("./leaveApplication");
var enums_1 = require("./enums");
exports.notifications = (0, pg_core_1.pgTable)('notifications', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    recipientID: (0, pg_core_1.integer)('recipient_id').references(function () { return user_1.users.id; }),
    title: (0, pg_core_1.varchar)('title', { length: 100 }),
    message: (0, pg_core_1.text)('message'),
    type: (0, enums_1.notificationTypeEnum)('type'),
    relatedLeaveID: (0, pg_core_1.integer)('related_leave_id').references(function () { return leaveApplication_1.leaveApplications.id; }),
    triggerDate: (0, pg_core_1.timestamp)('trigger_date'),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    sentInApp: (0, pg_core_1.boolean)('sent_in_app').default(false),
    sentEmail: (0, pg_core_1.boolean)('sent_email').default(false),
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
