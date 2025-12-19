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
	{ name: 'Profile', icon: User, path: '/profile' },
	{
		name: 'Leave',
		icon: Plane,
		path: '/manager/leave/balance',
		submenu: [
			{ name: 'Employee Leave Management', path: '/manager/leave/manage' },
			{ name: 'Employee Leave Balance', path: '/manager/leave/balance' },
		]
	},
	{
		name: 'Attendance',
		icon: CalendarCheck,
		path: '/manager/attendance',
		submenu: [
			{ name: 'Attendance History', path: '/manager/attendance/' },
			{ name: 'Auto-Punch Outs Summary', path: '/manager/attendance/auto-punch-summary' },
		]
	},
	{ name: 'Employee Records', icon: Users, path: '/manager/employee-records' },
	{ name: 'Reports', icon: BarChart, path: '/manager/reports' },
	{ name: 'Notifications Centre', icon: Bell, path: '/notifications' },
	{ name: 'System Settings', icon: Settings, path: '/manager/system-settings' },
	{ name: 'Recent Activity', icon: Activity, path: '/manager/recent-activity' }
	//{ name: 'Audit Logs', icon: ScrollText, path: '/manager/audit-logs' }
];

export const EMPLOYEE_MENU = [
	{ name: 'Dashboard', icon: LayoutDashboard, path: '/employee/dashboard' },
	{ name: 'Profile', icon: User, path: '/profile' },
	{
		name: 'Leave',
		icon: Plane,
		path: '/employee/leave/apply',
		submenu: [
			{ name: 'Leave Application', path: '/employee/leave/apply' },
			{ name: 'Leave Balance', path: '/employee/leave/balance' }
		]
	},
	{ name: 'Attendance', icon: CalendarCheck, path: '/employee/attendance'},
	{ name: 'Notifications Centre', icon: Bell, path: '/notifications' },
	{ name: 'Recent Activity', icon: Activity, path: '/employee/recent-activity' }
];

export const getPageTitle = (path: string) => {
	const allItems = [...MANAGER_MENU, ...EMPLOYEE_MENU];
	const item =
		allItems.find((i) => i.path === path) ||
		allItems.flatMap((i) => i.submenu || []).find((s) => s.path === path);
	return item ? item.name : 'Dashboard';
};
