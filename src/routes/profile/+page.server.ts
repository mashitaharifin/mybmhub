import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { users, employees, departments } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

// Helper: get user from locals (based on how SvelteKit stores session)
async function getUserFromLocals(locals: App.Locals) {
	// Example assumes you store user in locals after authentication
	// e.g. locals.user = { id, username, role, ... }
	if (!locals.user) return null;
	return locals.user;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = await getUserFromLocals(locals);
	if (!user) {
		return {
			status: 401,
			body: { message: 'Unauthorized' }
		};
	}

	// Join user and employee tables
	const record = await db
		.select({
			userId: users.id,
			username: users.username,
			email: users.email,
			status: users.status,
			name: employees.name,
			department: departments.id,
			jobTitle: employees.jobTitle,
			employmentType: employees.empType,
			joinDate: employees.dateOfJoining,
			phone: employees.phoneNumber,
			address: employees.address,
			avatarUrl: employees.avatarUrl
		})
		.from(users)
		.leftJoin(employees, eq(users.id, employees.userId))
		.leftJoin(departments, eq(employees.departmentId, departments.id))
		.where(eq(users.id, user.id))
		.limit(1);

	if (!record || record.length === 0) {
		return {
			status: 404,
			body: { message: 'User not found' }
		};
	}

	const data = record[0];

	return {
		profile: {
			id: data.userId,
			username: data.username,
			name: data.name,
			email: data.email,
			phone: data.phone,
			address: data.address,
			department: data.department,
			jobTitle: data.jobTitle,
			employmentType: data.employmentType,
			joinDate: data.joinDate,
			avatarUrl: data.avatarUrl,
			status: data.status
		}
	};
};
