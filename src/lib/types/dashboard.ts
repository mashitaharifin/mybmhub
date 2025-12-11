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
	id: number;
	employeeName: string; // Changed from 'name' to match API
	departmentName?: string; // Changed from 'department'
	summaryDate: string;
	checkInTime: string | null;
	checkOutTime: string | null;
	totalHours: string | null;
	workedHours: string | null;
	// Add computed properties for display
	name?: string; // For backward compatibility
	status?: 'Present' | 'Late' | 'Absent' | 'On Leave';
	hoursWorked?: string;
};

export type LeaveRequest = {
	id: number;
	employeeName: string; // Changed from 'employee' to match API
	departmentName?: string; // Changed from 'department'
	leaveType: string; // Changed from 'type' to match API
	startDate: string;
	endDate: string;
	status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
	reason?: string;
	managerRemark?: string;
	applicationDate: string;
	// Add computed properties for display
	employee?: string; // For backward compatibility
	type?: string;
	days?: number;
	date?: string;
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

export interface TeamActivity {
  type: 'attendance' | 'leave' | 'notification';
  id: number | string; 
  employeeId: string;
  employeeName: string;
  title: string;
  details: string;
  timestamp: string;
}