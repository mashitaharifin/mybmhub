"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leaveApplications = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
var user_1 = require("./user");
var leaveType_1 = require("./leaveType");
var enums_1 = require("./enums");
exports.leaveApplications = (0, pg_core_1.pgTable)('leave_applications', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    userID: (0, pg_core_1.integer)('user_id').references(function () { return user_1.users.id; }),
    leaveTypeID: (0, pg_core_1.integer)('leave_type_id').references(function () { return leaveType_1.leaveTypes.id; }),
    startDate: (0, pg_core_1.date)('start_date').notNull(),
    endDate: (0, pg_core_1.date)('end_date').notNull(),
    halfDay: (0, pg_core_1.boolean)('half_day').default(false),
    halfDaySession: (0, enums_1.halfDaySessionEnum)('half_day_session'),
    reason: (0, pg_core_1.text)('reason'),
    docImg: (0, pg_core_1.varchar)('doc_img', { length: 255 }),
    status: (0, enums_1.leaveStatusEnum)('status').default('Pending'),
    managerRemark: (0, pg_core_1.text)('manager_remark'),
    applicationDate: (0, pg_core_1.timestamp)('application_date').defaultNow(),
    approvalDate: (0, pg_core_1.timestamp)('approval_date'),
    cancelledBy: (0, pg_core_1.integer)('cancelled_by').references(function () { return user_1.users.id; }),
    cancelledDate: (0, pg_core_1.timestamp)('cancelled_date'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at')
});
