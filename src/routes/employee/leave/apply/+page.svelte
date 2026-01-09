<script lang="ts">
	import { onMount } from 'svelte';
	import LeaveTable from '../components/LeaveTable.svelte';
	import LeaveDetailsModal from '../components/LeaveDetailsModal.svelte';
	import ConfirmDialog from '../components/ConfirmDialog.svelte';
	import LeaveApplicationForm from '../components/LeaveApplicationForm.svelte';
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
	import { RefreshCcw, Search, Printer } from 'lucide-svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { exportElementToPDF } from '$lib/utils/exportHelpers';

	// State
	let leaveApplications: any[] = [];
	let allApplications: any[] = [];
	let totalRecords = 0;
	let loading = false;
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';

	// Table state
	let searchKeyword = '';
	let limit = 10;
	let offset = 0;

	// Modal states
	let showApplyForm = false;
	let showDetailsModal = false;
	let detailsTarget: any = null;
	let showCancelConfirm = false;
	let cancelTargetId: number | null = null;

	// Alert timeout
	let t: NodeJS.Timeout | null = null;

	let company: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	} = {};

	let currentUserName = '';

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

	// Alert handler
	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	// Load employee leave applications
	async function loadApplications() {
		loading = true;
		try {
			const params = new URLSearchParams({
				limit: String(limit),
				offset: String(offset)
			});
			if (searchKeyword) params.append('search', searchKeyword);

			const res = await fetch(`/api/leave/my-applications?${params.toString()}`);
			const data = await res.json();
			if (data.success) {
				allApplications = data.data.applications ?? [];
				leaveApplications = [...allApplications];
				totalRecords = data.data.total ?? allApplications.length;
			} else {
				showAlert(data.error || 'Failed to load leave applications', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to fetch leave applications', 'error');
		} finally {
			loading = false;
		}
	}

	function handleRefresh() {
		offset = 0;
		searchKeyword = '';
		leaveApplications = [...allApplications];
		loadApplications();
	}

	// Event handlers
	function handlePageChange(newOffset: number) {
		offset = newOffset;
		loadApplications();
	}

	function handleOpenDetails(app: any) {
		detailsTarget = app;
		showDetailsModal = true;
	}

	function confirmCancelLeave(id: number) {
		cancelTargetId = id;
		showCancelConfirm = true;
	}

	async function executeCancelLeave() {
		if (cancelTargetId === null) return;
		try {
			const res = await fetch(`/api/leave/cancel/${cancelTargetId}`, { method: 'PUT' });
			const data = await res.json();
			if (data.success) {
				showAlert('Leave cancelled successfully', 'success');
				loadApplications();
			} else {
				showAlert(data.error || 'Failed to cancel leave', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to cancel leave', 'error');
		} finally {
			showCancelConfirm = false;
			cancelTargetId = null;
		}
	}

	// When a leave is applied, reload table
	function onLeaveApplied() {
		showApplyForm = false;
		loadApplications();
		showAlert('Leave application submitted successfully', 'success');
	}

	// Export functionality
	async function handleExport() {
		let filterText = `${currentUserName}'s Leave Applications`;

		if (searchKeyword) {
			filterText += ` - Search: ${searchKeyword}`;
		}

		// Get DOM element to export (only the table, excluding search filters)
		const tableElement = document.getElementById('leave-applications-table');
		if (!tableElement) {
			showAlert('Table not found for export.', 'error');
			return;
		}

		// Build company header values
		let companyToExport = { ...company };
		if (company.logoPath) {
			companyToExport.logoPath = await loadImageAsDataURL(company.logoPath);
		}

		try {
			await exportElementToPDF(
				tableElement,
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

	onMount(async () => {
		// Load company info
		try {
			const companyRes = await fetch('/api/system-settings/company-profile');
			const companyData = await companyRes.json();
			if (companyData.success) {
				company = companyData.company;
			}
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}

		// Load current user info
		try {
			const userRes = await fetch('/api/me');
			const userData = await userRes.json();
			if (userData.success) {
				currentUserName = userData.data.name || 'My';
			}
		} catch (err) {
			console.warn('Failed to fetch current user info', err);
			currentUserName = 'My';
		}

		loadApplications();
	});

	// Reactive state for refresh button
	$: isRefreshEnabled = searchKeyword.trim().length > 0;

	// Reactive search
	$: {
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			leaveApplications = [...allApplications];
		} else {
			leaveApplications = allApplications.filter(
				(app) =>
					app.leaveTypeName.toLowerCase().includes(keyword) ||
					app.status.toLowerCase().includes(keyword)
			);
		}
		totalRecords = leaveApplications.length;
		offset = 0;
	}
</script>

<svelte:head>
	<title>My Leave Applications – MyBM Hub</title>
	<meta name="description" content="Apply for leave and view your leave applications." />
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
						<BreadcrumbLink href="/employee/leave/balance">Leave</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Leave Applications</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>My Leave Applications</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					View your leave applications and apply for new leave.
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

		<!-- Search + Action Buttons -->
		<div class="flex justify-between items-end mb-4">
			<!-- Left: Search Controls -->
			<div class="flex gap-2 items-end">
				<div class="flex flex-col text-sm font-medium">
					<label for="search" class="text-gray-700 dark:text-gray-300">Search Leave</label>
					<Input
						id="search"
						placeholder="Search by status or type"
						bind:value={searchKeyword}
						class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
					/>
				</div>

				<Button on:click={handleRefresh} title="Refresh" disabled={!isRefreshEnabled}>
					<RefreshCcw class="w-4 h-4" />
				</Button>

				<Button on:click={handleExport} title="Export PDF">
					<Printer class="w-4 h-4" />
				</Button>
			</div>

			<!-- Right: Apply Leave + Export Buttons -->
			<div class="flex gap-2">
				<Button on:click={() => (showApplyForm = true)} class="px-4">+ Apply Leave</Button>
			</div>
		</div>

		<!-- Leave Table Component - Wrapped for export -->
		<div id="leave-applications-table">
			<LeaveTable
				applications={leaveApplications}
				{loading}
				{totalRecords}
				{limit}
				{offset}
				onPageChange={handlePageChange}
				onOpenDetails={handleOpenDetails}
				onConfirmCancel={confirmCancelLeave}
			/>
		</div>
	</Card.Content>
</Card.Root>

<!-- Apply Leave Modal -->
{#if showApplyForm}
	<LeaveApplicationForm on:close={() => (showApplyForm = false)} on:submitted={onLeaveApplied} />
{/if}

<!-- Leave Details Modal -->
{#if showDetailsModal && detailsTarget}
	<LeaveDetailsModal application={detailsTarget} onClose={() => (showDetailsModal = false)} />
{/if}

<!-- Cancel Leave Confirm Dialog -->
{#if showCancelConfirm}
	<ConfirmDialog
		title="Confirm Cancel Leave"
		message="Are you sure you want to cancel this leave request?"
		on:confirm={executeCancelLeave}
		on:cancel={() => (showCancelConfirm = false)}
	/>
{/if}
