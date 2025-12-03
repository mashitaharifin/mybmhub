<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { onDestroy } from 'svelte';

	export let leaveTypes: any[] = [];

	let showForm = false;
	let editing = false;
	let isSubmitting = false;

	let form = {
		id: undefined,
		typeName: '',
		isCarryForward: false,
		carryForwardDays: 0,
		requiresDoc: false,
		isPaid: false,
		isUnlimited: false
	};

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

	function openNewForm() {
		editing = false;
		form = {
			id: undefined,
			typeName: '',
			isCarryForward: false,
			carryForwardDays: 0,
			requiresDoc: false,
			isPaid: false,
			isUnlimited: false
		};
		showForm = true;
	}

	function editType(id: number) {
		const t = leaveTypes.find((x) => x.id === id);
		if (t) {
			form = { ...t };
			editing = true;
			showForm = true;
		}
	}

	function cancelForm() {
		showForm = false;
		editing = false;
		form = {
			id: undefined,
			typeName: '',
			isCarryForward: false,
			carryForwardDays: 0,
			requiresDoc: false,
			isPaid: false,
			isUnlimited: false
		};
	}

	function handleFormEnhance() {
		isSubmitting = true;
		return async ({ result }: { result: any }) => {
			isSubmitting = false;
			if (result?.type === 'success') {
				await invalidateAll();
				showForm = false;
				showAlert(
					(result.data as any)?.message ||
						(editing ? 'Leave type updated successfully!' : 'Leave type created successfully!'),
					'success'
				);
			} else {
				showAlert((result.data as any)?.error || 'Failed to save leave type!', 'error');
			}
		};
	}

	async function handleDelete(id: number, name: string) {
		if (!confirm(`Delete leave type "${name}"?`)) return;

		try {
			const formData = new FormData();
			formData.append('id', id.toString());
			const res = await fetch('?/deleteLeaveType', { method: 'POST', body: formData });

			if (res.ok) {
				await invalidateAll();
				showAlert(`🗑️ Leave type "${name}" deleted successfully.`, 'success');
			} else {
				const err = await res.json();
				showAlert(err?.error || 'Failed to delete leave type.', 'error');
			}
		} catch (err) {
			showAlert('Error deleting leave type!', 'error');
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Leave Types</Card.Title>
			<Card.Description>Manage available leave categories.</Card.Description>
			<br />
		</div>
		<Button on:click={openNewForm} class="flex items-center gap-2">
			<Plus class="w-4 h-4" />
		</Button>
	</Card.Header>

	<Card.Content>
		<!-- Inline Alert -->
		{#if alertMessage}
			<div class="mb-3">
				<Alert.Root variant={alertVariant}>
					<Alert.Title>
						{#if alertVariant === 'success'}Success{/if}
						{#if alertVariant === 'error'}Error{/if}
						{#if alertVariant === 'info'}ℹInfo{/if}
					</Alert.Title>
					<Alert.Description>{alertMessage}</Alert.Description>
				</Alert.Root>
			</div>
		{/if}

		<!-- Leave Type Form -->
		{#if showForm}
			<form
				method="POST"
				action={editing ? '?/updateLeaveType' : '?/createLeaveType'}
				use:enhance={handleFormEnhance}
				class="mb-5 border rounded-md p-4 space-y-3"
			>
				{#if form.id}
					<input type="hidden" name="id" value={form.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{editing ? 'Edit Leave Type' : 'Add New Leave Type'}
				</h3>

				<div class="grid sm:grid-cols-2 gap-3">
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Leave Type Name</label>
						<Input
							name="typeName"
							placeholder="e.g., Annual Leave"
							bind:value={form.typeName}
							required
						/>
					</div>
				</div>

				<!-- Checkboxes -->
				<div class="grid sm:grid-cols-4 gap-4 mt-3">
					<div>
						<label class="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								name="isCarryForward"
								value="true"
								bind:checked={form.isCarryForward}
								class="rounded border-gray-300"
							/>
							<span class="text-sm">Carry Forward</span>
						</label>
					</div>

					{#if form.isCarryForward}
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium mb-1">Max Carry Days</label>
							<Input
								type="number"
								name="carryForwardDays"
								placeholder="Max Days"
								bind:value={form.carryForwardDays}
							/>
						</div>
					{/if}

					<div>
						<label class="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								name="requiresDoc"
								value="true"
								bind:checked={form.requiresDoc}
								class="rounded border-gray-300"
							/>
							<span class="text-sm">Requires Document</span>
						</label>
					</div>

					<div>
						<label class="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								name="isPaid"
								value="true"
								bind:checked={form.isPaid}
								class="rounded border-gray-300"
							/>
							<span class="text-sm">Paid Leave</span>
						</label>
					</div>

					<div>
						<label class="flex items-center gap-2 pt-6">
							<input
								type="checkbox"
								name="isUnlimited"
								value="true"
								bind:checked={form.isUnlimited}
								class="rounded border-gray-300"
							/>
							<span class="text-sm">Unlimited Leave</span>
						</label>
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<Button type="button" variant="outline" on:click={cancelForm} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}Saving...{:else}{editing ? 'Update' : 'Save'}{/if}
					</Button>
				</div>
			</form>
		{/if}

		<!-- Leave Type Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Carry Fwd</Table.Head>
						<Table.Head>Paid</Table.Head>
						<Table.Head>Unlimited</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each leaveTypes as t, i (t.id)}
						<Table.Row>
							<Table.Cell>{i + 1}</Table.Cell>
							<Table.Cell>{t.typeName}</Table.Cell>
							<Table.Cell>{t.isCarryForward ? 'Yes' : 'No'}</Table.Cell>
							<Table.Cell>{t.isPaid ? 'Yes' : 'No'}</Table.Cell>
							<Table.Cell>{t.isUnlimited ? 'Yes' : 'No'}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editType(t.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									on:click={() => handleDelete(t.id, t.typeName)}
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="7" class="text-center text-muted-foreground h-16">
								No leave types defined.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
