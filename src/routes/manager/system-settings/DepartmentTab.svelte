<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { onDestroy } from 'svelte';

	export let departments: { id: number; deptName: string; description?: string }[] = [];

	let showDeptForm = false;
	let deptForm: { id?: number; deptName: string; description?: string } = {
		deptName: '',
		description: ''
	};

	// For alert messages
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let isSubmitting = false;
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

	function addDepartment() {
		deptForm = { deptName: '', description: '' };
		showDeptForm = true;
	}

	function editDepartment(id: number) {
		const d = departments.find((x) => x.id === id);
		if (d) deptForm = { ...d };
		showDeptForm = true;
	}

	function cancelForm() {
		showDeptForm = false;
		deptForm = { deptName: '', description: '' };
	}

	function validateForm(): string | null {
		if (!deptForm.deptName.trim()) return 'Department name is required.';
		if (deptForm.deptName.length < 3) return 'Department name must be at least 3 characters.';
		return null;
	}

	async function handleFormSuccess(result: any) {
		if (result.type === 'success') {
			await invalidateAll();
			showDeptForm = false;

			const msg =
				result.data?.message ||
				(deptForm.id ? 'Department updated successfully!' : 'Department created successfully!');
			showAlert(msg, 'success');
		} else if (result.type === 'failure') {
			const err = result.data?.error || 'Failed to save department!';
			showAlert(err, 'error');
		}
	}

	async function handleDelete(id: number, deptName: string) {
		const confirmDelete = confirm(`Are you sure you want to delete "${deptName}"?`);
		if (!confirmDelete) return;

		try {
			const formData = new FormData();
			formData.append('id', id.toString());

			const response = await fetch('?/deleteDepartment', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				await invalidateAll();
				showAlert(`🗑️ Department "${deptName}" deleted successfully!`, 'success');
			} else {
				const errorData = await response.json();
				showAlert(errorData?.error || 'Failed to delete department!', 'error');
			}
		} catch (error) {
			showAlert('Error deleting department!', 'error');
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Departments</Card.Title>
			<Card.Description>Manage your company's department list.</Card.Description>
			<br />
		</div>

		<Button type="button" on:click={addDepartment} class="flex items-center gap-2">
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
		<!-- Department Form -->
		{#if showDeptForm}
			<form
				method="POST"
				action={deptForm.id ? '?/updateDepartment' : '?/createDepartment'}
				use:enhance={() => {
					isSubmitting = true;
					return async ({ result, update }) => {
						const validationError = validateForm();
						if (validationError) {
							showAlert(validationError, 'error');
							isSubmitting = false;
							return;
						}

						await handleFormSuccess(result);
						isSubmitting = false;
					};
				}}
				class="mb-5 rounded-md border p-4"
			>
				{#if deptForm.id}
					<input type="hidden" name="id" value={deptForm.id} />
				{/if}
				<h3 class="font-semibold mb-3">
					{deptForm.id ? 'Edit Department' : 'Add New Department'}
				</h3>
				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Department Name</label>
						<Input
							name="deptName"
							placeholder="e.g., Human Resources"
							bind:value={deptForm.deptName}
							required
						/>
					</div>
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Description</label>
						<Input
							name="description"
							placeholder="e.g., Recruitment"
							bind:value={deptForm.description}
						/>
					</div>
				</div>
				<div class="flex justify-end gap-2 mt-4">
					<Button type="button" variant="secondary" on:click={cancelForm} disabled={isSubmitting}>
						Cancel
					</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							Saving...
						{:else}
							{deptForm.id ? 'Update' : 'Save'}
						{/if}
					</Button>
				</div>
			</form>
		{/if}

		<!-- Department Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[60px]">#</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Description</Table.Head>
						<Table.Head class="w-[120px] text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each departments as dept, idx (dept.id)}
						<Table.Row>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>{dept.deptName}</Table.Cell>
							<Table.Cell>{dept.description || '-'}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									type="button"
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
									on:click={() => editDepartment(dept.id)}
									title="Edit department"
								>
									<Pencil class="w-4 h-4" />
								</button>

								<button
									type="button"
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
									on:click={() => handleDelete(dept.id, dept.deptName)}
									title="Delete department"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="4" class="text-center text-muted-foreground h-16">
								No departments found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
