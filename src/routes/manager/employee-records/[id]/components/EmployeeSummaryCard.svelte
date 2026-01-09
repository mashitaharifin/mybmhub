<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button.svelte';
	import { UserCircle2, Edit3, ArrowLeft, Power } from 'lucide-svelte';
	import { createEventDispatcher } from 'svelte';

	export let data;
	const emp = data.employee;
	const dispatch = createEventDispatcher();

	const initials = emp.name
		? emp.name
				.split(' ')
				.map((n: string) => n[0])
				.join('')
				.slice(0, 2)
		: '?';

	function handleEdit() {
		dispatch('edit', { id: emp.id });
	}

	async function handleToggleStatus() {
		const action = emp.status === 'Active' ? 'deactivate' : 'reactivate';
		if (!confirm(`Are you sure you want to ${action} this employee?`)) {
			return;
		}

		const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
		const fd = new FormData();
		fd.append('employeeId', String(emp.id));
		fd.append('status', newStatus);

		try {
			const res = await fetch('?/toggleStatus', { method: 'POST', body: fd });

			if (res.ok) {
				emp.status = newStatus;

				dispatch('alert', {
					message: `Employee set to ${newStatus.toLowerCase()} successfully.`,
					variant: 'success'
				});

				dispatch('updated', { id: emp.id, status: newStatus });
			} else {
				let errorText = 'Failed to update employee status.';
				try {
					const json = await res.json();
					if (json?.error) errorText = json.error;
				} catch (e) {
				}

				dispatch('alert', { message: errorText, variant: 'error' });

				dispatch('updateFailed', { id: emp.id });
			}
		} catch (err) {
			dispatch('alert', { message: 'Failed to update employee status.', variant: 'error' });
			dispatch('updateFailed', { id: emp.id });
			console.error('toggleStatus error', err);
		}
	}
</script>

<Card.Root class="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow space-y-4">
	<Card.Header class="flex items-center justify-between">
		<div class="flex items-center gap-4">
			<!-- Avatar with gradient border -->
			<div
				class="w-18 h-18 p-1 rounded-full bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d]
                 flex items-center justify-center"
			>
				<div
					class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden"
				>
					{#if emp.avatarUrl}
						<img
							src={emp.avatarUrl}
							alt={emp.name}
							class="w-full h-full object-cover rounded-full"
						/>
					{:else}
						<div class="text-xl font-bold text-pink-600 dark:text-purple-400">
							{initials}
						</div>
					{/if}
				</div>
			</div>

			<div>
				<Card.Title class="text-xl font-semibold dark:text-white">{emp.name}</Card.Title>
				<p class="text-gray-500 dark:text-gray-400">
					{emp.jobTitle || 'No Job Title'} • {emp.department || 'No Department'}
				</p>
				<p class="text-sm text-gray-400 dark:text-gray-500">{emp.empType || 'N/A'}</p>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<button
				type="button"
				class="p-2 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition"
				on:click={handleEdit}
				title="Edit employee details"
			>
				<Edit3 class="w-5 h-5" />
			</button>

			<button
				type="button"
				class={`p-2 rounded transition ${
					emp.status === 'Active'
						? 'text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30'
						: 'text-green-500 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30'
				}`}
				on:click={handleToggleStatus}
				title={emp.status === 'Active' ? 'Deactivate employee' : 'Reactivate employee'}
			>
				<Power class="w-5 h-5" />
			</button>

			<a
				href="/manager/employee-records"
				class="p-2 rounded text-gray-500 hover:text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
				title="Back to list"
			>
				<ArrowLeft class="w-5 h-5" />
			</a>
		</div>
	</Card.Header>

	<Card.Content class="pt-2 text-sm">
		<div class="flex items-center gap-2">
			<span class="font-medium text-gray-700 dark:text-gray-300">Status:</span>
			<span
				class={`px-2 py-1 rounded-full text-xs font-medium ${
					emp.status === 'Active'
						? 'bg-green-100 text-green-700 dark:bg-green-300/30 dark:text-green-300'
						: 'bg-gray-100 text-gray-600 dark:bg-gray-300/30 dark:text-gray-200'
				}`}
			>
				{emp.status}
			</span>
		</div>
	</Card.Content>
</Card.Root>

