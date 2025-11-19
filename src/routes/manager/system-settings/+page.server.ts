import { fail, json, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { departments } from '$lib/server/db/schema/department';
import { systemSettings } from '$lib/server/db/schema/systemSettings';
import { holidays } from '$lib/server/db/schema/holiday';
import { geofenceLocations } from '$lib/server/db/schema/geofenceLocation';
import { workingPatterns } from '$lib/server/db/schema/workingPattern';
import { eq, and, ne, or, gte, lte, ilike, sql } from 'drizzle-orm';
import { leaveTypes } from '$lib/server/db/schema/leaveType.js';
import { leaveEntitlementRules } from '$lib/server/db/schema/leaveEntitlementRule.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import { employees } from '$lib/server/db/schema/employee';
import {
	attendance,
	auditLogs,
	leaveApplications,
	leaveBalances,
	punch
} from '$lib/server/db/schema';

export const load = async ({ locals }) => {
	// Restrict to Managers only
	if (!locals.user || locals.user.role !== 'Manager') {
		throw redirect(303, '/auth/login');
	}

	const departmentList = await db.select().from(departments);
	const generalSettings = await db.select().from(systemSettings);
	const holidayList = await db.select().from(holidays);
	const geofenceList = await db.select().from(geofenceLocations);
	const workingPatternList = await db.select().from(workingPatterns);
	const leaveTypesList = await db.select().from(leaveTypes);
	const leaveEntitlementRulesList = await db.select().from(leaveEntitlementRules);

	const workingHours = await db
		.select()
		.from(systemSettings)
		.where(eq(systemSettings.category, 'WorkingHours'));

	const parsed = workingHours.map((r) => ({ ...r, ...JSON.parse(r.value || '{}') })); // Parse JSON values

	let companySettings = {
		name: '',
		regNo: '',
		address: '',
		city: '',
		country: '',
		email: '',
		phone: '',
		logoPath: null
	};

	const companyProfileRecord = generalSettings.find(
		(setting) => setting.category === 'General' && setting.keyName === 'company_profile'
	);

	if (companyProfileRecord) {
		try {
			const valueData = JSON.parse(companyProfileRecord.value || '{}');
			companySettings = {
				...companySettings,
				...valueData
			};
		} catch (e) {
			console.error('Error parsing company profile JSON:', e);
		}
	}

	const notificationSettings = await db
		.select()
		.from(systemSettings)
		.where(
			and(
				eq(systemSettings.category, 'Notifications'),
				eq(systemSettings.keyName, 'default_notifications')
			)
		);

	let notifications = {
		leaveEvents: { email: true, inApp: true },
		attendanceAlerts: { email: true, inApp: false },
		systemUpdates: { email: true, inApp: true },
		reminders: { email: false, inApp: true }
	};

	if (notificationSettings.length > 0 && notificationSettings[0].value) {
		try {
			notifications = JSON.parse(notificationSettings[0].value);
		} catch (error) {
			console.warn('Invalid notification JSON, using defaults.');
		}
	}

	return {
		departments: departmentList,
		generalSettings: companySettings,
		holidays: holidayList,
		geofences: geofenceList,
		workingPatterns: workingPatternList,
		leaveTypes: leaveTypesList,
		leaveEntitlementRules: leaveEntitlementRulesList,
		workingHours: parsed,
		notifications
	};
};

export const actions = {
	// ------------------------------------
	// 1. DEPARTMENT TAB ACTIONS
	// ------------------------------------
	createDepartment: async ({ request, locals }) => {
		const formData = await request.formData();
		const deptName = formData.get('deptName')?.toString();
		const description = formData.get('description')?.toString() || null;

		if (!deptName || deptName.length < 3) {
			return fail(400, {
				error: 'Department name is required and must be at least 3 characters.',
				deptName,
				description
			});
		}

		try {
			const existing = await db
				.select()
				.from(departments)
				.where(sql`LOWER(${departments.deptName}) = LOWER(${deptName})`);
			if (existing.length > 0) {
				return fail(400, { error: `Department '${deptName}' already exists.` });
			}

			const [newDept] = await db.insert(departments).values({ deptName, description }).returning();

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'CREATE',
				action: 'Create Department',
				targetTable: 'departments',
				targetID: newDept.id,
				details: JSON.stringify({ deptName, description }),
				isUserVisible: true
			});

			return { success: true, message: `Department '${deptName}' created successfully.` };
		} catch (e: any) {
			console.error('Error creating department:', e);

			if (e.code === '23505') {
				return fail(400, { error: `Department '${deptName}' already exists.` });
			}

			return fail(500, { error: 'Database error: Could not create department.' });
		}
	},

	updateDepartment: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const deptName = formData.get('deptName')?.toString().trim();
		const description = formData.get('description')?.toString().trim() || null;

		if (!id || !deptName) {
			return fail(400, { error: 'Invalid data submitted.' });
		}

		try {
			await db.update(departments).set({ deptName, description }).where(eq(departments.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'UPDATE',
				action: 'Update Department',
				targetTable: 'departments',
				targetID: id,
				details: JSON.stringify({ deptName, description }),
				isUserVisible: true
			});
			return { success: true, message: `Department '${deptName}' updated successfully.` };
		} catch (e) {
			console.error('Error updating department:', e);
			return fail(500, { error: 'Database error: Could not update department.' });
		}
	},

	deleteDepartment: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { error: 'Missing department ID.' });
		}

		const linkedEmployees = await db.select().from(employees).where(eq(employees.departmentId, id));
		if (linkedEmployees.length > 0) {
			return fail(400, {
				error: `Cannot delete department — it’s assigned to ${linkedEmployees.length} employee(s).`
			});
		}

		try {
			await db.delete(departments).where(eq(departments.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'DELETE',
				action: 'Delete Department',
				targetTable: 'departments',
				targetID: id,
				details: `Deleted department with ID=${id}`,
				isUserVisible: true
			});

			return { success: true, message: `Department ID ${id} deleted successfully.` };
		} catch (e) {
			console.error('Error deleting department:', e);
			return fail(500, { error: 'Database error: Could not delete department.' });
		}
	},

	// ------------------------------------
	// 2. LEAVE TYPES CRUD
	// ------------------------------------

	createLeaveType: async ({ request, locals }) => {
		const formData = await request.formData();
		const typeName = formData.get('typeName')?.toString()?.trim();
		const isPaid = !!formData.get('isPaid');
		const maxDaysPerYear = Number(formData.get('maxDaysPerYear')) || null;
		const isCarryForward = !!formData.get('isCarryForward');
		const carryForwardDays = Number(formData.get('carryForwardDays')) || 0;
		const requiresDoc = !!formData.get('requiresDoc');

		if (!typeName) {
			return fail(400, { error: 'Leave Type Name is required.' });
		}

		if (isCarryForward && carryForwardDays <= 0) {
			return fail(400, {
				error: 'Carry Forward Days must be greater than 0 when Carry Forward is enabled.'
			});
		}

		if (maxDaysPerYear !== null && maxDaysPerYear < 0) {
			return fail(400, { error: 'Max Days per Year cannot be negative.' });
		}

		try {
			const [newType] = await db
				.insert(leaveTypes)
				.values({
					typeName,
					isPaid,
					maxDaysPerYear,
					isCarryForward,
					carryForwardDays,
					requiresDoc
				})
				.returning({ id: leaveTypes.id });

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'CREATE',
				action: 'Create Leave Type',
				targetTable: 'leave_types',
				targetID: newType.id,
				details: `Created leave type '${typeName}' (Paid: ${isPaid ? 'Yes' : 'No'}, Carry Forward: ${isCarryForward ? 'Yes' : 'No'})`,
				isUserVisible: true
			});

			return { success: true, message: `Leave type '${typeName}' created successfully.` };
		} catch (e: any) {
			console.error('Error creating leave type:', e);
			if (e.code === '23505') {
				return fail(400, { error: `Leave type '${typeName}' already exists.` });
			}
			return fail(500, { error: 'Database error: Could not create leave type.' });
		}
	},

	updateLeaveType: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const typeName = formData.get('typeName')?.toString()?.trim();
		const isPaid = formData.get('isPaid') === 'true';
		const maxDaysPerYear = Number(formData.get('maxDaysPerYear')) || null;
		const isCarryForward = formData.get('isCarryForward') === 'true';
		const carryForwardDays = Number(formData.get('carryForwardDays')) || 0;
		const requiresDoc = formData.get('requiresDoc') === 'true';

		if (!id || !typeName) return fail(400, { error: 'Invalid data submitted.' });

		if (!typeName) {
			return fail(400, { error: 'Leave Type Name is required.' });
		}

		if (isCarryForward && carryForwardDays <= 0) {
			return fail(400, {
				error: 'Carry Forward Days must be greater than 0 when Carry Forward is enabled.'
			});
		}

		if (maxDaysPerYear !== null && maxDaysPerYear < 0) {
			return fail(400, { error: 'Max Days per Year cannot be negative.' });
		}

		try {
			await db
				.update(leaveTypes)
				.set({
					typeName,
					isPaid,
					maxDaysPerYear,
					isCarryForward,
					carryForwardDays,
					requiresDoc
				})
				.where(eq(leaveTypes.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'UPDATE',
				action: 'Update Leave Type',
				targetTable: 'leave_types',
				targetID: id,
				details: `Updated leave type '${typeName}' (ID=${id}) with new values: Paid=${isPaid}, CarryForward=${isCarryForward}, CarryDays=${carryForwardDays}, RequiresDoc=${requiresDoc}`,
				isUserVisible: true
			});

			return { success: true, message: `Leave type '${typeName}' updated successfully.` };
		} catch (e) {
			console.error('Error updating leave type:', e);
			return fail(500, { error: 'Database error: Could not update leave type.' });
		}
	},

	deleteLeaveType: async ({ request, locals }) => {
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const linkedApps = await db
			.select()
			.from(leaveApplications)
			.where(eq(leaveApplications.leaveTypeID, id));
		const linkedBalances = await db
			.select()
			.from(leaveBalances)
			.where(eq(leaveBalances.leaveTypeID, id));
		const linkedEntRules = await db
			.select()
			.from(leaveEntitlementRules)
			.where(eq(leaveEntitlementRules.leaveTypeID, id));

		if (linkedApps.length || linkedBalances.length || linkedEntRules.length) {
			return fail(400, {
				error:
					'This leave type cannot be deleted — it is linked to existing leave records, balances, or entitlement rules.'
			});
		}

		if (!id) return fail(400, { error: 'Missing leave type ID.' });

		try {
			await db.delete(leaveTypes).where(eq(leaveTypes.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'DELETE',
				action: 'Delete Leave Type',
				targetTable: 'leave_types',
				targetID: id,
				details: `Deleted leave type with ID=${id}`,
				isUserVisible: true
			});

			return { success: true, message: `Leave type ID ${id} deleted successfully.` };
		} catch (e) {
			console.error('Error deleting leave type:', e);
			return fail(500, { error: 'Database error: Could not delete leave type.' });
		}
	},

	// ------------------------------------
	// 3. LEAVE ENTITLEMENT CRUD
	// ------------------------------------

	createEntitlement: async ({ request, locals }) => {
		const data = await request.formData();
		const leaveTypeID = Number(data.get('leaveTypeID'));
		const empType = data.get('empType')?.toString() as 'Permanent' | 'Probation' | 'Intern';
		const minYearsOfService = Number(data.get('minYearsOfService'));
		const maxYearsOfService = Number(data.get('maxYearsOfService'));
		const entitlementDays = Number(data.get('entitlementDays'));
		const effectiveFrom = data.get('effective_from')?.toString() || null;
		const effectiveTo = data.get('effective_to')?.toString() || null;

		if (!leaveTypeID || !empType || !entitlementDays || !effectiveFrom) {
			return fail(400, {
				error:
					'Leave type, employment type, entitlement days, and effective from date are required.'
			});
		}

		if (minYearsOfService < 0 || maxYearsOfService < 0) {
			return fail(400, { error: 'Years of service cannot be negative.' });
		}

		if (maxYearsOfService && maxYearsOfService < minYearsOfService) {
			return fail(400, { error: 'Maximum years of service cannot be less than minimum years.' });
		}

		// Prevent duplicate rules (same leaveType + empType + years overlap)
		const existing = await db
			.select()
			.from(leaveEntitlementRules)
			.where(
				and(
					eq(leaveEntitlementRules.leaveTypeID, leaveTypeID),
					eq(leaveEntitlementRules.empType, empType)
				)
			);

		if (
			existing.some((r) => {
				const min = r.minYearsOfService ?? 0;
				const max = r.maxYearsOfService ?? 999;
				return (
					(minYearsOfService >= min && minYearsOfService <= max) ||
					(maxYearsOfService >= min && maxYearsOfService <= max)
				);
			})
		) {
			return fail(400, {
				error: 'An entitlement rule already exists for this employment type and year range.'
			});
		}

		const [newEntitlement] = await db
			.insert(leaveEntitlementRules)
			.values({
				leaveTypeID,
				empType,
				minYearsOfService,
				maxYearsOfService,
				entitlementDays,
				effectiveFrom,
				effectiveTo
			})
			.returning({ id: leaveEntitlementRules.id });

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'CREATE',
			action: 'Create Leave Entitlement',
			targetTable: 'leave_entitlement_rules',
			targetID: newEntitlement.id,
			details: `Created leave entitlement for type ID ${leaveTypeID}, ${empType} employees.`,
			isUserVisible: false
		});

		return { success: true, message: 'Leave Entitlement created successfully.' };
	},

	updateEntitlement: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const leaveTypeID = Number(data.get('leaveTypeID'));
		const empType = data.get('empType')?.toString() as 'Permanent' | 'Probation' | 'Intern';
		const minYearsOfService = Number(data.get('minYearsOfService'));
		const maxYearsOfService = Number(data.get('maxYearsOfService'));
		const entitlementDays = Number(data.get('entitlementDays'));
		const effectiveFrom = data.get('effective_from')?.toString() || null;
		const effectiveTo = data.get('effective_to')?.toString() || null;

		if (!id || !leaveTypeID || !empType || !entitlementDays) {
			return fail(400, { error: 'Missing required fields for update.' });
		}

		await db
			.update(leaveEntitlementRules)
			.set({
				leaveTypeID,
				empType,
				minYearsOfService,
				maxYearsOfService,
				entitlementDays,
				effectiveFrom,
				effectiveTo
			})
			.where(eq(leaveEntitlementRules.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'UPDATE',
			action: 'Update Leave Entitlement',
			targetTable: 'leave_entitlement_rules',
			targetID: id,
			details: `Updated entitlement rule ID ${id}`,
			isUserVisible: false
		});

		return { success: true, message: 'Leave Entitlement updated successfully.' };
	},

	deleteEntitlement: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		if (!id) return fail(400, { error: 'Missing entitlement ID.' });

		// Prevent deletion if linked to leave balances
		const linked = await db
			.select()
			.from(leaveBalances)
			.where(eq(leaveBalances.leaveEntitlementRuleID, id));

		if (linked.length > 0) {
			return fail(400, {
				error:
					'Cannot delete this entitlement rule because it is linked to existing leave balances.'
			});
		}

		await db.delete(leaveEntitlementRules).where(eq(leaveEntitlementRules.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'DELETE',
			action: 'Delete Leave Entitlement',
			targetTable: 'leave_entitlement_rules',
			targetID: id,
			details: `Deleted entitlement rule ID ${id}`,
			isUserVisible: false
		});

		return { success: true, message: 'Leave Entitlement deleted successfully.' };
	},

	// ------------------------------------
	// 4. WORKING HOURS CRUD
	// ------------------------------------

	createWorkingHour: async ({ request, locals }) => {
		const data = await request.formData();
		const title = data.get('title')?.toString() || '';
		const start = data.get('start')?.toString() || '';
		const end = data.get('end')?.toString() || '';
		const graceMinutes = Number(data.get('graceMinutes') || 0);

		if (!title || !start || !end)
			return fail(400, { error: 'Title, start time and end time are required.' });

		if (start >= end) return fail(400, { error: 'Start time must be earlier than end time.' });

		const existing = await db
			.select()
			.from(systemSettings)
			.where(and(eq(systemSettings.category, 'WorkingHours')));

		const duplicates = existing.find((e) => {
			if (!e.value) return false;
			const v = JSON.parse(e.value);
			return v.title.toLowerCase() === title.toLowerCase();
		});

		if (duplicates) {
			return fail(400, { error: `A working hour titled "${title}" already exists.` });
		}

		const jsonValue = JSON.stringify({ title, start, end, graceMinutes });

		const [newRecord] = await db
			.insert(systemSettings)
			.values({
				category: 'WorkingHours',
				keyName: `working_hours`,
				value: jsonValue,
				description: 'Working hours configuration',
				updatedBy: locals.user?.id ?? null
			})
			.returning({ id: systemSettings.id });

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'CREATE',
			action: 'Create Working Hour',
			targetTable: 'system_settings',
			targetID: newRecord.id,
			details: `Created working hour: ${title}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working hour added successfully.' };
	},

	updateWorkingHour: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const title = data.get('title')?.toString() || '';
		const start = data.get('start')?.toString() || '';
		const end = data.get('end')?.toString() || '';
		const graceMinutes = Number(data.get('graceMinutes') || 0);

		if (!id || !title || !start || !end) {
			return fail(400, { error: 'All fields are required for updating working hours.' });
		}

		const record = await db
			.select()
			.from(systemSettings)
			.where(and(eq(systemSettings.id, id), eq(systemSettings.category, 'WorkingHours')))
			.limit(1);

		if (record.length === 0) {
			return fail(404, { error: 'Working hour record not found.' });
		}

		const jsonValue = JSON.stringify({ title, start, end, graceMinutes });

		await db
			.update(systemSettings)
			.set({
				value: jsonValue,
				updatedBy: locals.user?.id ?? null,
				updatedAt: new Date()
			})
			.where(and(eq(systemSettings.id, id), eq(systemSettings.category, 'WorkingHours')));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'UPDATE',
			action: 'Update Working Hour',
			targetTable: 'system_settings',
			targetID: id,
			details: `Updated working hour to: ${title}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working hour updated successfully.' };
	},

	deleteWorkingHour: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) {
			return fail(400, { error: 'Invalid working hour ID.' });
		}

		const [record] = await db
			.select()
			.from(systemSettings)
			.where(and(eq(systemSettings.id, id), eq(systemSettings.category, 'WorkingHours')));

		if (!record) {
			return fail(404, { error: 'Working hour not found.' });
		}

		//const linked = await db.select().from(attendance).where(eq(attendance.workingHourId, id)); // <-- only if attendance table has this FK

		//if (linked.length > 0) {
		//	return fail(400, {
		//		error: 'Cannot delete working hour because it is linked to active attendance records.'
		//	});
		//}

		await db
			.delete(systemSettings)
			.where(and(eq(systemSettings.id, id), eq(systemSettings.category, 'WorkingHours')));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'DELETE',
			action: 'Delete Working Hour',
			targetTable: 'system_settings',
			targetID: id,
			details: `Deleted working hour ID: ${id}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working hour deleted successfully.' };
	},

	// ------------------------------------
	// 5. WORKING PATTERNS CRUD
	// ------------------------------------

	createWorkingPattern: async ({ request, locals }) => {
		const data = await request.formData();
		const jobTitle = data.get('jobTitle')?.toString().trim() || '';
		const weekPattern = data.get('weekPattern')?.toString().trim() || '';
		const startTime = data.get('startTime')?.toString() || '';
		const endTime = data.get('endTime')?.toString() || '';
		const effectiveFrom = data.get('effectiveFrom')?.toString() || '';
		const effectiveTo = data.get('effectiveTo')?.toString() || null;

		const workDaysRaw = data.get('workDays')?.toString() ?? '[]';
		let workDays: string[] = [];
		try {
			workDays = JSON.parse(workDaysRaw) as string[];
		} catch (e) {
			return fail(400, { error: 'Invalid workDays format. Expecting JSON array.' });
		}

		const newWeeks = weekPattern.split(',').map((w) => w.trim());

		const existingPatterns = await db
			.select()
			.from(workingPatterns)
			.where(eq(workingPatterns.jobTitle, jobTitle));

		for (const pattern of existingPatterns) {
			const existingWeeks = (pattern.weekPattern ?? '').split(',').map((w) => w.trim());
			const weekOverlap = newWeeks.some((w) => existingWeeks.includes(w));

			if (weekOverlap) {
				const existingDays = (pattern.workDays as string[]) ?? [];
				const dayOverlap = workDays.some((d) => existingDays.includes(d));

				if (dayOverlap) {
					return fail(400, {
						error: `Conflict detected: overlapping work days (${workDays.join(', ')}) for ${jobTitle} in the same week pattern (${weekPattern}).`
					});
				}
			}
		}

		if (!jobTitle || !startTime || !endTime || !effectiveFrom) {
			return fail(400, {
				error: 'Job title, start time, end time, and effective from date are required.'
			});
		}

		const [newPattern] = await db
			.insert(workingPatterns)
			.values({
				jobTitle,
				weekPattern,
				workDays,
				startTime,
				endTime,
				effectiveFrom,
				effectiveTo
			})
			.returning({ id: workingPatterns.id });

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'CREATE',
			action: 'Create Working Pattern',
			targetTable: 'working_patterns',
			targetID: newPattern.id,
			details: `Created working pattern for job title: ${jobTitle}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working pattern added successfully.' };
	},

	updateWorkingPattern: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const jobTitle = data.get('jobTitle')?.toString().trim() || '';
		const startTime = data.get('startTime')?.toString() || '';
		const endTime = data.get('endTime')?.toString() || '';
		const effectiveFrom = data.get('effectiveFrom')?.toString() || '';
		const effectiveTo = data.get('effectiveTo')?.toString() || null;
		const weekPattern = data.get('weekPattern')?.toString().trim() || '';
		const workDaysRaw = data.get('workDays')?.toString() ?? '[]';

		let workDays: string[] = [];
		try {
			workDays = JSON.parse(workDaysRaw) as string[];
		} catch (e) {
			return fail(400, { error: 'Invalid workDays format. Expecting JSON array.' });
		}

		if (!id || !jobTitle || !startTime || !endTime || !effectiveFrom) {
			return fail(400, { error: 'Missing required fields for update.' });
		}

		const newWeeks = (weekPattern ?? '')
			.split(',')
			.map((w) => w.trim())
			.filter(Boolean);

		const existingPatterns = await db
			.select()
			.from(workingPatterns)
			.where(and(eq(workingPatterns.jobTitle, jobTitle), ne(workingPatterns.id, id)));

		for (const pattern of existingPatterns) {
			const existingWeeks = (pattern.weekPattern ?? '')
				.split(',')
				.map((w) => w.trim())
				.filter(Boolean);

			const weekOverlap = newWeeks.some((w) => existingWeeks.includes(w));

			if (weekOverlap) {
				const existingDays = (pattern.workDays as string[]) ?? [];
				const dayOverlap = workDays.some((d: string) => existingDays.includes(d));

				if (dayOverlap) {
					return fail(400, {
						error: `Conflict detected: overlapping work days (${workDays.join(', ')}) for ${jobTitle} in the same week pattern (${weekPattern}).`
					});
				}
			}
		}

		await db
			.update(workingPatterns)
			.set({
				jobTitle,
				weekPattern,
				workDays,
				startTime,
				endTime,
				effectiveFrom,
				effectiveTo
			})
			.where(eq(workingPatterns.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'UPDATE',
			action: 'Update Working Pattern',
			targetTable: 'working_patterns',
			targetID: id,
			details: `Updated working pattern for job title: ${jobTitle}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working pattern updated successfully.' };
	},

	deleteWorkingPattern: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) return fail(400, { error: 'Missing pattern ID.' });

		const linkedEmployees = await db
			.select()
			.from(employees)
			.where(eq(employees.jobTitle, workingPatterns.jobTitle));

		if (linkedEmployees.length > 0) {
			return fail(400, {
				error: 'Cannot delete this working pattern — employees are linked to it.'
			});
		}

		if (!id) return fail(400, { error: 'Missing working pattern ID.' });

		await db.delete(workingPatterns).where(eq(workingPatterns.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'DELETE',
			action: 'Delete Working Pattern',
			targetTable: 'working_patterns',
			targetID: id,
			details: `Deleted working pattern ID: ${id}`,
			isUserVisible: false
		});

		return { success: true, message: 'Working pattern deleted successfully.' };
	},

	// ------------------------------------
	// 6. GEOFENCES CRUD
	// ------------------------------------

	createGeofence: async ({ request, locals }) => {
		const data = await request.formData();

		const name = data.get('name')?.toString()?.trim() || '';
		const latitudeNum = parseFloat(data.get('latitude') as string);
		const longitudeNum = parseFloat(data.get('longitude') as string);
		const radiusMeters = parseInt(data.get('radiusMeters') as string) || 100;
		const isActive = data.get('isActive') === 'on' || data.get('isActive') === 'true';

		if (!name) return fail(400, { error: 'Name is required.' });
		if (!name || name.length < 3) {
			return fail(400, { error: 'Geofence name must be at least 3 characters.' });
		}
		if (Number.isNaN(latitudeNum) || Number.isNaN(longitudeNum)) {
			return fail(400, { error: 'Valid latitude and longitude are required.' });
		}
		if (Number.isNaN(radiusMeters) || radiusMeters <= 0) {
			return fail(400, { error: 'Radius must be a positive integer.' });
		}

		try {
			// --- Duplicate Check (case-insensitive) ---
			const existing = await db
				.select()
				.from(geofenceLocations)
				.where(sql`LOWER(${geofenceLocations.name}) = LOWER(${name})`);
			if (existing.length > 0) {
				return fail(400, { error: `Geofence '${name}' already exists.` });
			}

			// --- Normalize numeric precision ---
			const latitude = latitudeNum.toFixed(6);
			const longitude = longitudeNum.toFixed(6);

			const [newGeo] = await db
				.insert(geofenceLocations)
				.values({ name, latitude, longitude, radiusMeters, isActive })
				.returning();

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'CREATE',
				action: 'Create Geofence',
				targetTable: 'geofence_locations',
				targetID: newGeo.id,
				details: JSON.stringify({ name, latitude, longitude, radiusMeters, isActive }),
				isUserVisible: true
			});

			return { success: true, message: `Geofence '${name}' created successfully.` };
		} catch (e) {
			console.error('Error creating geofence:', e);
			return fail(500, { error: 'Database error: Could not create geofence.' });
		}
	},

	updateGeofence: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const name = data.get('name')?.toString()?.trim() || '';
		const latitudeNum = parseFloat(data.get('latitude') as string);
		const longitudeNum = parseFloat(data.get('longitude') as string);
		const radiusMeters = parseInt(data.get('radiusMeters') as string) || 100;
		const isActive = data.get('isActive') === 'on' || data.get('isActive') === 'true';

		if (!id || !name) return fail(400, { error: 'ID and name are required.' });
		if (Number.isNaN(latitudeNum) || Number.isNaN(longitudeNum)) {
			return fail(400, { error: 'Valid latitude and longitude are required.' });
		}
		if (Number.isNaN(radiusMeters) || radiusMeters <= 0) {
			return fail(400, { error: 'Radius must be a positive integer.' });
		}

		try {
			const existing = await db
				.select()
				.from(geofenceLocations)
				.where(
					and(sql`LOWER(${geofenceLocations.name}) = LOWER(${name})`, ne(geofenceLocations.id, id))
				);
			if (existing.length > 0) {
				return fail(400, { error: `Another geofence named '${name}' already exists.` });
			}

			const latitude = latitudeNum.toFixed(6);
			const longitude = longitudeNum.toFixed(6);

			await db
				.update(geofenceLocations)
				.set({ name, latitude, longitude, radiusMeters, isActive })
				.where(eq(geofenceLocations.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'UPDATE',
				action: 'Update Geofence',
				targetTable: 'geofence_locations',
				targetID: id,
				details: JSON.stringify({ name, latitude, longitude, radiusMeters, isActive }),
				isUserVisible: true
			});

			return { success: true, message: `Geofence '${name}' updated successfully.` };
		} catch (e) {
			console.error('Error updating geofence:', e);
			return fail(500, { error: 'Database error: Could not update geofence.' });
		}
	},

	deleteGeofence: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) return fail(400, { error: 'Missing geofence ID.' });

		try {
			// --- Linked Data Check ---
			//const linkedPunches = await db.select().from(punch).where(eq(punch.geofenceID, id));
			//if (linkedPunches.length > 0) {
			//	return fail(400, {
			//		error: `Cannot delete geofence — it’s linked to ${linkedPunches.length} attendance record(s).`
			//	});
			//}

			await db.delete(geofenceLocations).where(eq(geofenceLocations.id, id));

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'DELETE',
				action: 'Delete Geofence',
				targetTable: 'geofence_locations',
				targetID: id,
				details: `Deleted geofence with ID=${id}`,
				isUserVisible: true
			});

			return { success: true, message: `Geofence '${name}' deleted successfully.` };
		} catch (e) {
			console.error('Error deleting geofence:', e);
			return fail(500, { error: 'Database error: Could not delete geofence.' });
		}
	},

	// ------------------------------------
	// 7. PUBLIC HOLIDAYS CRUD
	// ------------------------------------
	createHoliday: async ({ request, locals }) => {
		const data = await request.formData();
		const holidayName = data.get('holidayName')?.toString().trim() || '';
		const startDate = data.get('startDate')?.toString() || '';
		const endDate = data.get('endDate')?.toString() || '';
		const isRecurring = data.get('isRecurring') === 'true' || data.get('isRecurring') === 'on';
		const type = data.get('type')?.toString() || null;

		if (!holidayName || !startDate)
			return fail(400, { error: 'Holiday name and start date are required.' });

		if (endDate && new Date(startDate) > new Date(endDate))
			return fail(400, { error: 'Start date cannot be after end date.' });

		const duplicateName = await db
			.select()
			.from(holidays)
			.where(eq(holidays.holidayName, holidayName));

		if (duplicateName.length > 0)
			return fail(400, { error: `Holiday '${holidayName}' already exists.` });

		const overlaps = await db
			.select()
			.from(holidays)
			.where(
				or(
					and(gte(holidays.endDate, startDate), lte(holidays.startDate, endDate || startDate)),
					and(lte(holidays.startDate, endDate || startDate), gte(holidays.endDate, startDate))
				)
			);

		if (overlaps.length > 0) return fail(400, { error: 'Overlapping holiday dates detected.' });

		const inserted = await db
			.insert(holidays)
			.values({
				holidayName,
				startDate,
				endDate: endDate || startDate,
				isRecurring,
				type
			})
			.returning({ id: holidays.id });

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'CREATE',
			action: 'Created a holiday',
			targetTable: 'holidays',
			targetID: inserted[0].id,
			details: JSON.stringify({ holidayName, startDate, endDate, isRecurring, type }),
			isUserVisible: true
		});

		return { success: true, message: `Holiday '${holidayName}' added successfully.` };
	},

	updateHoliday: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));
		const holidayName = data.get('holidayName')?.toString().trim() || '';
		const startDate = data.get('startDate')?.toString() || '';
		const endDate = data.get('endDate')?.toString() || '';
		const isRecurring = data.get('isRecurring') === 'true' || data.get('isRecurring') === 'on';
		const type = data.get('type')?.toString() || null;

		if (!id || !holidayName || !startDate) return fail(400, { error: 'Missing required fields.' });

		if (endDate && new Date(startDate) > new Date(endDate))
			return fail(400, { error: 'Start date cannot be after end date.' });

		const duplicate = await db
			.select()
			.from(holidays)
			.where(and(eq(holidays.holidayName, holidayName), ne(holidays.id, id)));

		if (duplicate.length > 0)
			return fail(400, { error: `Another holiday with name '${holidayName}' already exists.` });

		const overlaps = await db
			.select()
			.from(holidays)
			.where(
				and(
					or(
						and(gte(holidays.endDate, startDate), lte(holidays.startDate, endDate || startDate)),
						and(lte(holidays.startDate, endDate || startDate), gte(holidays.endDate, startDate))
					),
					ne(holidays.id, id)
				)
			);

		if (overlaps.length > 0) return fail(400, { error: 'Overlapping holiday dates detected.' });

		await db
			.update(holidays)
			.set({
				holidayName,
				startDate,
				endDate: endDate || startDate,
				isRecurring,
				type
			})
			.where(eq(holidays.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'UPDATE',
			action: 'Updated a holiday',
			targetTable: 'holidays',
			targetID: id,
			details: JSON.stringify({ holidayName, startDate, endDate, isRecurring, type }),
			isUserVisible: true
		});

		return { success: true, message: `Holiday '${holidayName}' updated successfully.` };
	},

	deleteHoliday: async ({ request, locals }) => {
		const data = await request.formData();
		const id = Number(data.get('id'));

		if (!id) return fail(400, { error: 'Missing holiday ID.' });

		//const linked = await db.select().from(leaveEntitlements).where(eq(leaveEntitlements.holidayID, id));
		//if (linked.length > 0)
		//	return fail(400, { error: 'This holiday is linked to leave entitlements and cannot be deleted.' });

		const existing = await db.select().from(holidays).where(eq(holidays.id, id));
		if (existing.length === 0) return fail(404, { error: 'Holiday not found.' });

		await db.delete(holidays).where(eq(holidays.id, id));

		await db.insert(auditLogs).values({
			userID: locals.user?.id ?? null,
			employeeID: null,
			actionType: 'DELETE',
			action: 'Deleted a holiday',
			targetTable: 'holidays',
			targetID: id,
			details: JSON.stringify(existing[0]),
			isUserVisible: true
		});

		return { success: true, message: `Holiday '${existing[0].holidayName}' deleted successfully.` };
	},

	// ------------------------------------
	// 8. GENERAL CRUD
	// ------------------------------------

	updateCompanyInfo: async ({ request, locals }) => {
		const data = await request.formData();

		const name = data.get('name')?.toString()?.trim() || '';
		const regNo = data.get('regNo')?.toString()?.trim() || '';
		const address = data.get('address')?.toString()?.trim() || '';
		const country = data.get('country')?.toString()?.trim() || '';
		const email = data.get('email')?.toString()?.trim() || '';
		const phone = data.get('phone')?.toString()?.trim() || '';

		const logoFile = data.get('logo') as File;

		let logoPath = null;
		if (logoFile && typeof logoFile.name === 'string' && logoFile.size > 0) {
			const uploadDir = 'static/uploads';
			if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

			const fileExt = path.extname(logoFile.name);
			const fileName = `logo_${Date.now()}${fileExt}`;
			const filePath = path.join(uploadDir, fileName);

			const arrayBuffer = await logoFile.arrayBuffer();
			writeFileSync(filePath, Buffer.from(arrayBuffer));
			logoPath = `/uploads/${fileName}`;
		}

		const value = JSON.stringify({
			name,
			regNo,
			address,
			country,
			email,
			phone,
			logoPath
		});

		if (!name || !email || !phone || !regNo || !address || !country) {
			return fail(400, { error: 'All fields are required.' });
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, { error: 'Invalid email format.' });
		}

		if (!/^[\+]?[0-9\s\-\(\)]{10,}$/.test(phone)) {
			return fail(400, { error: 'Invalid phone number.' });
		}

		try {
			const existing = await db
				.select()
				.from(systemSettings)
				.where(eq(systemSettings.category, 'General'));

			if (existing.length > 0) {
				await db
					.update(systemSettings)
					.set({
						value,
						updatedAt: new Date(),
						updatedBy: locals.user?.id ?? null
					})
					.where(eq(systemSettings.category, 'General'));
			} else {
				await db.insert(systemSettings).values({
					category: 'General',
					keyName: 'company_profile',
					value,
					description: 'Company general info',
					updatedBy: locals.user?.id ?? null
				});
			}

			await db.insert(auditLogs).values({
				userID: locals.user?.id ?? null,
				employeeID: null,
				actionType: 'UPDATE',
				action: 'Update Company Info',
				targetTable: 'system_settings',
				targetID: existing?.[0]?.id ?? null,
				details: `Updated company info: ${name}, ${regNo}, ${email}, ${phone}, ${address}, ${country}, ${logoPath ?? 'No change'}`,
				isUserVisible: true
			});

			return { success: true, message: 'Company information updated successfully.' };
		} catch (error) {
			console.error('Database error in updateCompanyInfo:', error);
			return fail(500, { error: 'Database error: Could not save company information.' });
		}
	},

	// ------------------------------------
	// 9. NOTIFICATIONS CRUD
	// ------------------------------------

	saveNotificationPreferences: async ({ request, locals }) => {
		try {
			const formData = await request.formData();
			const notificationsJson = formData.get('notifications')?.toString();

			if (!notificationsJson) {
				return fail(400, { error: 'No notification data provided.' });
			}

			let notifications;
			try {
				notifications = JSON.parse(notificationsJson);
			} catch {
				return fail(400, { error: 'Invalid JSON format in notification data.' });
			}

			const existingSettings = await db
				.select()
				.from(systemSettings)
				.where(
					and(
						eq(systemSettings.category, 'Notifications'),
						eq(systemSettings.keyName, 'default_notifications')
					)
				);

			const userID = locals.user?.id ?? null;
			const now = new Date();
			let actionType: 'CREATE' | 'UPDATE' = 'CREATE';

			if (existingSettings.length > 0) {
				await db
					.update(systemSettings)
					.set({
						value: JSON.stringify(notifications),
						updatedAt: now,
						updatedBy: userID
					})
					.where(
						and(
							eq(systemSettings.category, 'Notifications'),
							eq(systemSettings.keyName, 'default_notifications')
						)
					);
				actionType = 'UPDATE';
			} else {
				await db.insert(systemSettings).values({
					category: 'Notifications',
					keyName: 'default_notifications',
					value: JSON.stringify(notifications),
					description: 'Default company notification preferences',
					updatedBy: userID
				});
			}

			await db.insert(auditLogs).values({
				userID,
				employeeID: null,
				actionType,
				action:
					actionType === 'CREATE'
						? 'Create Notification Preferences'
						: 'Update Notification Preferences',
				targetTable: 'system_settings',
				targetID: existingSettings[0]?.id ?? null,
				details: `${actionType} default notification preferences: ${JSON.stringify(notifications)}`,
				isUserVisible: true
			});

			return {
				type: 'success',
				data: { success: true, message: 'Notification preferences saved successfully' }
			};
		} catch (error) {
			console.error('Error saving notification preferences:', error);
			return fail(500, { error: 'Failed to save notification preferences' });
		}
	}
};
