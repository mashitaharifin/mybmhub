import { db } from '../src/lib/server/db/index';
import { auditLogs, employees } from '../src/lib/server/db/schema/index';
import { isNull, eq } from 'drizzle-orm';

async function backfillEmployeeID() {
	console.log('Fetching audit logs with null employeeID...');
	const logs = await db.select().from(auditLogs).where(isNull(auditLogs.employeeID));

	console.log(`Found ${logs.length} logs to update.`);

	for (const log of logs) {
		// Skip if userID is null
		if (log.userID == null) {
			console.log(`Log ${log.id} has no userID, skipping`);
			continue;
		}

		// Find the employee record for this user
		const emp = await db.select().from(employees).where(eq(employees.userId, log.userID)).limit(1);

		if (emp.length) {
			await db.update(auditLogs).set({ employeeID: emp[0].id }).where(eq(auditLogs.id, log.id));

			console.log(`Updated auditLog ${log.id} with employeeID ${emp[0].id}`);
		} else {
			console.log(`No employee found for userID ${log.userID}, skipping log ${log.id}`);
		}
	}

	console.log('Backfill complete.');
}

backfillEmployeeID()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error(err);
		process.exit(1);
	});
