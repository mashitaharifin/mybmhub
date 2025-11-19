"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.themeEnum = exports.systemCategoryEnum = exports.notificationTypeEnum = exports.reportTypeEnum = exports.durationStatusEnum = exports.halfDaySessionEnum = exports.leaveStatusEnum = exports.punchEventEnum = exports.sourceEnum = exports.empTypeEnum = exports.statusEnum = exports.roleEnum = void 0;
var pg_core_1 = require("drizzle-orm/pg-core");
exports.roleEnum = (0, pg_core_1.pgEnum)('role', ['Manager', 'Employee']);
exports.statusEnum = (0, pg_core_1.pgEnum)('status', ['Active', 'Inactive']);
exports.empTypeEnum = (0, pg_core_1.pgEnum)('emp_type', ['Permanent', 'Probation', 'Intern']);
exports.sourceEnum = (0, pg_core_1.pgEnum)('source_type', ['Web', 'Mobile']);
exports.punchEventEnum = (0, pg_core_1.pgEnum)('punchEvent', [
    'CheckIn',
    'CheckOut',
    'BreakStart',
    'BreakEnd'
]);
exports.leaveStatusEnum = (0, pg_core_1.pgEnum)('leave_status', [
    'Pending',
    'Approved',
    'Rejected',
    'Cancelled'
]);
exports.halfDaySessionEnum = (0, pg_core_1.pgEnum)('half_day_session', ['Morning', 'Afternoon']);
exports.durationStatusEnum = (0, pg_core_1.pgEnum)('duration_status', [
    'FullDay',
    'HalfDay',
    'EarlyExit',
    'LateEntry',
    'Overtime'
]);
exports.reportTypeEnum = (0, pg_core_1.pgEnum)('report_type', [
    'MonthlyAttendance',
    'MonthlyLeave',
    'LeaveBalance',
    'LateInEarlyOut',
    'Absenteeism'
]);
exports.notificationTypeEnum = (0, pg_core_1.pgEnum)('notification_type', [
    'LeaveStatus',
    'MedicalReminder',
    'SystemAlert',
    'General'
]);
exports.systemCategoryEnum = (0, pg_core_1.pgEnum)('system_category', [
    'General',
    'WorkingHours',
    'Notifications',
    'Theme'
]);
exports.themeEnum = (0, pg_core_1.pgEnum)('theme', ['Light', 'Dark', 'System']);
