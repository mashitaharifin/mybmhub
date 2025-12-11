import type {
	MetricsResponse,
	TeamMember,
	LeaveRequest,
	CalendarEvent,
	ManagerProfile,
	TeamActivity
} from '$lib/types/dashboard';

// --- Generic fetch helper ---
async function fetchJSON<T>(url: string, fallback: T): Promise<T> {
	try {
		const res = await fetch(url);
		if (!res.ok) throw new Error(`Failed to fetch ${url}`);
		const json = await res.json();

		// Check if response has a data property
		if (json && typeof json === 'object' && 'data' in json) {
			return json.data ?? fallback;
		}

		return json ?? fallback;
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

export const getTeamActivities = () =>
	fetchJSON<TeamActivity[]>('/api/dashboard/teamActivities', []);

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

	const data = await fetchJSON<ManagerProfile>('/api/dashboard/profile', fallback);

	return data;
}
