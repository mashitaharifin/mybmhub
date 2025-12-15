<script lang="ts">
	import { onMount } from 'svelte';
	import LeaveTable from './LeaveTable.svelte';
	import LeaveDetailsModal from './LeaveDetailsModal.svelte';
	import ConfirmMessage from './ConfirmMessage.svelte';
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
	let totalRecords = 0;
	let loading = false;
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';

	// Filters
	let statusFilter = '';
	let employeeFilter = '';

	// Table state
	let limit = 10;
	let offset = 0;

	// Modal states
	let showDetailsModal = false;
	let detailsTarget: any = null;
	let confirmConfig: any = null;

	// Alert timeout
	let t: NodeJS.Timeout | null = null;

	// Alert handler
	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	// Wrapper Reference
	let exportSection: HTMLDivElement;

	// Company info for PDF header
	let company: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	} = {};

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

	// Load leave applications
	async function loadApplications() {
		loading = true;
		try {
			const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
			if (statusFilter) params.append('status', statusFilter);
			if (employeeFilter) params.append('employee', employeeFilter);

			const res = await fetch(`/api/leave/all?${params.toString()}`);
			const data = await res.json();

			if (data.success) {
				leaveApplications = data.data.applications ?? [];
				totalRecords = data.data.total ?? leaveApplications.length;
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

	// Event handlers
	function handlePageChange(newOffset: number) {
		offset = newOffset;
		loadApplications();
	}

	function handleOpenDetails(app: any) {
		detailsTarget = app;
		showDetailsModal = true;
	}

	function handleConfirmApprove(id: number) {
		confirmConfig = {
			type: 'approve',
			title: 'Confirm Approve Leave',
			message: 'Are you sure you want to approve this leave request?',
			targetId: id
		};
	}

	function handleConfirmCancel(id: number) {
		confirmConfig = {
			type: 'cancel',
			title: 'Confirm Cancel Leave',
			message: 'Are you sure you want to cancel this leave request?',
			targetId: id
		};
	}

	function handleConfirmReject(id: number) {
		confirmConfig = {
			type: 'reject',
			title: 'Reject Leave Application',
			message: 'Please provide a reason for rejection:',
			targetId: id,
			requiresInput: true
		};
	}

	function handleConfirmClose() {
		confirmConfig = null;
	}

	async function handleConfirmAction(action: string, id: number, reason?: string) {
		try {
			let endpoint = '';
			let method = 'PUT';
			let body = null;

			switch (action) {
				case 'approve':
					endpoint = `/api/leave/approve/${id}`;
					break;
				case 'cancel':
					endpoint = `/api/leave/cancel/${id}`;
					break;
				case 'reject':
					endpoint = `/api/leave/reject/${id}`;
					body = JSON.stringify({ reason });
					break;
			}

			const res = await fetch(endpoint, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body
			});
			const data = await res.json();

			if (data.success) {
				const message =
					action === 'approve'
						? 'Leave approved'
						: action === 'cancel'
							? 'Leave cancelled'
							: 'Leave rejected';
				showAlert(message, 'success');
				loadApplications();
			} else {
				showAlert(data.error || `Failed to ${action} leave`, 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert(`Failed to ${action} leave`, 'error');
		} finally {
			handleConfirmClose();
		}
	}

	async function handleExport() {
		try {
			if (!exportSection) {
				showAlert('Nothing to export', 'error');
				return;
			}

			let companyToExport = { ...company };

			// convert logo to base64
			if (company.logoPath) {
				companyToExport.logoPath = await loadImageAsDataURL(company.logoPath);
			}

			await exportElementToPDF(
				exportSection,
				'Leave Applications.pdf',
				'Leave Applications Report',
				companyToExport
			);
		} catch (err) {
			console.error(err);
			showAlert('Failed to export PDF', 'error');
		}
	}

	onMount(async () => {
		// 1. Fetch company profile
		try {
			const res = await fetch('/api/system-settings/company-profile');
			const data = await res.json();
			if (data.success) company = data.company;
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}

		// 2. Load leave applications
		loadApplications();
	});
</script>

<svelte:head>
	<title>Manage Leave Applications – MyBM Hub</title>
	<meta name="description" content="Manager view for leave application management" />
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
						<BreadcrumbLink href="/manager/leave/balance">Leave</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem><BreadcrumbPage>Leave Management</BreadcrumbPage></BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>Leave Application Management</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Manage pending and approved leave requests from your team.
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
		<div class="flex gap-4 mb-4 items-end">
			<!-- Status Filter -->
			<div class="flex flex-col text-sm font-medium">
				<label for="status-filter" class="text-gray-700 dark:text-gray-300 mb-1">Status</label>
				<select
					id="status-filter"
					bind:value={statusFilter}
					class="rounded-lg border border-gray-300 px-2 py-1 text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
				>
					<option value="">All Status</option>
					<option value="Pending">Pending</option>
					<option value="Approved">Approved</option>
					<option value="Rejected">Rejected</option>
					<option value="Cancelled">Cancelled</option>
				</select>
			</div>

			<!-- Employee Filter -->
			<div class="flex flex-col text-sm font-medium">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label for="employee-search" class="text-gray-700 dark:text-gray-300 mb-1">Search</label>
				<Input
					id="employee-search"
					placeholder="Search employee name"
					bind:value={employeeFilter}
					class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition min-w-[140px]"
				/>
			</div>

			<!-- Apply Filter Button -->
			<Button on:click={loadApplications} class="flex items-center gap-2" title="Apply Filter">
				<Search class="w-4 h-4" />
			</Button>

			<!-- Reset Filter Button -->
			<Button
				variant="primary"
				on:click={() => {
					statusFilter = '';
					employeeFilter = '';
					loadApplications();
				}}
				title="Reset Filters"
			>
				<RefreshCcw class="w-4 h-4" />
			</Button>

			<Button on:click={() => handleExport()} title="Export PDF">
				<Printer class="w-4 h-4" />
			</Button>
		</div>

		<div bind:this={exportSection}>
			<!-- Leave Table Component -->
			<LeaveTable
				applications={leaveApplications}
				{loading}
				{totalRecords}
				{limit}
				{offset}
				onPageChange={handlePageChange}
				onOpenDetails={handleOpenDetails}
				onConfirmApprove={handleConfirmApprove}
				onConfirmCancel={handleConfirmCancel}
				onConfirmReject={handleConfirmReject}
			/>
		</div>
	</Card.Content>
</Card.Root>

<!-- Leave Details Modal -->
{#if showDetailsModal && detailsTarget}
	<LeaveDetailsModal application={detailsTarget} onClose={() => (showDetailsModal = false)} />
{/if}

<!-- Confirm Message Modal -->
{#if confirmConfig}
	<ConfirmMessage
		config={confirmConfig}
		onConfirm={handleConfirmAction}
		onCancel={handleConfirmClose}
	/>
{/if}
