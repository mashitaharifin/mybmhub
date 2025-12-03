<script lang="ts">
	import { onMount } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';

	import { Printer, LayoutGrid, Table as TableIcon, Search } from 'lucide-svelte';

	import LeaveBalanceCards from '../components/LeaveBalanceCardsManager.svelte';
	import LeaveBalanceTable from '../components/LeaveBalanceTableManager.svelte';

	import { fetchExcelExport } from '$lib/utils/exportHelpers';

	// State variables
	let employees: { id: number; name: string }[] = [];

	let leaveBalancesFetched: any[] = [];
	let leaveBalancesDisplayed: any[] = [];

	let employeeID: string = '';
	let searchTerm: string = '';

	let loading = true;
	let error: string | null = null;

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';

	let viewMode: 'cards' | 'table' = 'cards';

	// Track which employees are expanded
	let expandedEmployees = new Set<string>();

	// Helpers functions
	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		setTimeout(() => (alertMessage = null), 6000);
	}

	async function loadEmployees() {
		try {
			const res = await fetch('/api/employees');
			const json = await res.json();
			if (json.success) {
				employees = json.data;
			} else {
				showAlert(json.error || 'Failed to fetch employees', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to load employees', 'error');
		}
	}

	async function loadLeaveBalances() {
		loading = true;
		error = null;

		try {
			const params = new URLSearchParams();
			if (employeeID) params.append('employeeID', employeeID);

			const res = await fetch(`/api/leave/allBalances?${params.toString()}`);
			const json = await res.json();

			if (!json.success) {
				error = json.error || 'Failed to load leave balances';
				leaveBalancesFetched = [];
				leaveBalancesDisplayed = [];
			} else {
				leaveBalancesFetched = json.data ?? [];
				applyClientFilters();
			}
		} catch (err) {
			console.error(err);
			error = 'Failed to load leave balances';
			leaveBalancesFetched = [];
			leaveBalancesDisplayed = [];
		} finally {
			loading = false;
		}
	}

	// Filtering
	function applyClientFilters() {
		if (employeeID) {
			// Server-side filtered already
			leaveBalancesDisplayed = leaveBalancesFetched;
		} else if (searchTerm.trim().length > 0) {
			const q = searchTerm.trim().toLowerCase();
			leaveBalancesDisplayed = leaveBalancesFetched.filter((x) =>
				(x.employeeName ?? '').toLowerCase().includes(q)
			);
		} else {
			leaveBalancesDisplayed = leaveBalancesFetched;
		}

		// Ensure expanded employees still exist in filtered list
		const visible = new Set(leaveBalancesDisplayed.map((x) => x.employeeName));
		for (const name of Array.from(expandedEmployees)) {
			if (!visible.has(name)) expandedEmployees.delete(name);
		}
	}

	function handleSearchClick() {
		if (!employeeID) applyClientFilters();
	}

	function handleSearchKey(e: KeyboardEvent) {
		if (e.key === 'Enter') handleSearchClick();
	}

	function toggleView(mode: 'cards' | 'table') {
		viewMode = mode;
	}

	function toggleEmployeeSection(empName: string) {
		if (expandedEmployees.has(empName)) {
			expandedEmployees.delete(empName);
		} else {
			expandedEmployees.add(empName);
		}
		expandedEmployees = expandedEmployees;
	}

	async function handleExport() {
		try {
			await fetchExcelExport(leaveBalancesDisplayed, 'Employee Leave Balances', {
				name: 'My Company'
			});
			showAlert('Export successful', 'success');
		} catch (err) {
			console.error(err);
			showAlert('Export failed', 'error');
		}
	}

	onMount(async () => {
		await loadEmployees();
		await loadLeaveBalances();
	});

	// Reactive: re-apply search filter automatically (ONLY when "All Employees")
	$: if (!employeeID) {
		applyClientFilters();
	}

	// Grouping
	function groupByEmployee(list: any[]) {
		const map = new Map<string, { employeeName: string; employeeID?: number; items: any[] }>();

		for (const row of list) {
			const name = row.employeeName ?? 'Unknown';
			const id = row.employeeID;

			if (!map.has(name)) map.set(name, { employeeName: name, employeeID: id, items: [] });
			map.get(name)!.items.push(row);
		}

		return Array.from(map.values()).sort((a, b) => a.employeeName.localeCompare(b.employeeName));
	}

	$: groupedLeave = groupByEmployee(leaveBalancesDisplayed);
</script>

<svelte:head>
	<title>Employee Leave Balances – MyBM Hub</title>
	<meta name="description" content="View leave balances of all employees." />
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
						<BreadcrumbLink href="/manager/leave/manage">Leave</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Employee Leave Balances</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<br />

			<div>
				<Card.Title>Employee Leave Balances</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Review leave entitlements and remaining balances for your team.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title
					>{alertVariant === 'success'
						? 'Success'
						: alertVariant === 'error'
							? 'Error'
							: 'Info'}</Alert.Title
				>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Top Controls -->
		<div class="flex flex-wrap justify-between mb-4 items-center gap-4">
			<!-- Left: Employee Filter + Search -->
			<div class="flex flex-wrap items-center gap-3">
				<div class="flex flex-col text-sm font-medium">
					<label for="employee" class="text-gray-700 dark:text-gray-300">Employee</label>

					<select
						id="employee"
						bind:value={employeeID}
						on:change={() => loadLeaveBalances()}
						class="rounded-lg border px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-300"
					>
						<option value="">All Employees</option>
						{#each employees as e}
							<option value={e.id}>{e.name}</option>
						{/each}
					</select>
				</div>

				<!-- Search Only Works for All Employees -->
				<div class="flex flex-col text-sm font-medium">
					<label for="search-employee" class="text-gray-700 dark:text-gray-300">Search</label>
					<div class="flex items-center space-x-2">
						<input
							type="search"
							placeholder="Search employee name..."
							bind:value={searchTerm}
							on:keydown={handleSearchKey}
							class="rounded-lg border px-3 py-1 text-sm w-64 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
							aria-label="Search employee name"
							disabled={employeeID !== ''}
						/>

						<button
							on:click={handleSearchClick}
							class="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
							aria-label="Search button"
							disabled={employeeID !== ''}
						>
							<Search class="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>

			<!-- Right: View Toggle + Export -->
			<div class="flex items-center space-x-2">
				<button
					on:click={() => toggleView('cards')}
					class="p-2 rounded-md transition-colors {viewMode === 'cards'
						? 'bg-primary text-primary-foreground'
						: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
					title="Cards View"
				>
					<LayoutGrid class="w-5 h-5" />
				</button>

				<button
					on:click={() => toggleView('table')}
					class="p-2 rounded-md transition-colors {viewMode === 'table'
						? 'bg-primary text-primary-foreground'
						: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'}"
					title="Table View"
				>
					<TableIcon class="w-5 h-5" />
				</button>

				<button
					on:click={handleExport}
					class="p-2 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
					title="Export to PDF"
				>
					<Printer class="w-5 h-5" />
				</button>
			</div>
		</div>

		<!-- Main Content -->
		{#if loading}
			<div class="text-gray-500 dark:text-gray-400">Loading leave balances...</div>
		{:else if error}
			<div class="text-red-500">{error}</div>
		{:else if groupedLeave.length === 0}
			<div class="text-gray-500 dark:text-gray-400">No leave balances found.</div>
		{:else if viewMode === 'cards'}
			<!-- CARDS VIEW -->
			<div class="space-y-6">
				{#each groupedLeave as group (group.employeeName)}
					<div
						class="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden"
					>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="flex items-center justify-between px-4 py-3 cursor-pointer"
							on:click={() => toggleEmployeeSection(group.employeeName)}
						>
							<div>
								<div class="text-sm font-semibold text-gray-700 dark:text-gray-100">
									{group.employeeName}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{group.items.length} leave type{group.items.length > 1 ? 's' : ''}
								</div>
							</div>

							<div class="text-sm text-gray-500 dark:text-gray-300">
								{expandedEmployees.has(group.employeeName) ? '▲' : '▼'}
							</div>
						</div>

						{#if expandedEmployees.has(group.employeeName)}
							<div class="p-4">
								<LeaveBalanceCards {group} />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<!-- TABLE VIEW -->
			<div class="space-y-4">
				{#each groupedLeave as group (group.employeeName)}
					<div
						class="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden"
					>
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="flex items-center justify-between px-4 py-3 cursor-pointer"
							on:click={() => toggleEmployeeSection(group.employeeName)}
						>
							<div>
								<div class="text-sm font-semibold text-gray-700 dark:text-gray-100">
									{group.employeeName}
								</div>
								<div class="text-xs text-gray-500 dark:text-gray-400">
									{group.items.length} leave type{group.items.length > 1 ? 's' : ''}
								</div>
							</div>

							<div class="text-sm text-gray-500 dark:text-gray-300">
								{expandedEmployees.has(group.employeeName) ? '▲' : '▼'}
							</div>
						</div>

						{#if expandedEmployees.has(group.employeeName)}
							<div class="p-4 overflow-x-auto">
								<LeaveBalanceTable {group} />
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{/if}
	</Card.Content>
</Card.Root>
