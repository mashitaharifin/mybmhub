export interface EmployeeHeader {
	streakCount: number;
}

export interface AttendanceDay {
	date: string; 
	workedHours: number;
}

export interface AttendanceSnapshot {
	totalDaysInWindow: number;
	totalWorkedHours: number;
	averageWorkedHours: number;
	chart: AttendanceDay[];
}

export interface LeaveBalanceItem {
	id: number;
	leaveTypeID: number;
	leaveTypeName: string | null;
	year: number;
	totalEntitlement: number;
	daysTaken: number;
	remaining: number;
	remainingBalance: number;
	updatedAt: string | null;
}

export interface LeaveBalanceSummary {
	annual: number;
	sick: number;
	emergency: number;
	unpaid: number;
}

export interface QuickAttendance {
	date: string | null;
	checkIn: string | null;
	checkOut: string | null;
	status: string;
}

export interface EmployeeActivity {
	id: number;
	action: string;
	details: string;
	date: string;
}

export interface EmployeeProfile {
	id: string;
	name: string;
	role: string;
	jobTitle: string;
	avatarUrl: string;
}

export interface CalendarEvent {
	id: string | number;
	title: string;
	start: string;
	end?: string;
	color?: string;
}

export async function getCalendarData() {
	const res = await fetch('/api/employee/calendar');
	if (!res.ok) throw new Error('Failed to fetch employee calendar');
	const json = await res.json();
	return json.data;
}
