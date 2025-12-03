import { json } from '@sveltejs/kit';
import { rejectLeave } from '$lib/server/leave/leaveService';

export async function PUT({ params, locals, request }) {
	const user = locals.user;
	if (!user || user.role !== 'Manager') return json({ error: 'Unauthorized' }, { status: 401 });

	const body = await request.json();
	const reason = body.reason ?? 'Rejected';

	try {
		const result = await rejectLeave({
			managerId: user.id,
			applicationId: Number(params.id),
			reason
		});

		return json(result);
	} catch (err: any) {
		return json({ error: err.message }, { status: 400 });
	}
}
