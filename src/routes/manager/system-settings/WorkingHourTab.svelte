<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';

	export let workingHours: any[] = [];
	const dispatch = createEventDispatcher();

	let showWorkingForm = false;
	let workingForm: any = {
		id: undefined,
		title: '',
		start: '09:00',
		end: '17:00',
		graceMinutes: 0
	};

	// ✅ Alert system (same as working LeaveEntitlementTab)
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => {
		if (t) clearTimeout(t);
	});

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 10000);
	}

	function addWorking() {
		workingForm = { id: undefined, title: '', start: '09:00', end: '17:00', graceMinutes: 0 };
		showWorkingForm = true;
	}

	function editWorking(id: number) {
		const w = workingHours.find((x) => x.id === id);
		if (w) workingForm = { ...w };
		showWorkingForm = true;
	}

	function cancelForm() {
		showWorkingForm = false;
	}

	function handleFormEnhance() {
		return async ({ result }: any) => {
			if (result?.type === 'success') {
				showAlert(result.data?.message || 'Working hour saved successfully.', 'success');
				await invalidateAll();
				showWorkingForm = false;
			} else {
				showAlert(result.data?.error || 'Failed to save working hour.', 'error');
			}
		};
	}

	async function deleteWorking(id: number) {
		if (!confirm('Delete this working hour?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const res = await fetch('?/deleteWorkingHour', { method: 'POST', body: formData });

		if (res.ok) {
			await invalidateAll();
			showAlert('Working hour deleted successfully.', 'success');
		} else {
			showAlert('Failed to delete working hour.', 'error');
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Working Hours</Card.Title>
			<Card.Description>
				Define working shifts, start/end times, and grace periods.
			</Card.Description>
			<br />
		</div>
		<Button on:click={addWorking}><Plus class="w-4 h-4" /></Button>
	</Card.Header>

	<Card.Content>
		<!-- Inline Alert -->
		<div>
			{#if alertMessage}
				<Alert.Root variant={alertVariant}>
					<Alert.Title>
						{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
					</Alert.Title>
					<Alert.Description>{alertMessage}</Alert.Description>
				</Alert.Root>
			{/if}
		</div>

		{#if showWorkingForm}
			<form
				method="POST"
				action={workingForm.id ? '?/updateWorkingHour' : '?/createWorkingHour'}
				use:enhance={handleFormEnhance}
				class="mb-5 rounded-md border p-4"
			>
				{#if workingForm.id}
					<input type="hidden" name="id" value={workingForm.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{workingForm.id ? 'Edit Working Hour' : 'Add New Working Hour'}
				</h3>

				<div class="grid sm:grid-cols-3 gap-3">
					<label class="block text-sm font-medium">
						Title
						<Input
							name="title"
							bind:value={workingForm.title}
							placeholder="e.g., Standard Shift"
							required
						/>
					</label>

					<label class="block text-sm font-medium">
						Start
						<input
							type="time"
							name="start"
							bind:value={workingForm.start}
							class="w-full rounded border px-2 py-1"
							required
						/>
					</label>

					<label class="block text-sm font-medium">
						End
						<input
							type="time"
							name="end"
							bind:value={workingForm.end}
							class="w-full rounded border px-2 py-1"
							required
						/>
					</label>
				</div>

				<div>
					<label class="block text-sm font-medium">
						Grace Period (minutes)
						<Input
							type="number"
							name="graceMinutes"
							bind:value={workingForm.graceMinutes}
							min="0"
						/>
					</label>
				</div>

				<div class="flex justify-end gap-2 mt-3">
					<Button variant="outline" type="button" on:click={cancelForm}>Cancel</Button>
					<Button type="submit">{workingForm.id ? 'Update' : 'Save'}</Button>
				</div>
			</form>
		{/if}

		<!-- Table List -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Title</Table.Head>
						<Table.Head>Start</Table.Head>
						<Table.Head>End</Table.Head>
						<Table.Head>Grace (min)</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each workingHours as w, idx (w.id)}
						<Table.Row>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>{w.title}</Table.Cell>
							<Table.Cell>{w.start}</Table.Cell>
							<Table.Cell>{w.end}</Table.Cell>
							<Table.Cell>{w.graceMinutes}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editWorking(w.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									on:click={() => deleteWorking(w.id)}
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="6" class="text-center text-muted-foreground h-16">
								No working hours found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
