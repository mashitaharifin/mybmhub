// src/routes/api/admin/backfill-leave-balances/+server.ts
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/client';
import { employees } from '$lib/server/db/schema/index';
import { generateLeaveBalanceForEmployee } from '$lib/server/leave/generateBalance';

export async function POST() {
	try {
		const allEmployees = await db.select().from(employees);
		console.log(`Found ${allEmployees.length} employees`);

		const results = [];

		for (const emp of allEmployees) {
			try {
				await generateLeaveBalanceForEmployee(emp.id);
				results.push({ employeeId: emp.id, status: 'success' });
				console.log(`Backfilled leave balance for ${emp.id} - ${emp.name || ''}`);
			} catch (err) {
				// Narrow unknown to Error
				const errorMessage = err instanceof Error ? err.message : String(err);
				results.push({ employeeId: emp.id, status: 'error', error: errorMessage });
				console.error(`Failed for employee ${emp.id}:`, err);
			}
		}

		return json({ success: true, results });
	} catch (err) {
		const errorMessage = err instanceof Error ? err.message : String(err);
		console.error('Error in backfill:', err);
		return json({ success: false, error: errorMessage }, { status: 500 });
	}
}
