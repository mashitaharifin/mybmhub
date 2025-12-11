// Handle the generation of leave balance for employee

import { db } from '$lib/server/db';
import { leaveTypes, leaveEntitlementRules, leaveBalances, employees } from '$lib/server/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function generateLeaveBalanceForEmployee(employeeId: number) {
	const currentYear = new Date().getFullYear();

	// 1. Get employee
	const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId));

	if (!employee) throw new Error(`Employee ${employeeId} not found`);
	if (!employee.empType) throw new Error(`Employee ${employee.id} has no empType`);

	const yearsOfService = employee.dateOfJoining ? calcYears(employee.dateOfJoining) : 0;

	// 2. Get all active leave types
	const types = await db.select().from(leaveTypes).where(eq(leaveTypes.isActive, true));

	for (const lt of types) {
		// ⭐ Skip unlimited leave types (e.g., Unpaid Leave)
		if (lt.isUnlimited) {
			console.log(`[SKIPPED - UNLIMITED] leaveType=${lt.id}`);
			continue;
		}
		// ⭐ 3. Check if leave balance already exists for this user + leaveType + year
		const [existing] = await db
			.select()
			.from(leaveBalances)
			.where(
				and(
					eq(leaveBalances.userID, employee.userId),
					eq(leaveBalances.leaveTypeID, lt.id),
					eq(leaveBalances.year, currentYear)
				)
			)
			.limit(1);

		if (existing) {
			console.log(
				`[SKIPPED] Employee ${employeeId} already has leaveType=${lt.id} for ${currentYear}`
			);
			continue;
		}

		// 4. Match entitlement rule
		const [rule] = await db
			.select()
			.from(leaveEntitlementRules)
			.where(
				and(
					eq(leaveEntitlementRules.leaveTypeID, lt.id),
					eq(leaveEntitlementRules.empType, employee.empType),
					eq(leaveEntitlementRules.effectiveYear, currentYear),
					gte(leaveEntitlementRules.maxYearsOfService, yearsOfService),
					lte(leaveEntitlementRules.minYearsOfService, yearsOfService)
				)
			)
			.limit(1);

		if (!rule) {
			console.warn(
				`[NO RULE] leaveType=${lt.id}, empType=${employee.empType}, years=${yearsOfService}`
			);
			continue;
		}

		// 5. Insert leave balance
		const entitlementDays = rule.entitlementDays ?? 0;
		const carryForwardDays = lt.isCarryForward ? (lt.carryForwardDays ?? 0) : 0;
		const total = entitlementDays + carryForwardDays;

		await db.insert(leaveBalances).values({
			userID: employee.userId,
			leaveTypeID: lt.id,
			leaveEntitlementRuleID: rule.id,
			year: currentYear,
			initialCarryForward: carryForwardDays,
			totalEntitlement: total,
			daysTaken: '0.00',
			remainingBalance: total.toString()
		});

		console.log(`[CREATED] Employee ${employeeId}, leaveType=${lt.id}, total=${total}`);
	}

	console.log(`Leave balances generated for employee ${employeeId}`);
}

function calcYears(dateStr?: string | null): number {
	if (!dateStr) return 0;
	const join = new Date(dateStr);
	const now = new Date();
	return now.getFullYear() - join.getFullYear();
}
