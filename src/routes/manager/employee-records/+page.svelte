<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import { Plus, Pencil, Trash2, IdCardLanyard } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';

	export let data: PageData;
	const dispatch = createEventDispatcher();

	let showForm = false;
	let isEditing = false;

	let employeeForm: any = {
		id: undefined,
		name: '',
		email: '',
		role: 'Employee',
		empType: 'Permanent',
		departmentId: '',
		jobTitle: '',
		dateOfJoining: '',
		phoneNumber: '',
		address: ''
	};

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => t && clearTimeout(t));

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	function addEmployee() {
		isEditing = false;
		employeeForm = {
			id: undefined,
			name: '',
			email: '',
			role: 'Employee',
			empType: 'Permanent',
			departmentId: '',
			jobTitle: '',
			dateOfJoining: '',
			phoneNumber: '',
			address: ''
		};
		showForm = true;
	}

	function editEmployee(id: number) {
		const emp = data.employees.find((x) => x.id === id);
		if (!emp) return;
		isEditing = true;
		employeeForm = {
			id: emp.id,
			name: emp.name ?? '',
			email: emp.email ?? '',
			role: emp.role ?? 'Employee',
			empType: emp.empType ?? 'Permanent',
			departmentId: emp.department ? getDepartmentIdByName(emp.department) : '',
			jobTitle: emp.jobTitle ?? '',
			dateOfJoining: emp.dateOfJoining ?? '',
			phoneNumber: emp.phoneNumber ?? '',
			address: emp.address ?? ''
		};
		showForm = true;
	}

	function cancelForm() {
		showForm = false;
	}

	function validateForm() {
		if (!employeeForm.name.trim()) return 'Full name is required.';
		if (!isEditing && !employeeForm.email.trim()) return 'Email is required.';
		if (!isEditing && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employeeForm.email))
			return 'Invalid email address.';
		if (!employeeForm.departmentId) return 'Please select a department.';
		return null;
	}

	async function deleteEmployee(id: number) {
		if (!confirm('Delete this employee?')) return;
		const fd = new FormData();
		fd.append('id', String(id));

		const res = await fetch('?/deleteEmployee', { method: 'POST', body: fd });
		if (res.ok) {
			await invalidateAll();
			showAlert('Employee deleted successfully.', 'success');
		} else {
			showAlert('Failed to delete employee.', 'error');
		}
	}

	function getDepartmentIdByName(departmentName: string) {
		const dept = data.departments.find((d) => d.deptName === departmentName);
		return dept ? String(dept.id) : '';
	}

	const handleFormEnhance: SubmitFunction = () => {
		return async ({ result }: { result: ActionResult }) => {
			if (result.type === 'success') {
				showAlert(result.data?.message || 'Employee saved successfully.', 'success');
				await invalidateAll();
				showForm = false;
			} else if (result.type === 'failure') {
				showAlert(result.data?.error || 'Failed to save employee.', 'error');
			}
		};
	};

	async function handleStatusChange(employeeId: number, currentStatus: string, evt: Event) {
		const select = evt.target as HTMLSelectElement;
		const newStatus = select.value;

		const fd = new FormData();
		fd.append('employeeId', String(employeeId));
		fd.append('status', newStatus);

		console.log('Status change:', { employeeId, currentStatus, newStatus }); // Debug

		const res = await fetch('?/toggleStatus', { method: 'POST', body: fd });
		if (res.ok) {
			await invalidateAll();
			showAlert(`Employee set to ${newStatus.toLowerCase()} successfully.`, 'success');
		} else {
			showAlert('Failed to update employee status.', 'error');
			await invalidateAll();
		}
	}
</script>

<svelte:head>
	<title>Employee Management – MyBM Hub</title>
	<meta
		name="description"
		content="Manage employee information, roles, and statuses in MyBM Hub."
	/>
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/manager/dashboard">Dashboard</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator />

					<BreadcrumbItem>
						<BreadcrumbPage>Employee Management</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb><br />
			<div>
				<Card.Title>Employee Management</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Add, edit, and manage employee records and account statuses.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="flex justify-end mb-4">
			<Button on:click={addEmployee}><Plus class="w-4 h-4" /></Button>
		</div>

		{#if showForm}
			<form
				method="POST"
				action={isEditing ? '?/updateEmployee' : '?/createEmployee'}
				use:enhance={handleFormEnhance}
				class="mb-6 rounded-md border p-4"
				on:submit={(e) => {
					const err = validateForm();
					if (err) {
						e.preventDefault();
						showAlert(err, 'error');
					}
				}}
			>
				{#if isEditing}
					<input type="hidden" name="id" value={employeeForm.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{isEditing ? 'Edit Employee' : 'Add New Employee'}
				</h3>

				<div class="grid sm:grid-cols-2 gap-3">
					<label class="block text-sm font-medium">
						Full Name
						<Input name="name" bind:value={employeeForm.name} required />
					</label>

					{#if !isEditing}
						<label class="block text-sm font-medium">
							Email
							<Input name="email" type="email" bind:value={employeeForm.email} required />
						</label>
					{/if}

					<label class="block text-sm font-medium">
						Role
						<select
							name="role"
							bind:value={employeeForm.role}
							class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
						>
							<option value="Manager">Manager</option>
							<option value="Employee">Employee</option>
						</select>
					</label>

					<label class="block text-sm font-medium">
						Employment Type
						<select
							name="empType"
							bind:value={employeeForm.empType}
							class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
						>
							<option value="Permanent">Permanent</option>
							<option value="Probation">Probation</option>
							<option value="Intern">Intern</option>
						</select>
					</label>

					{#if employeeForm.empType === 'Probation'}
						<label class="block text-sm font-medium">
							Probation End Date
							<Input type="date" name="probationEnd" bind:value={employeeForm.probationEnd} />
						</label>
					{/if}

					<label class="block text-sm font-medium">
						Department
						<select
							name="departmentId"
							bind:value={employeeForm.departmentId}
							class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700"
						>
							<option value="">Select Department</option>
							{#each data.departments as d}
								<option value={String(d.id)}>{d.deptName}</option>
							{/each}
						</select>
					</label>

					<label class="block text-sm font-medium">
						Job Title
						<Input name="jobTitle" bind:value={employeeForm.jobTitle} />
					</label>

					<label class="block text-sm font-medium">
						Date of Joining
						<Input type="date" name="dateOfJoining" bind:value={employeeForm.dateOfJoining} />
					</label>

					<label class="block text-sm font-medium">
						Phone Number
						<Input name="phoneNumber" bind:value={employeeForm.phoneNumber} />
					</label>

					<label class="block text-sm font-medium sm:col-span-2">
						Address
						<Input name="address" bind:value={employeeForm.address} />
					</label>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<Button variant="secondary" type="button" on:click={cancelForm}>Cancel</Button>
					<Button type="submit">{isEditing ? 'Update' : 'Save'}</Button>
				</div>
			</form>
		{/if}
		<!-- Employee Records Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[60px]">#</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Email</Table.Head>
						<Table.Head>Department</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each data.employees as e, i}
						<Table.Row>
							<Table.Cell>{i + 1}</Table.Cell>
							<Table.Cell>{e.name}</Table.Cell>
							<Table.Cell>{e.email}</Table.Cell>
							<Table.Cell>{e.department}</Table.Cell>
							<Table.Cell>{e.empType}</Table.Cell>
							<Table.Cell>{e.role}</Table.Cell>
							<Table.Cell>
								<select
									value={e.status}
									on:change={async (evt) => handleStatusChange(e.id, e.status || 'Active', evt)}
									class={`text-xs px-2 py-1 rounded-xl border ${
										e.status === 'Active'
											? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-white border-green-300 dark:border-green-600'
											: 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-white border-red-300 dark:border-red-600'
									}`}
								>
									<option value="Active">Active</option>
									<option value="Inactive">Inactive</option>
								</select>
							</Table.Cell>
							<Table.Cell class="flex justify-end items-center space-x-2">
								<a
									href={`/manager/employee-records/${e.id}`}
									class="inline-block p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20"
									title="View employee details"
								>
									<IdCardLanyard class="w-4 h-4" />
								</a>
								<button
									type="button"
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
									on:click={() => editEmployee(e.id)}
									title="Update employee details"
								>
									<Pencil class="w-4 h-4" />
								</button>

								<button
									type="button"
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
									on:click={() => deleteEmployee(e.id)}
									title="Delete employee"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="8" class="text-center text-muted-foreground h-16">
								No employees found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
