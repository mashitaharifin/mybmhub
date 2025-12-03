import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { employees } from '$lib/server/db/schema';
import { generateLeaveBalanceForEmployee } from '$lib/server/leave/generateBalance';

export async function POST({ request, locals }) {
	const user = locals.user;
	if (!user || user.role !== 'Manager') return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();

	try {
		if (body.all === true) {
			const allEmployees = await db.select().from(employees);

			for (const emp of allEmployees) {
				await generateLeaveBalanceForEmployee(emp.id);
			}

			return json({ success: true, message: 'Leave balance generated for all employees' });
		}

		if (!body.employeeId) return json({ error: 'employeeId required' }, { status: 400 });

		await generateLeaveBalanceForEmployee(body.employeeId);

		return json({
			success: true,
			message: `Leave balance generated for employee ${body.employeeId}`
		});
	} catch (err: any) {
		return json({ error: err.message }, { status: 400 });
	}
}
