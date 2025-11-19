import type {
	MetricsResponse,
	TeamMember,
	LeaveRequest,
	CalendarEvent,
	ManagerProfile
} from '$lib/types/dashboard';

// --- Generic fetch helper ---
async function fetchJSON<T>(url: string, fallback: T): Promise<T> {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Failed to fetch ${url}`);
		const data = await res.json();
		return data ?? fallback;
	} catch (err) {
		console.error(err);
		return fallback;
	}
}

// --- API functions ---
export async function getMetrics(): Promise<MetricsResponse> {
	const fallback: MetricsResponse = {
		totalEmployees: null,
		attendanceSummary: { totalPresent: null, totalAbsent: null },
		leaveSummary: { pending: null }
	};

	const data = await fetchJSON('/api/dashboard/metrics', fallback);

	// Normalize structure to ensure MetricsResponse
	return {
		totalEmployees: data.totalEmployees ?? null,
		attendanceSummary: {
			totalPresent: data.attendanceSummary?.totalPresent ?? null,
			totalAbsent: data.attendanceSummary?.totalAbsent ?? null
		},
		leaveSummary: {
			pending: data.leaveSummary?.pending ?? null
		}
	};
}

export const getTeamAttendance = () => fetchJSON<TeamMember[]>('/api/dashboard/attendance', []);

export const getPendingLeaves = () => fetchJSON<LeaveRequest[]>('/api/dashboard/leaves', []);

export const getCalendarData = () => fetchJSON<CalendarEvent[]>('/api/dashboard/calendar', []);

export async function getManagerProfile(): Promise<ManagerProfile> {
	const fallback: ManagerProfile = {
		id: 'EMP-0000',
		name: 'Unknown',
		role: 'Manager',
		jobTitle: '-',
		avatarUrl: ''
	};

	const res = await fetchJSON<{ success: boolean; data: ManagerProfile }>(
		'/api/dashboard/profile',
		{ success: false, data: fallback }
	);

	return res.success ? res.data : fallback;
}
