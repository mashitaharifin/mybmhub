export type Metric = {
	title: string;
	value: number | null;
	color?: string;
};

export type MetricsResponse = {
	totalEmployees: number | null;
	attendanceSummary: {
		totalPresent: number | null;
		totalAbsent: number | null;
	} | null;
	leaveSummary: {
		pending: number | null;
	} | null;
};

export type TeamMember = {
	name: string;
	status: 'Present' | 'Absent' | 'Late' | 'On Leave';
	hoursWorked: number;
};

export type LeaveRequest = {
	employee: string;
	type: string;
	days: number;
	status: 'Pending' | 'Approved' | 'Rejected';
	date: string;
};

export type CalendarEvent = {
	date: string;
	type: 'holiday' | 'leave';
	title: string;
};

export type ManagerProfile = {
	id: string;
	name: string;
	role: string;
	jobTitle: string;
	avatarUrl: string;
};
