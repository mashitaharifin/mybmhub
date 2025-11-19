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
	import { RefreshCcw, ChevronLeft, ChevronRight, Printer } from 'lucide-svelte';
	import { format } from '$lib/utils/formatHelpers';
	import { exportToPDF } from '$lib/utils/exportHelpers';

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

	const currentUserID = 1; // replace with actual session/store user ID

	let company: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	} = {};

	onDestroy(() => t && clearTimeout(t));

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	async function loadLogs() {
		loading = true;
		try {
			const params = new URLSearchParams({
				userID: String(currentUserID),
				limit: String(limit),
				offset: String(offset)
			});
			if (searchKeyword) params.append('search', searchKeyword);
			if (dateFrom) params.append('dateFrom', dateFrom);
			if (dateTo) params.append('dateTo', dateTo);

			const res = await fetch(`/api/recent-activity?${params.toString()}`);
			const data = await res.json();
			if (data.success) {
				logs = data.data.logs ?? [];
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

	function handleRefresh() {
		offset = 0;
		loadLogs();
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
		const filterText = `My Recent Activity${dateFrom || dateTo ? ' from ' + (dateFrom || '-') + ' to ' + (dateTo || '-') : ''}`;
		let companyToExport = { ...company };

		if (company.logoPath) {
			companyToExport.logoPath = await loadImageAsDataURL(company.logoPath);
		}

		await exportToPDF(logs, `${filterText}.pdf`, filterText, companyToExport);
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

	const actionColorMap: { category: string; color: string; description: string }[] = [
		{ category: 'punch', color: 'bg-green-400 dark:bg-green-600', description: 'Punch In/Out' },
		{
			category: 'profile-update',
			color: 'bg-blue-400 dark:bg-blue-600',
			description: 'Profile / Password / Update'
		},
		{ category: 'default', color: 'bg-gray-400 dark:bg-gray-600', description: 'Other / System' }
	];

	function getActionColor(action: string | undefined) {
		if (!action) return actionColorMap.find((c) => c.category === 'default')?.color;
		const lower = action.toLowerCase();
		if (lower.includes('punch')) return actionColorMap[0].color;
		if (lower.includes('profile') || lower.includes('update') || lower.includes('password'))
			return actionColorMap[1].color;
		return actionColorMap[2].color;
	}

	let currentUserName = 'Me';

	onMount(async () => {
		try {
			const res = await fetch('/api/system-settings/company-profile');
			const data = await res.json();
			if (data.success) company = data.company;
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}

		try {
			const res = await fetch('/api/me'); 
			const data = await res.json();
			if (data.success) {
				currentUserName = data.data.name;
			}
		} catch (err) {
			console.warn('Failed to fetch current user info', err);
		}

		loadLogs();
	});
</script>

<svelte:head>
	<title>My Recent Activity – MyBM Hub</title>
	<meta name="description" content="View your latest activity logs." />
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/employee/dashboard">Dashboard</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Recent Activity</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>My Recent Activity</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					View your latest leave requests, attendance actions, and system updates.
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

		<!-- Filters -->
		<div class="flex flex-wrap gap-4 mb-4 items-end">
			<div class="flex flex-col text-sm font-medium">
				<label for="search" class="text-gray-700 dark:text-gray-300">Search Action / Table</label>
				<Input
					id="search"
					placeholder="e.g., Punch In/Out"
					bind:value={searchKeyword}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
				/>
			</div>
			<div class="flex flex-col text-sm font-medium">
				<label for="dateFrom" class="text-gray-700 dark:text-gray-300">From</label>
				<Input
					id="dateFrom"
					type="date"
					bind:value={dateFrom}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
				/>
			</div>
			<div class="flex flex-col text-sm font-medium">
				<label for="dateTo" class="text-gray-700 dark:text-gray-300">To</label>
				<Input
					id="dateTo"
					type="date"
					bind:value={dateTo}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
				/>
			</div>
			<div class="flex gap-2">
				<Button on:click={handleRefresh} title="Refresh"><RefreshCcw class="w-4 h-4" /></Button>
				<Button on:click={handleExport} title="Export PDF"><Printer class="w-4 h-4" /></Button>
			</div>
		</div>

		<!-- Action Legend -->
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
			<Table.Root>
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
								<Table.Cell
									><span
										class={`px-2 py-1 rounded-xl text-white text-xs ${getActionColor(log.action)}`}
										>{log.action}</span
									></Table.Cell
								>
								<Table.Cell>{log.targetTable ?? '-'}</Table.Cell>
								<Table.Cell class="whitespace-pre-wrap break-words max-w-xs"
									>{typeof log.details === 'string'
										? log.details
										: JSON.stringify(log.details, null, 2)}</Table.Cell
								>
							</Table.Row>
							{#if expandedRow === i}
								<Table.Row class="bg-gray-100 dark:bg-gray-800">
									<Table.Cell colspan="5" class="text-sm font-mono p-2 whitespace-pre-wrap"
										><pre>{JSON.stringify(log.details, null, 2)}</pre></Table.Cell
									>
								</Table.Row>
							{/if}
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan="5" class="text-center text-muted-foreground h-16"
								>No recent activity found.</Table.Cell
							>
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
				<Button variant="outline" on:click={prevPage} disabled={offset === 0}
					><ChevronLeft class="w-4 h-4" /></Button
				>
				<Button variant="outline" on:click={nextPage} disabled={offset + limit >= totalRecords}
					><ChevronRight class="w-4 h-4" /></Button
				>
			</div>
		</div>
	</Card.Content>
</Card.Root>
