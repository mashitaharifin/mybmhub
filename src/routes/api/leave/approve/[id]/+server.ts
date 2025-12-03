import { json } from '@sveltejs/kit';
import { approveLeave } from '$lib/server/leave/leaveService';

export async function PUT({ params, locals }) {
	const user = locals.user;
	if (!user || user.role !== 'Manager') return json({ error: 'Unauthorized' }, { status: 401 });

	try {
		const result = await approveLeave({
			managerId: user.id,
			applicationId: Number(params.id)
		});

		return json(result);
	} catch (err: any) {
		return json({ error: err.message }, { status: 400 });
	}
}
