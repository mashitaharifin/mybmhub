import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { users, employees, departments, auditLogs } from '$lib/server/db/schema';
import { eq, and, asc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const currentUser = locals.user;
	console.log('Current user:', currentUser);

	if (!locals.user || locals.user.role !== 'Manager') {
		throw redirect(303, '/auth/login');
	}

	const empId = Number(params.id);
	if (isNaN(empId)) throw error(400, 'Invalid employee ID');

	const result = await db
		.select({
			id: employees.id,
			name: employees.name,
			email: users.email,
			role: users.role,
			department: departments.deptName,
			departmentId: departments.id,
			jobTitle: employees.jobTitle,
			empType: employees.empType,
			status: users.status,
			phoneNumber: employees.phoneNumber,
			address: employees.address,
			dateOfJoining: employees.dateOfJoining,
			probationEnd: employees.probationEnd,
			createdAt: employees.createdAt,
			lastLoginAt: users.lastLoginAt,
			avatarUrl: employees.avatarUrl
		})
		.from(employees)
		.leftJoin(users, eq(users.id, employees.userId))
		.leftJoin(departments, eq(departments.id, employees.departmentId))
		.where(and(eq(employees.id, empId), eq(employees.isDeleted, false)))
		.limit(1);

	if (!result.length) {
		throw error(404, 'Employee not found');
	}

	const employee = result[0];

	const allDepartments = await db
		.select({ id: departments.id, deptName: departments.deptName })
		.from(departments)
		.orderBy(asc(departments.deptName));

	const tabs = {
		attendance: null,
		leave: null,
		activity: null
	};

	// NEW: Fetch attendance data from your API
	let attendanceData = null;
	try {
		// Call your existing API endpoint internally
		const response = await fetch(`/api/attendance/${empId}`);
		if (response.ok) {
			attendanceData = await response.json();
		}
	} catch (err) {
		console.error('Failed to fetch attendance data:', err);
		attendanceData = {
			summary: { totalDays: 0, present: 0, absent: 0, avgHours: 0 },
			records: []
		};
	}

	if (currentUser) {
		try {
			await db.insert(auditLogs).values({
				userID: currentUser.id,
				employeeID: empId,
				actionType: 'VIEW',
				action: 'View Employee Details',
				targetTable: 'employees',
				targetID: empId,
				details: `Manager viewed ${employee.name}'s details.`,
				isUserVisible: false
			});
		} catch (err) {
			console.error('Failed to log audit action:', err);
		}
	}

	return {
		employee: {
			...employee,
			departmentId: employee.departmentId
		},
		departments: allDepartments,
		attendanceData,
		tabs
	};
};

export const actions: Actions = {
	toggleStatus: async ({ request, locals, params }) => {
		const form = await request.formData();
		const employeeId = Number(params.id);
		const newStatus = form.get('status')?.toString();

		if (!employeeId || !newStatus || (newStatus !== 'Active' && newStatus !== 'Inactive')) {
			return fail(400, { error: 'Invalid request data.' });
		}

		try {
			const employee = await db
				.select({ userId: employees.userId, name: employees.name })
				.from(employees)
				.where(eq(employees.id, employeeId))
				.limit(1);

			if (employee.length === 0) {
				return fail(404, { error: 'Employee not found.' });
			}

			await db
				.update(users)
				.set({ status: newStatus as any })
				.where(eq(users.id, employee[0].userId));

			if (locals.user) {
				await db.insert(auditLogs).values({
					userID: locals.user.id,
					employeeID: employeeId,
					actionType: 'UPDATE',
					action: newStatus === 'Active' ? 'Employee Reactivated' : 'Employee Deactivated',
					targetTable: 'employees',
					targetID: employeeId,
					details: `${newStatus === 'Active' ? 'Reactivated' : 'Deactivated'} employee ${employee[0].name}`,
					isUserVisible: true
				});
			}

			return { success: true, message: `Employee status updated to ${newStatus}` };
		} catch (error) {
			console.error('Toggle status error:', error);
			return fail(500, { error: 'Failed to update employee status.' });
		}
	},

	updateEmployee: async ({ request, locals, params }) => {
		const form = await request.formData();
		const id = Number(form.get('id'));

		if (!id || isNaN(id)) {
			console.log('Invalid ID received:', form.get('id'));
			return fail(400, { error: 'Employee ID missing or invalid.' });
		}

		const name = form.get('name')?.toString().trim();
		const role = form.get('role')?.toString();
		const jobTitle = form.get('jobTitle')?.toString() ?? null;
		const empType = form.get('empType')?.toString() ?? null;
		const phoneNumber = form.get('phoneNumber')?.toString() ?? null;
		const address = form.get('address')?.toString() ?? null;
		const departmentId = form.get('departmentId') ? Number(form.get('departmentId')) : null;

		console.log('Parsed form data:', {
			name,
			role,
			jobTitle,
			empType,
			phoneNumber,
			address,
			departmentId
		});

		if (!name) {
			return fail(400, { error: 'Name is required.' });
		}

		try {
			const employee = await db
				.select({ userId: employees.userId })
				.from(employees)
				.where(eq(employees.id, id))
				.limit(1);

			if (employee.length === 0) {
				console.log('Employee not found with ID:', id);
				return fail(404, { error: 'Employee not found.' });
			}

			await db
				.update(employees)
				.set({
					name,
					jobTitle,
					empType: empType as any,
					phoneNumber,
					address,
					departmentId,
					updatedAt: new Date()
				} as any)
				.where(eq(employees.id, id));

			if (role) {
				await db
					.update(users)
					.set({
						role: role as any,
						name
					})
					.where(eq(users.id, employee[0].userId));
			}

			if (locals.user) {
				await db.insert(auditLogs).values({
					userID: locals.user.id,
					employeeID: id,
					actionType: 'UPDATE',
					action: 'Update Employee',
					targetTable: 'employees',
					targetID: id,
					details: `Updated employee record for ${name}`,
					isUserVisible: true
				});
			}

			console.log('Employee updated successfully');
			return { success: true, message: 'Employee updated successfully.' };
		} catch (error) {
			console.error('Update employee error:', error);
			return fail(500, { error: 'Failed to update employee.' });
		}
	}
};
