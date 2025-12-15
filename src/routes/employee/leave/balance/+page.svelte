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
	import Button from '$lib/components/ui/button.svelte';
	import { Printer, LayoutGrid, Table as TableIcon } from 'lucide-svelte';

	import LeaveBalanceCards from '../components/LeaveBalanceCards.svelte';
	import LeaveBalanceTable from '../components/LeaveBalanceTable.svelte';
	import { getEmpLeaveBalance } from '../../dashboard/services/dashboardAPI';
	import { exportElementToPDF } from '$lib/utils/exportHelpers';

	let leaveBalances: any[] = [];
	let loading = true;
	let error: string | null = null;
	let viewMode: 'cards' | 'table' = 'cards';
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let currentUserName = '';

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		setTimeout(() => (alertMessage = null), 8000);
	}

	async function loadLeaveBalances() {
		loading = true;
		try {
			leaveBalances = await getEmpLeaveBalance();
		} catch (err) {
			console.error(err);
			error = 'Failed to load leave balances';
			showAlert('Failed to load leave balances', 'error');
		} finally {
			loading = false;
		}
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
		let filterText = `${currentUserName} Leave Balance`;

		// Get DOM element to export
		const exportElement = document.getElementById('leave-balance-export');
		if (!exportElement) {
			showAlert('Export container not found.', 'error');
			return;
		}

		// Build company header values
		let companyToExport = { ...company };
		if (company.logoPath) {
			companyToExport.logoPath = await loadImageAsDataURL(company.logoPath);
		}

		try {
			await exportElementToPDF(
				exportElement,
				`${filterText}.pdf`,
				filterText, // title
				companyToExport // company info
			);
			showAlert('Export successful!', 'success');
		} catch (err) {
			console.error(err);
			showAlert('Export failed', 'error');
		}
	}

	function toggleView(mode: 'cards' | 'table') {
		viewMode = mode;
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
			// Load company info
			const companyRes = await fetch('/api/system-settings/company-profile');
			const companyData = await companyRes.json();
			if (companyData.success) {
				company = companyData.company;
			}
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}

		try {
			// Load current user info
			const userRes = await fetch('/api/me');
			const userData = await userRes.json();
			if (userData.success) {
				currentUserName = userData.data.name;
			}
		} catch (err) {
			console.warn('Failed to fetch current user info', err);
			currentUserName = 'My';
		}

		loadLeaveBalances();
	});
</script>

<svelte:head>
	<title>My Leave Balance – MyBM Hub</title>
	<meta name="description" content="View your leave balance for current year." />
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<!-- Header -->
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/employee/dashboard">Dashboard</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="/employee/leave/apply">Leave</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Leave Balance</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />

			<div>
				<Card.Title>My Leave Balance</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					View your leave balance for current year.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		<div id="leave-balance-export">
			<!-- Alert -->
			{#if alertMessage}
				<Alert.Root variant={alertVariant}>
					<Alert.Title>
						{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
					</Alert.Title>
					<Alert.Description>{alertMessage}</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- Controls: Toggle & Export -->
			<div class="flex justify-between mb-4 items-center">
				<div class="flex gap-2">
					<!-- Cards View Button -->
					<Button
						on:click={() => toggleView('cards')}
						variant={viewMode === 'cards' ? 'default' : 'primary'}
						title="Cards View"
						aria-label="Switch to cards view"
					>
						<LayoutGrid class="w-4 h-4" />
					</Button>

					<!-- Table View Button -->
					<Button
						on:click={() => toggleView('table')}
						variant={viewMode === 'table' ? 'default' : 'primary'}
						title="Table View"
						aria-label="Switch to table view"
					>
						<TableIcon class="w-4 h-4" />
					</Button>

					<!-- Export Button -->
					<Button on:click={handleExport} title="Export PDF">
						<Printer class="w-4 h-4" />
					</Button>
				</div>
			</div>

			<!-- Main Content -->
			{#if loading}
				<div class="text-gray-500 dark:text-gray-400 py-8 text-center">
					Loading leave balances...
				</div>
			{:else if error}
				<div class="text-red-500 dark:text-red-400 py-8 text-center">{error}</div>
			{:else if leaveBalances.length === 0}
				<div class="text-gray-500 dark:text-gray-400 py-8 text-center">
					No leave balances found.
				</div>
			{:else if viewMode === 'cards'}
				<LeaveBalanceCards {leaveBalances} />
			{:else}
				<LeaveBalanceTable {leaveBalances} />
			{/if}
		</div>
	</Card.Content>
</Card.Root>
