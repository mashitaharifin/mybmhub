<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
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
	import * as Alert from '$lib/components/ui/alert';
	import { RotateCcw, ChevronLeft, ChevronRight, Printer } from 'lucide-svelte';
	import { format } from '$lib/utils/formatHelpers';
	import { exportElementToPDF } from '$lib/utils/exportHelpers';

	let logs: any[] = [];
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	let searchKeyword = '';
	let dateFrom = '';
	let dateTo = '';
	let limit = 20;
	let offset = 0;
	let totalRecords = 0;
	let loading = false;
	let expandedRow: number | null = null;

	let employeeID = ''; // filter by employee
	let showAll = true; // toggle: all employees / my logs

	const currentUserID = 1; // replace with store/session
	let employees: { id: number; name: string }[] = [];

	onDestroy(() => t && clearTimeout(t));

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	// Load logs from API
	async function loadLogs() {
		loading = true;
		try {
			const params = new URLSearchParams({
				userID: String(currentUserID),
				limit: String(limit),
				offset: String(offset),
				showAll: String(showAll)
			});
			if (showAll && employeeID) params.append('employeeID', employeeID);
			if (searchKeyword) params.append('search', searchKeyword);
			if (dateFrom) params.append('dateFrom', dateFrom);
			if (dateTo) params.append('dateTo', dateTo);

			const res = await fetch(`/api/recent-activity?${params.toString()}`);
			const data = await res.json();
			if (data.success) {
				logs = data.data.logs ?? data.data;
				totalRecords = data.data.total ?? logs.length;
			} else {
				showAlert(data.error || 'Failed to fetch logs', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to fetch logs', 'error');
		} finally {
			loading = false;
		}
	}

	// Load employee list for filter
	async function loadEmployees() {
		try {
			const res = await fetch('/api/employees');
			const data = await res.json();
			if (data.success) {
				employees = data.data;
			} else {
				showAlert(data.error || 'Failed to fetch employees', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to fetch employees', 'error');
		}
	}

	let prevSearch = searchKeyword;
	let prevFrom = dateFrom;
	let prevTo = dateTo;

	$: {
		if (searchKeyword !== prevSearch || dateFrom !== prevFrom || dateTo !== prevTo) {
			prevSearch = searchKeyword;
			prevFrom = dateFrom;
			prevTo = dateTo;
			loadLogs();
		}
	}

	function resetFilters() {
		searchKeyword = '';
		dateFrom = '';
		dateTo = '';
		offset = 0;
	}

	async function loadImageAsDataURL(url: string): Promise<string> {
		const res = await fetch(url);
		const blob = await res.blob();
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.onerror = reject;
			reader.readAsDataURL(blob);
		});
	}

	async function handleExport() {
		let filterText = 'All Employees Recent Activity';

		if (!showAll) filterText = 'My Recent Activity';
		else if (employeeID) {
			const emp = employees.find((e) => e.id == Number(employeeID));
			filterText = `${emp?.name}'s Recent Activity`;
		}

		if (dateFrom || dateTo) {
			filterText += ' from ' + (dateFrom || '-') + ' to ' + (dateTo || '-');
		}

		// get DOM element to export
		const tableElement = document.getElementById('recent-activity-table');
		if (!tableElement) {
			showAlert('Table not found for export.', 'error');
			return;
		}

		// build company header values
		let companyToExport = { ...company };
		if (company.logoPath) {
			companyToExport.logoPath = await loadImageAsDataURL(company.logoPath);
		}

		await exportElementToPDF(
			tableElement,
			`${filterText}.pdf`,
			filterText, // title
			company // company info
		);
	}

	function toggleRow(index: number) {
		expandedRow = expandedRow === index ? null : index;
	}

	function prevPage() {
		if (offset - limit >= 0) {
			offset -= limit;
			loadLogs();
		}
	}

	function nextPage() {
		if (offset + limit < totalRecords) {
			offset += limit;
			loadLogs();
		}
	}

	async function toggleShowAll(event: Event) {
		const select = event.target as HTMLSelectElement;
		showAll = select.value === 'true';
		employeeID = '';
		offset = 0;

		if (showAll) {
			await loadEmployees();
		}

		loadLogs();
	}

	const actionColorMap: { category: string; color: string; description: string }[] = [
		{
			category: 'punch',
			color:
				'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800',
			description: 'Punch In/Out'
		},
		{
			category: 'profile-password',
			color:
				'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
			description: 'Profile/Password'
		},
		{
			category: 'leave',
			color:
				'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
			description: 'Leave Applications & Management'
		},
		{
			category: 'default',
			color:
				'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
			description: 'Other / System'
		}
	];

	function getActionColor(action: string | undefined) {
		if (!action) return actionColorMap.find((c) => c.category === 'default')?.color;

		const lower = action.toLowerCase();

		if (lower.includes('punch')) return actionColorMap[0].color;

		if (lower.includes('profile') || lower.includes('password')) return actionColorMap[1].color;

		// New: Leave-related actions
		if (
			lower.includes('leave') ||
			lower.includes('apply') ||
			lower.includes('approve') ||
			lower.includes('reject') ||
			lower.includes('cancel') ||
			lower.includes('annual') ||
			lower.includes('medical') ||
			lower.includes('emergency')
		)
			return actionColorMap[2].color;

		return actionColorMap[3].color; // Default
	}

	let company: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	} = {};

	onMount(async () => {
		try {
			const res = await fetch('/api/system-settings/company-profile');
			const data = await res.json();
			if (data.success) {
				company = data.company;
			} else {
				console.warn('Failed to fetch company info');
			}
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}

		if (showAll) loadEmployees();
		loadLogs();
	});
</script>

<svelte:head>
	<title>Recent Activity – MyBM Hub</title>
	<meta name="description" content="View recent activity logs for all employees." />
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
						<BreadcrumbPage>Recent Activity</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>Recent Activity</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					View your team's latest leave requests, attendance actions, and system updates.
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

		<!-- Filters + Toggle -->
		<div class="flex flex-wrap gap-4 mb-4 items-end">
			<!-- Show / My Logs / All Employees -->
			<div class="flex flex-col text-sm font-medium">
				<label for="show" class="text-gray-700 dark:text-gray-300">View</label>
				<select
					id="show"
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
					on:change={toggleShowAll}
				>
					<option value={false}>My Logs</option>
					<option value={true} selected>All Employees</option>
				</select>
			</div>

			<!-- Employee Filter -->
			{#if showAll}
				<div class="flex flex-col text-sm font-medium">
					<label for="employee" class="text-gray-700 dark:text-gray-300">Employee</label>
					<select
						id="employee"
						bind:value={employeeID}
						on:change={loadLogs}
						class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
					>
						<option value="">All</option>
						{#each employees as e}
							<option value={e.id}>{e.name}</option>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Search Input -->
			<div class="flex flex-col text-sm font-medium">
				<label for="search" class="text-gray-700 dark:text-gray-300">Search Action / Table</label>
				<Input
					id="search"
					placeholder="e.g., Punch In/Out"
					bind:value={searchKeyword}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
				/>
			</div>

			<!-- From Date -->
			<div class="flex flex-col text-sm font-medium">
				<label for="dateFrom" class="text-gray-700 dark:text-gray-300">From</label>
				<Input
					id="dateFrom"
					type="date"
					bind:value={dateFrom}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
				/>
			</div>

			<!-- To Date -->
			<div class="flex flex-col text-sm font-medium">
				<label for="dateTo" class="text-gray-700 dark:text-gray-300">To</label>
				<Input
					id="dateTo"
					type="date"
					bind:value={dateTo}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
				/>
			</div>

			<div class="flex gap-2">
				<Button variant="primary" on:click={resetFilters} title="Reset">
					<RotateCcw class="w-4 h-4" />
				</Button>

				<Button on:click={() => handleExport()} title="Export PDF">
					<Printer class="w-4 h-4" />
				</Button>
			</div>
		</div>

		<!-- Action Color Legend -->
		<div class="flex gap-4 mb-4 items-center text-sm font-medium text-gray-700 dark:text-gray-100">
			{#each actionColorMap as map}
				<div class="flex items-center gap-1">
					<span class={`w-4 h-4 rounded-full ${map.color}`}></span>
					<span>{map.description}</span>
				</div>
			{/each}
		</div>

		<!-- Logs Table -->
		<div class="overflow-x-auto">
			<Table.Root id="recent-activity-table">
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[50px]">#</Table.Head>
						<Table.Head>Timestamp</Table.Head>
						<Table.Head>Action</Table.Head>
						<Table.Head>Target</Table.Head>
						<Table.Head>Details</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#if logs.length}
						{#each logs as log, i}
							<Table.Row class="cursor-pointer" on:click={() => toggleRow(i)}>
								<Table.Cell>{i + 1}</Table.Cell>
								<Table.Cell>{format.timestamp(log.createdAt)}</Table.Cell>

								<!-- Action Badge -->
								<Table.Cell>
									<span class={`px-2 py-1 rounded-xl text-xs ${getActionColor(log.action)}`}>
										{log.action}
									</span>
								</Table.Cell>

								<Table.Cell>{log.targetTable ?? '-'}</Table.Cell>

								<Table.Cell class="whitespace-pre-wrap break-words max-w-xs">
									{typeof log.details === 'string'
										? log.details
										: JSON.stringify(log.details, null, 2)}
								</Table.Cell>
							</Table.Row>

							{#if expandedRow === i}
								<Table.Row class="bg-gray-100 dark:bg-gray-800">
									<Table.Cell colspan="6" class="text-sm font-mono p-2 whitespace-pre-wrap">
										<pre>{JSON.stringify(log.details, null, 2)}</pre>
									</Table.Cell>
								</Table.Row>
							{/if}
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan="6" class="text-center text-muted-foreground h-16">
								No recent activity found.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>

		<!-- Pagination -->
		<div class="flex justify-between mt-4 items-center">
			<div class="text-sm text-gray-600 dark:text-gray-100">
				Showing {offset + 1}-{Math.min(offset + limit, totalRecords)} of {totalRecords} records
			</div>
			<div class="flex space-x-2">
				<Button variant="primary" on:click={prevPage} disabled={offset === 0}>
					<ChevronLeft class="w-4 h-4" />
				</Button>
				<Button variant="primary" on:click={nextPage} disabled={offset + limit >= totalRecords}>
					<ChevronRight class="w-4 h-4" />
				</Button>
			</div>
		</div>
	</Card.Content>
</Card.Root>
