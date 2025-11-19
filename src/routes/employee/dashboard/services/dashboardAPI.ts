import type {
	EmployeeHeader,
	AttendanceSnapshot,
	LeaveBalanceItem,
	QuickAttendance,
	EmployeeActivity,
	CalendarEvent,
	EmployeeProfile
} from '$lib/types/empDashboard';

// --- Generic fetch helper ---
async function fetchJSON<T>(url: string, fallback: T): Promise<T> {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Failed to fetch ${url}`);
		const data = await res.json();
		return data?.data ?? fallback;
	} catch (err) {
		console.error(err);
		return fallback;
	}
}

// --- API functions ---
export async function getEmpHeader(): Promise<EmployeeHeader> {
	const fallback: EmployeeHeader = {
		streakCount: 0
	};
	return fetchJSON('/api/dashboard/empHeader', fallback);
}

export async function getEmpAttendanceSnapshot(): Promise<AttendanceSnapshot> {
	const fallback: AttendanceSnapshot = {
		totalDaysInWindow: 0,
		totalWorkedHours: 0,
		averageWorkedHours: 0,
		chart: []
	};
	return fetchJSON('/api/dashboard/empAttendanceSnapshot', fallback);
}

export interface SimpleLeaveBalance  {
	type: string;
	total: number;
	remaining: number;
}

export async function getEmpLeaveBalance(): Promise<LeaveBalanceItem[]> {
	const fallback: LeaveBalanceItem[] = [];
	return fetchJSON('/api/dashboard/empLeaveBalance', fallback);
}

export async function getEmpQuickAttendance(): Promise<QuickAttendance> {
	const fallback: QuickAttendance = {
		date: null,
		checkIn: null,
		checkOut: null,
		status: 'N/A'
	};
	return fetchJSON('/api/dashboard/empQuickAttendance', fallback);
}

export async function getEmpActivity(): Promise<EmployeeActivity[]> {
	return fetchJSON('/api/dashboard/empActivity', []);
}

export async function getEmployeeProfile(): Promise<EmployeeProfile> {
	const fallback: EmployeeProfile = {
		id: 'EMP-0000',
		name: 'Unknown',
		role: 'Employee',
		jobTitle: '-',
		avatarUrl: ''
	};
	return fetchJSON('/api/dashboard/profile', fallback);
}

export const getCalendarData = () => fetchJSON<CalendarEvent[]>('/api/dashboard/calendar', []);
