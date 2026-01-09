import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const role = locals.user?.role; // 'employee' | 'manager'

	const dashboardPath = role === 'manager' ? '/manager/dashboard' : '/employee/dashboard';

	return {
		userRole: role,
		dashboardPath
	};
};
