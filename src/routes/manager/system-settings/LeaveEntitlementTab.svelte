<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { onDestroy } from 'svelte';

	export let leaveTypes: any[] = [];
	export let leaveEntitlementRules: any[] = [];
	// svelte-ignore export_let_unused
	export let employeeTypes: string[] = ['Permanent', 'Probation', 'Intern'];

	let showForm = false;
	let editing = false;
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

	let form = {
		id: undefined as number | undefined,
		leaveTypeID: '',
		empType: '',
		minYearsOfService: 0,
		maxYearsOfService: 0,
		entitlementDays: 0,
		effectiveYear: new Date().getFullYear(),
		isActive: true
	};

	function openNewForm() {
		editing = false;
		form = {
			id: undefined,
			leaveTypeID: '',
			empType: '',
			minYearsOfService: 0,
			maxYearsOfService: 0,
			entitlementDays: 0,
			effectiveYear: new Date().getFullYear(),
			isActive: true
		};
		showForm = true;
	}

	function editRule(id: number) {
		const r = leaveEntitlementRules.find((x) => x.id === id);

		if (r) {
			form = {
				...r,
				empType: r.empType, // string only
				leaveTypeID: r.leaveTypeID.toString()
			};

			editing = true;
			showForm = true;
		}
	}

	function cancelForm() {
		showForm = false;
		editing = false;
	}

	function handleFormEnhance() {
		return async ({ result }: any) => {
			if (result?.type === 'success') {
				showAlert(result.data?.message || 'Leave Entitlement saved successfully.', 'success');
				await invalidateAll();
				showForm = false;
			} else {
				showAlert(result.data?.error || 'Failed to save leave entitlement.', 'error');
			}
		};
	}

	async function handleDelete(id: number) {
		if (!confirm('Delete this entitlement rule?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		try {
			const res = await fetch('?/deleteEntitlement', { method: 'POST', body: formData });
			const data = await res.json();

			if (res.ok && data.success) {
				await invalidateAll();
				showAlert('Leave Entitlement deleted successfully.', 'success');
			} else {
				showAlert(data?.error || 'Failed to delete leave entitlement.', 'error');
			}
		} catch (error) {
			showAlert('Network error occurred while deleting entitlement.', 'error');
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Leave Entitlement Rules</Card.Title>
			<Card.Description
				>Define entitlement by employment type and years of service.</Card.Description
			><br />
		</div>
		<Button on:click={openNewForm}><Plus class="w-4 h-4" /></Button>
	</Card.Header>

	<Card.Content>
		<!-- Inline Alert -->
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if showForm}
			<form
				method="POST"
				action={editing ? '?/updateEntitlement' : '?/createEntitlement'}
				use:enhance={handleFormEnhance}
				class="mb-5 border rounded-md p-4"
			>
				{#if form.id}
					<input type="hidden" name="id" value={form.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{editing ? 'Edit Leave Entitlement' : 'Add New Leave Entitlement'}
				</h3>

				<div class="grid sm:grid-cols-2 gap-3">
					<label class="block text-sm font-medium mb-1">
						Leave Type
						<select
							name="leaveTypeID"
							bind:value={form.leaveTypeID}
							required
							class="w-full rounded p-2 text-foreground dark:bg-gray-800 dark:text-white"
						>
							<option value="">-- Select Type --</option>
							{#each leaveTypes.filter((lt) => !lt.isUnlimited) as lt}
								<option value={lt.id}>{lt.typeName}</option>
							{/each}
						</select>
					</label>

					<label class="block text-sm font-medium mb-1">
						Employee Type
						<select
							name="empType"
							bind:value={form.empType}
							required
							class="w-full rounded p-2 text-foreground dark:bg-gray-800 dark:text-white"
						>
							<option value="">-- Select Type --</option>
							<option value="Permanent">Permanent</option>
							<option value="Probation">Probation</option>
							<option value="Intern">Intern</option>
						</select>
					</label>
				</div>

				{#if leaveTypes.find((lt) => lt.id === form.leaveTypeID)?.typeName === 'Annual Leave'}
					<div class="grid sm:grid-cols-3 gap-3 mt-3">
						<label class="block text-sm font-medium mb-1">
							Minimum Years of Service
							<Input
								type="number"
								name="minYearsOfService"
								bind:value={form.minYearsOfService}
								min="0"
							/>
						</label>
						<label class="block text-sm font-medium mb-1">
							Maximum Years of Service
							<Input
								type="number"
								name="maxYearsOfService"
								bind:value={form.maxYearsOfService}
								min="0"
							/>
						</label>
						<label class="block text-sm font-medium mb-1">
							Entitlement Days
							<Input
								type="number"
								name="entitlementDays"
								bind:value={form.entitlementDays}
								min="0"
								required
							/>
						</label>
					</div>
				{:else}
					<div class="grid sm:grid-cols-1 gap-3 mt-3">
						<label class="block text-sm font-medium mb-1">
							Entitlement Days
							<Input
								type="number"
								name="entitlementDays"
								bind:value={form.entitlementDays}
								min="0"
								required
							/>
						</label>
					</div>
				{/if}

				<div class="grid sm:grid-cols-2 gap-4 mt-4">
					<label class="block text-sm font-medium mb-1">
						Effective Year
						<Input
							type="number"
							name="effectiveYear"
							bind:value={form.effectiveYear}
							min="2000"
							max="2100"
							required
						/>
					</label>

					<label class="flex items-center text-sm font-medium mb-1 mt-4">
						<input type="checkbox" name="isActive" bind:checked={form.isActive} class="mr-2" />
						Active
					</label>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<Button variant="secondary" type="button" on:click={cancelForm}>Cancel</Button>
					<Button type="submit" disabled={!form.empType || !form.leaveTypeID || form.entitlementDays < 0}>
						{editing ? 'Update' : 'Save'}
					</Button>
				</div>
			</form>
		{/if}

		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Leave Type</Table.Head>
						<Table.Head>Emp. Type</Table.Head>
						<Table.Head>Years Range</Table.Head>
						<Table.Head>Entitlement (days)</Table.Head>
						<Table.Head>Effective Year</Table.Head>
						<Table.Head>Active</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each leaveEntitlementRules as r, i (r.id)}
						<Table.Row>
							<Table.Cell>{i + 1}</Table.Cell>
							<Table.Cell
								>{leaveTypes.find((t) => t.id === r.leaveTypeID)?.typeName ?? '-'}</Table.Cell
							>
							<Table.Cell>{r.empType}</Table.Cell>
							<Table.Cell>
								{#if r.minYearsOfService === 0 && r.maxYearsOfService === 0}
									0 Years
								{:else if r.maxYearsOfService === 0}
									&gt; {r.minYearsOfService} years
								{:else if r.minYearsOfService === 0}
									&lt;= {r.maxYearsOfService} years
								{:else}
									{r.minYearsOfService} – {r.maxYearsOfService} years
								{/if}
							</Table.Cell>

							<Table.Cell>{r.entitlementDays} days</Table.Cell>

							<Table.Cell>
								{#if r.effectiveYear}
									<span class="text-sm">{r.effectiveYear}</span>
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</Table.Cell>

							<Table.Cell>{r.isActive ? 'Yes' : 'No'}</Table.Cell>

							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editRule(r.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									on:click={() => handleDelete(r.id)}
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="8" class="text-center text-muted-foreground h-16"
								>No entitlement rules defined.</Table.Cell
							>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>