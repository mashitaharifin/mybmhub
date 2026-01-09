import type { PageServerLoad, Actions } from './$types';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema/user';
import { employees } from '$lib/server/db/schema/employee';
import { departments } from '$lib/server/db/schema/department';
import { auditLogs } from '$lib/server/db/schema/auditLog';
import { eq, asc, and, ilike } from 'drizzle-orm';
import { fail, redirect, error } from '@sveltejs/kit';
import argon2 from 'argon2';
import { generateLeaveBalanceForEmployee } from '$lib/server/leave/generateBalance';
import { date } from 'drizzle-orm/mysql-core';
import {
	notifyPasswordChangeRequired,
	notifyManagerUserCreated
} from '$lib/server/notifications/system';

type LogAuditParams = {
	userID: number;
	employeeID?: number | null;
	actionType: string;
	action: string;
	targetTable: string;
	targetID?: number | null;
	details: string;
	isUserVisible?: boolean;
};

async function logAuditAction(params: LogAuditParams) {
	try {
		const {
			userID,
			employeeID = null,
			actionType,
			action,
			targetTable,
			targetID = null,
			details,
			isUserVisible = true
		} = params;

		console.log('Inserting audit log with values:', {
			userID,
			employeeID,
			actionType,
			action,
			targetTable,
			targetID,
			details,
			isUserVisible
		});

		const result = await db
			.insert(auditLogs)
			.values({
				userID,
				employeeID,
				actionType,
				action,
				targetTable,
				targetID,
				details,
				isUserVisible
			})
			.returning();

		console.log('Audit log inserted successfully:', result);
	} catch (error) {
		console.error('Failed to insert audit log:', error);
		throw error;
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || locals.user.role !== 'Manager') {
		throw redirect(303, '/auth/login');
	}

	const search = (url.searchParams.get('search') ?? '').trim();
	const departmentFilter = url.searchParams.get('department') ?? '';
	const statusFilter = url.searchParams.get('status') ?? '';

	const whereClauses: any[] = [];

	if (search) whereClauses.push(ilike(employees.name, `%${search}%`));
	if (departmentFilter) whereClauses.push(eq(employees.departmentId, Number(departmentFilter)));
	if (statusFilter) whereClauses.push(eq(users.status, statusFilter as any));

	whereClauses.push(eq(users.role, 'Employee'));

	const allEmployees = await db
		.select({
			id: employees.id,
			userId: employees.userId,
			name: employees.name,
			email: users.email,
			role: users.role,
			department: departments.deptName,
			empType: employees.empType,
			jobTitle: employees.jobTitle,
			phoneNumber: employees.phoneNumber,
			address: employees.address,
			status: users.status,
			dateOfJoining: employees.dateOfJoining,
			isDeleted: employees.isDeleted,
			createdAt: employees.createdAt
		})
		.from(employees)
		.leftJoin(users, eq(employees.userId, users.id))
		.leftJoin(departments, eq(employees.departmentId, departments.id))
		.where(and(...whereClauses))
		.orderBy(asc(employees.id));

	const allDepartments = await db
		.select({ id: departments.id, deptName: departments.deptName })
		.from(departments)
		.orderBy(asc(departments.deptName));

	return {
		employees: allEmployees,
		departments: allDepartments
	};
};

export const actions: Actions = {
	createEmployee: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, 'Unauthorized');
		}

		const form = await request.formData();
		const name = form.get('name')?.toString().trim();
		const email = form.get('email')?.toString().trim();
		const role = form.get('role')?.toString();
		const empType = form.get('empType')?.toString();
		const probationEnd = form.get('probationEnd')?.toString()
			? new Date(form.get('probationEnd')!.toString()).toISOString().split('T')[0]
			: null;
		const departmentId = form.get('departmentId') ? Number(form.get('departmentId')) : null;
		const jobTitle = form.get('jobTitle')?.toString() ?? null;
		const phoneNumber = form.get('phoneNumber')?.toString() ?? null;
		const address = form.get('address')?.toString() ?? null;

		const dateOfJoining = form.get('dateOfJoining')?.toString()
			? new Date(form.get('dateOfJoining')!.toString())
			: new Date();

		if (!name || !email || !role || !empType) {
			return fail(400, { error: 'Required fields are missing.' });
		}

		const existing = await db.select().from(users).where(eq(users.email, email));
		if (existing.length > 0) {
			return fail(400, { error: 'Email already exists.' });
		}

		const passwordHash = await argon2.hash('123456');

		const [newUser] = await db
			.insert(users)
			.values({
				username: email.split('@')[0],
				name,
				email,
				passwordHash,
				role: role as any,
				status: 'Active' as any
			})
			.returning({ id: users.id });

		// Notify new user to change password
		await notifyPasswordChangeRequired({
			userId: newUser.id,
			username: email.split('@')[0]
		});

		// Notify the manager that a new user has been created
		await notifyManagerUserCreated({
			managerUserId: locals.user.id, // current manager creating the employee
			newUsername: email.split('@')[0],
			role: role as any
		});

		const [newEmployee] = await db
			.insert(employees)
			.values({
				userId: newUser.id,
				name,
				departmentId,
				empType: empType as any,
				jobTitle,
				dateOfJoining: new Date().toISOString().split('T')[0],
				probationEnd,
				phoneNumber,
				address
			})
			.returning({ id: employees.id });

		await generateLeaveBalanceForEmployee(newEmployee.id);

		const currentUserID = locals.user?.id;

		await logAuditAction({
			userID: currentUserID,
			employeeID: newEmployee.id,
			actionType: 'CREATE',
			action: 'Create Employee',
			targetTable: 'employees',
			targetID: newEmployee.id,
			details: `Created employee ${name} (${email})`,
			isUserVisible: true
		});

		return { type: 'success', data: { message: 'Employee created successfully.' } };
	},

	updateEmployee: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, '/auth/login');
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!id) return fail(400, { error: 'Employee ID missing.' });

		const name = form.get('name')?.toString().trim();
		const role = form.get('role')?.toString();
		const departmentId = form.get('departmentId') ? Number(form.get('departmentId')) : null;
		const jobTitle = form.get('jobTitle')?.toString() ?? null;
		const empType = form.get('empType')?.toString() ?? null;
		const probationEnd = form.get('probationEnd')?.toString()
			? new Date(form.get('probationEnd')!.toString()).toISOString().split('T')[0]
			: null;
		const phoneNumber = form.get('phoneNumber')?.toString() ?? null;
		const address = form.get('address')?.toString() ?? null;

		const employee = await db
			.select({ userId: employees.userId })
			.from(employees)
			.where(eq(employees.id, id))
			.limit(1);

		if (employee.length === 0) {
			return fail(404, { error: 'Employee not found.' });
		}

		await db
			.update(employees)
			.set({
				name,
				departmentId: departmentId ?? null,
				jobTitle,
				empType: empType ? (empType as any) : null,
				probationEnd,
				dateOfJoining: new Date().toISOString().split('T')[0],
				phoneNumber,
				address,
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

		await logAuditAction({
			userID: locals.user.id,
			employeeID: id,
			actionType: 'UPDATE',
			action: 'Update Employee',
			targetTable: 'employees',
			targetID: id,
			details: `Updated employee record ID ${id}`
		});

		return { success: true, message: 'Employee updated successfully.' };
	},

	deleteEmployee: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, '/auth/login');
		}

		const form = await request.formData();
		const id = Number(form.get('id'));
		if (!id) return fail(400, { error: 'Employee ID missing.' });

		await db
			.update(employees)
			.set({ isDeleted: true, updatedAt: new Date() })
			.where(eq(employees.id, id));

		await logAuditAction({
			userID: locals.user.id,
			employeeID: id,
			actionType: 'SOFT DELETE',
			action: 'Archive Employee',
			targetTable: 'employees',
			targetID: id,
			details: `Archived employee ID ${id}`
		});

		return { success: true, message: 'Employee archived successfully.' };
	},

	toggleStatus: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, '/auth/login');
		}

		const form = await request.formData();

		const formEntries = Array.from(form.entries());
		console.log('All form entries:', formEntries);

		const employeeId = form.get('employeeId');
		const status1 = form.get('status');
		const status2 = formEntries.find(([key]) => key === 'status')?.[1];

		console.log('Debug values:', {
			employeeId,
			employeeIdType: typeof employeeId,
			status1,
			status1Type: typeof status1,
			status2,
			status2Type: typeof status2
		});

		const employeeIdNum = Number(employeeId);
		if (!employeeIdNum || isNaN(employeeIdNum)) {
			console.log('Invalid employeeId:', employeeId);
			return fail(400, { error: 'Invalid employee ID.' });
		}

		const newStatus = status1?.toString() || status2?.toString();
		console.log('Final newStatus:', newStatus);

		if (!newStatus || (newStatus !== 'Active' && newStatus !== 'Inactive')) {
			console.log('Invalid status:', newStatus);
			return fail(400, { error: 'Invalid status. Must be Active or Inactive.' });
		}

		const employee = await db
			.select({ userId: employees.userId, name: employees.name })
			.from(employees)
			.where(eq(employees.id, employeeIdNum))
			.limit(1);

		if (employee.length === 0) {
			console.log('Employee not found with ID:', employeeId);
			return fail(404, { error: 'Employee not found.' });
		}

		console.log('Found employee:', employee[0]);

		const updateResult = await db
			.update(users)
			.set({ status: newStatus as any })
			.where(eq(users.id, employee[0].userId));

		console.log('Update result:', updateResult);

		const action = newStatus === 'Active' ? 'Employee Reactivated' : 'Employee Deactivated';

		await logAuditAction({
			userID: locals.user?.id,
			employeeID: employeeIdNum,
			actionType: 'UPDATE',
			action: action,
			targetTable: 'users', 
			targetID: employee[0].userId,
			details: `${action === 'Employee Reactivated' ? 'Reactivated' : 'Deactivated'} employee ${employee[0].name}`
		});

		return { success: true, message: `Employee set to ${newStatus.toLowerCase()}.` };
	},

	exportEmployees: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, '/auth/login');
		}

		await logAuditAction({
			userID: locals.user.id,
			employeeID: null,
			actionType: 'EXPORT',
			action: 'Export Employee Records',
			targetTable: 'employees',
			details: 'Exported employee list to file'
		});

		return { success: true, message: 'Export logged successfully.' };
	},

	restoreEmployee: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Manager') {
			throw error(403, '/auth/login');
		}

		const fd = await request.formData();
		const id = Number(fd.get('id'));

		await db
			.update(employees)
			.set({ isDeleted: false, updatedAt: new Date() })
			.where(eq(employees.id, id));

		await logAuditAction({
			userID: locals.user.id,
			employeeID: id,
			actionType: 'RESTORE',
			action: 'Restore Employee',
			targetTable: 'employees',
			targetID: id,
			details: `Restored employee ID ${id}`
		});

		return { success: true, message: 'Employee restored successfully.' };
	}
};
