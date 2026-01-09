<script lang="ts">
	import type { PageData } from './$types';
	import FilterPanel from '../FilterPanel.svelte';
	import AutoPunchTable from './AutoPunchTable.svelte';
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
	import { onMount, onDestroy } from 'svelte';
	import { exportElementToPDF } from '$lib/utils/exportHelpers';

	// FILTER STATE
	let filters = {
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
		employeeQuery: ''
	};

	// ALERT HANDLING
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

	// FILTER HANDLERS
	function handleApply(e: CustomEvent) {
		filters = { ...e.detail };
		showAlert('Filters applied', 'success');
	}

	// EXPORT FUNCTIONALITY
	let company: any = {};

	async function loadCompanyProfile() {
		try {
			const res = await fetch('/api/system-settings/company-profile');
			const data = await res.json();
			if (data.success) company = data.company;
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}
	}

	async function handleExportPDF(e: CustomEvent) {
		try {
			showAlert('Preparing PDF export...', 'info');
			
			// Grab table element
			const tableEl = document.querySelector('#auto-punch-table') as HTMLElement;
			if (!tableEl) {
				showAlert('Table not found', 'error');
				return;
			}

			// Generate filename and title
			const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			const monthName = monthNames[filters.month - 1];
			const filename = `Auto_Punch_Summary_${monthName}_${filters.year}.pdf`;
			const title = `Auto Punch Summary - ${monthName} ${filters.year}`;

			await exportElementToPDF(tableEl, filename, title, company);
			showAlert('PDF exported successfully!', 'success');
		} catch (error) {
			console.error('Export error:', error);
			showAlert('Failed to export PDF', 'error');
		}
	}

	onMount(async () => {
		await loadCompanyProfile();
	});
</script>

<svelte:head>
	<title>Auto Punch-Out Summary – MyBM Hub</title>
	<meta
		name="description"
		content="Review auto punch-out events and manage attendance anomalies."
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
						<BreadcrumbLink href="/manager/attendance">Attendance</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Auto-Punch Outs Summary</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>Auto Punch-Out Summary</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Review auto punch-out events and manage attendance anomalies.
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

		<div class="flex items-center justify-between mb-4">
			<FilterPanel on:apply={handleApply} on:exportPDF={handleExportPDF} on:alert={(e) => showAlert(e.detail.message, e.detail.variant)} />
		</div>

		<AutoPunchTable 
			on:alert={(e) => showAlert(e.detail.message, e.detail.variant)} 
			filters={filters}
		/>
	</Card.Content>
</Card.Root>