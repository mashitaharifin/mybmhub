<script lang="ts">
	import { onMount } from 'svelte';
	import EmployeeSummaryCard from './components/EmployeeSummaryCard.svelte';
	import OverviewTab from './components/OverviewTab.svelte';
	import AttendanceTab from './components/AttendanceTab.svelte';
	import LeaveTab from './components/LeaveTab.svelte';
	import ActivityLogTab from './components/ActivityLogTab.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import Input from '$lib/components/ui/input.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import Button from '$lib/components/ui/button.svelte';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';

	export let data;

	type TabKey = 'overview' | 'attendance' | 'leave' | 'activity';
	let activeTab: TabKey = 'overview';

	let lazyData: Record<'attendance' | 'leave' | 'activity', any> = {
		attendance: null,
		leave: null,
		activity: null
	};

	async function loadTab(tab: TabKey) {
		if (tab === 'overview' || lazyData[tab]) return;

		try {
			const employeeId = data.employee?.id; // assuming 'data' is from  load function
			if (!employeeId) {
				console.error('No employee ID found');
				return;
			}

			// Correct REST-like query string URL
			const url = `/manager/employee-records/${employeeId}/api/${tab}`;
			console.log('Fetching tab data from:', url);

			const res = await fetch(url);
			if (!res.ok) {
				console.error(`Failed to fetch ${tab}:`, res.status);
				return;
			}

			lazyData[tab] = await res.json();
		} catch (err) {
			console.error(`Error fetching ${tab}:`, err);
		}
	}

	let showEditForm = false;
	let isEditing = false;

	let employeeForm = {
		id: 0,
		name: '',
		email: '',
		role: 'Employee',
		empType: 'Permanent',
		departmentId: '',
		jobTitle: '',
		dateOfJoining: '',
		phoneNumber: '',
		address: '',
		probationEnd: ''
	};

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let alertTimeout: NodeJS.Timeout | null = null;

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (alertTimeout) clearTimeout(alertTimeout);
		alertTimeout = setTimeout(() => (alertMessage = null), 9000);
	}

	function handleEdit(event: CustomEvent) {
		const emp = data.employee;
		isEditing = true;
		employeeForm = {
			id: emp.id,
			name: emp.name ?? '',
			email: emp.email ?? '',
			role: emp.role ?? 'Employee',
			empType: emp.empType ?? 'Permanent',
			departmentId: emp.departmentId ? String(emp.departmentId) : '',
			jobTitle: emp.jobTitle ?? '',
			dateOfJoining: emp.dateOfJoining ?? '',
			phoneNumber: emp.phoneNumber ?? '',
			address: emp.address ?? '',
			probationEnd: emp.probationEnd ?? ''
		};
		showEditForm = true;
	}

	function cancelEdit() {
		showEditForm = false;
	}

	async function submitEditForm() {
		console.log('Form data being submitted:', {
			id: employeeForm.id,
			name: employeeForm.name,
			role: employeeForm.role,
			empType: employeeForm.empType,
			departmentId: employeeForm.departmentId,
			jobTitle: employeeForm.jobTitle,
			dateOfJoining: employeeForm.dateOfJoining,
			phoneNumber: employeeForm.phoneNumber,
			address: employeeForm.address,
			probationEnd: employeeForm.probationEnd
		});

		const formData = new FormData();
		formData.append('id', String(employeeForm.id));
		formData.append('name', employeeForm.name);
		formData.append('role', employeeForm.role);
		formData.append('empType', employeeForm.empType);
		formData.append('departmentId', employeeForm.departmentId);
		formData.append('jobTitle', employeeForm.jobTitle);
		formData.append('dateOfJoining', employeeForm.dateOfJoining);
		formData.append('phoneNumber', employeeForm.phoneNumber);
		formData.append('address', employeeForm.address);

		console.log('FormData entries:');
		for (let [key, value] of formData.entries()) {
			console.log(`${key}:`, value);
		}

		if (employeeForm.probationEnd) {
			formData.append('probationEnd', employeeForm.probationEnd);
		}

		try {
			const res = await fetch('?/updateEmployee', {
				method: 'POST',
				body: formData
			});

			if (res.ok) {
				const result = await res.json();
				showAlert(result.message || 'Employee updated successfully!', 'success');
				showEditForm = false;
				window.location.reload();
			} else {
				let errorMessage = 'Failed to update employee';
				try {
					const errorData = await res.json();
					console.log('Error response:', errorData);
					errorMessage = errorData.error || errorData.message || errorMessage;
				} catch (parseError) {
					console.error('Error parsing error response:', parseError);
					errorMessage = `Server error: ${res.status} ${res.statusText}`;
				}
				showAlert(errorMessage, 'error');
			}
		} catch (err) {
			console.error('Update error:', err);
			showAlert('Network error: Could not connect to server', 'error');
		}
	}

	function handleAlert(event: CustomEvent) {
		showAlert(event.detail.message, event.detail.variant);
	}
</script>

<svelte:head>
	<title>{data.employee.name}’s Details – MyBM Hub</title>
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
						<BreadcrumbLink href="/manager/employee-records">Employee Records</BreadcrumbLink>
					</BreadcrumbItem>

					<BreadcrumbSeparator />

					<BreadcrumbItem>
						<BreadcrumbPage>{data.employee.name}’s Details</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>{data.employee.name}’s Details View</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					View comprehensive profile, attendance, leave records, and activity history.
				</Card.Description>
			</div>
		</div>
	</Card.Header>
</Card.Root>

<div class="flex flex-col">
	<Card.Content class="px-10 pb-10">
		{#if alertMessage}
			<Alert.Root variant={alertVariant} class="mb-6">
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Edit Form -->
		{#if showEditForm}
			<Card.Root class="mb-6 p-6 border rounded-2xl">
				<Card.Header>
					<Card.Title>Edit Employee</Card.Title>
				</Card.Header>
				<Card.Content>
					<form on:submit|preventDefault={submitEditForm} class="space-y-4">
						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<label class="block text-sm font-medium dark:text-white">
								Full Name
								<Input name="name" bind:value={employeeForm.name} required />
							</label>
							<label class="block text-sm font-medium ">
								Role
								<select
									name="role"
									bind:value={employeeForm.role}
									class="w-full rounded border px-2 py-1"
								>
									<option value="Manager">Manager</option>
									<option value="Employee">Employee</option>
								</select>
							</label>
							<label class="block text-sm font-medium ">
								Employment Type
								<select
									name="empType"
									bind:value={employeeForm.empType}
									class="w-full rounded border px-2 py-1"
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
									class="w-full rounded border px-2 py-1"
								>
									<option value="">Select Department</option>
									{#each data.departments as d}
										<option value={String(d.id)}>{d.deptName}</option>
									{/each}
								</select>
							</label>

							<label class="block text-sm font-medium dark:text-white">
								Job Title
								<Input name="jobTitle" bind:value={employeeForm.jobTitle} />
							</label>
							<label class="block text-sm font-medium dark:text-white">
								Phone Number
								<Input name="phoneNumber" bind:value={employeeForm.phoneNumber} />
							</label>
							<label class="block text-sm font-medium md:col-span-2 dark:text-white">
								Address
								<Input name="address" bind:value={employeeForm.address} />
							</label>
						</div>
						<div class="flex justify-end gap-2">
							<Button variant="outline" type="button" on:click={cancelEdit}>Cancel</Button>
							<Button type="submit">Update</Button>
						</div>
					</form>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Employee Summary Card -->
		<div class="mb-6">
			<EmployeeSummaryCard {data} on:edit={handleEdit} on:alert={handleAlert} />
		</div>

		<!-- Tabs -->
		<div>
			<Tabs.Root
				value={activeTab}
				onValueChange={(v: string) => {
					const tab = v as TabKey;
					activeTab = tab;
					loadTab(tab);
				}}
			>
				<Tabs.List
					class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-t-lg"
				>
					<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
					<Tabs.Trigger value="attendance">Attendance Summary</Tabs.Trigger>
					<Tabs.Trigger value="leave">Leave Summary</Tabs.Trigger>
					<Tabs.Trigger value="activity">Activity Log</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="overview" class="pt-6">
					<OverviewTab employee={data.employee} />
				</Tabs.Content>

				<Tabs.Content value="attendance" class="pt-6">
					{#if lazyData.attendance}
						<AttendanceTab data={lazyData.attendance} />
					{:else if activeTab === 'attendance'}
						<p class="text-sm text-gray-500 p-4">Loading attendance data...</p>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="leave" class="pt-6">
					{#if lazyData.leave}
						<LeaveTab data={lazyData.leave} />
					{:else if activeTab === 'leave'}
						<p class="text-sm text-gray-500 p-4">Loading leave summary...</p>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="activity" class="pt-6">
					{#if lazyData.activity}
						<ActivityLogTab data={lazyData.activity} />
					{:else if activeTab === 'activity'}
						<p class="text-sm text-gray-500 p-4">Loading activity log...</p>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		</div>
	</Card.Content>
</div>
