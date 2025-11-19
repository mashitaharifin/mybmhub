import {
	LayoutDashboard,
	User,
	Plane,
	CalendarCheck,
	Users,
	BarChart,
	Bell,
	Settings,
	Activity,
	ScrollText,
	Briefcase
} from 'lucide-svelte';

export const MANAGER_MENU = [
	{ name: 'Dashboard', icon: LayoutDashboard, path: '/manager/dashboard' },
	{ name: 'Profile', icon: User, path: '/manager/profile' },
	{
		name: 'Leave',
		icon: Plane,
		path: '/manager/leave',
		submenu: [
			{ name: 'Employee Leave Balance', path: '/manager/leave/balance' },
			{ name: 'Manage Leave Request', path: '/manager/leave/manage' }
		]
	},
	{ name: 'Attendance', icon: CalendarCheck, path: '/manager/attendance' },
	{ name: 'Employee Records', icon: Users, path: '/manager/employee-records' },
	{ name: 'Reports', icon: BarChart, path: '/manager/reports' },
	{ name: 'Notifications Centre', icon: Bell, path: '/manager/notifications' },
	{ name: 'System Settings', icon: Settings, path: '/manager/system-settings' },
	{ name: 'Recent Activity', icon: Activity, path: '/manager/recent-activity' }
	//{ name: 'Audit Logs', icon: ScrollText, path: '/manager/audit-logs' }
];

export const EMPLOYEE_MENU = [
	{ name: 'Dashboard', icon: LayoutDashboard, path: '/employee/dashboard' },
	{ name: 'Profile', icon: User, path: '/employee/profile' },
	{
		name: 'Leave',
		icon: Plane,
		path: '/employee/leave',
		submenu: [
			{ name: 'Leave Balance', path: '/employee/leave/balance' },
			{ name: 'Apply for Leave', path: '/employee/leave/apply' }
		]
	},
	{ name: 'Attendance', icon: CalendarCheck, path: '/employee/attendance'},
	{ name: 'Notifications Centre', icon: Bell, path: '/employee/notifications' },
	{ name: 'Recent Activity', icon: Activity, path: '/employee/recent-activity' }
];

export const getPageTitle = (path: string) => {
	const allItems = [...MANAGER_MENU, ...EMPLOYEE_MENU];
	const item =
		allItems.find((i) => i.path === path) ||
		allItems.flatMap((i) => i.submenu || []).find((s) => s.path === path);
	return item ? item.name : 'Dashboard';
};
