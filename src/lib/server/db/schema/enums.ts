import { pgEnum } from 'drizzle-orm/pg-core';

export const roleEnum = pgEnum('role', ['Manager', 'Employee']);
export const statusEnum = pgEnum('status', ['Active', 'Inactive']);
export const empTypeEnum = pgEnum('emp_type', ['Permanent', 'Probation', 'Intern']);
export const sourceEnum = pgEnum('source_type', ['Web', 'Mobile', 'Auto-System']);
export const punchEventEnum = pgEnum('punchEvent', [
	'CheckIn',
	'CheckOut',
]);
export const leaveStatusEnum = pgEnum('leave_status', [
	'Pending',
	'Approved',
	'Rejected',
	'Cancelled'
]);
export const halfDaySessionEnum = pgEnum('half_day_session', ['Morning', 'Afternoon']);
export const durationStatusEnum = pgEnum('duration_status', [
	'FullDay',
	'HalfDay',
	'EarlyExit',
	'LateEntry',
	'Overtime'
]);

export const attendanceStatusEnum = pgEnum('attendance_status_enum', [
	'present',
	'absent',
	'late',
	'incomplete',
	'complete',
	'missing-punch'
]);

export const reportTypeEnum = pgEnum('report_type', [
	'MonthlyAttendance',
	'MonthlyLeave',
	'LeaveBalance',
]);
export const notificationTypeEnum = pgEnum('notification_type', [
	'LeaveStatus',
	'MedicalReminder',
	'SystemAlert',
	'General',
	'Attendance'
]);
export const systemCategoryEnum = pgEnum('system_category', [
	'General',
	'WorkingHours',
	'Notifications',
	'Theme'
]);
export const themeEnum = pgEnum('theme', ['Light', 'Dark', 'System']);