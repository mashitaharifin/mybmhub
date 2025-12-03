<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import LeaveApplicationForm from '../components/LeaveApplicationForm.svelte';
	import ConfirmDialog from '../components/ConfirmDialog.svelte';
	import LeaveStatusBadge from '../components/LeaveStatusBadge.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import { format } from '$lib/utils/formatHelpers';
	import { RefreshCcw, ChevronLeft, ChevronRight, CircleX, Search } from 'lucide-svelte';

	let leaveApplications: any[] = [];
	let allApplications: any[] = [];

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	let showApplyForm = false;
	let showCancelConfirm = false;
	let cancelTargetId: number | null = null;

	// Table state
	let searchKeyword = '';
	let limit = 10;
	let offset = 0;
	let totalRecords = 0;
	let loading = false;

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	onDestroy(() => t && clearTimeout(t));

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
				leaveApplications = [...allApplications]; // initially show all
				totalRecords = leaveApplications.length;
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

	function handleSearch() {
		const keyword = searchKeyword.trim().toLowerCase();
		if (!keyword) {
			leaveApplications = [...allApplications]; // reset
		} else {
			leaveApplications = allApplications.filter((app) => {
				return (
					app.leaveTypeName.toLowerCase().includes(keyword) ||
					app.status.toLowerCase().includes(keyword)
				);
			});
		}
		totalRecords = leaveApplications.length;
		offset = 0;
	}

	function prevPage() {
		if (offset - limit >= 0) {
			offset -= limit;
			loadApplications();
		}
	}

	function nextPage() {
		if (offset + limit < totalRecords) {
			offset += limit;
			loadApplications();
		}
	}

	// When a leave is applied, reload table
	function onLeaveApplied() {
		showApplyForm = false;
		loadApplications();
		showAlert('Leave application submitted successfully', 'success');
	}

	// Cancel leave
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

	onMount(() => {
		loadApplications();
	});
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
						<BreadcrumbLink href="/employee/leave/apply">Leave</BreadcrumbLink>
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

		<!-- Search + Apply Button Combined -->
		<div class="flex justify-between items-end mb-4">
			<!-- Left: Search Controls -->
			<div class="flex gap-4 items-end">
				<div class="flex flex-col text-sm font-medium">
					<label for="search" class="text-gray-700 dark:text-gray-300">Search Leave</label>
					<Input
						id="search"
						placeholder="Search by status or type"
						bind:value={searchKeyword}
						class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
					/>
				</div>

				<Button on:click={handleSearch} title="Search">
					<Search class="w-4 h-4" />
				</Button>

				<Button on:click={handleRefresh} title="Refresh">
					<RefreshCcw class="w-4 h-4" />
				</Button>
			</div>

			<!-- Right: Apply Leave Button -->
			<Button on:click={() => (showApplyForm = true)} class="px-4">+ Apply Leave</Button>
		</div>

		<!-- Leave Applications Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Leave Type</Table.Head>
						<Table.Head class="text-center">Start Date</Table.Head>
						<Table.Head class="text-center">End Date</Table.Head>
						<Table.Head class="text-center">Half Day</Table.Head>
						<Table.Head class="text-center">Session</Table.Head>
						<Table.Head class="text-center">Duration</Table.Head>
						<Table.Head class="text-center">Reason</Table.Head>
						<Table.Head class="text-center">Document</Table.Head>
						<Table.Head class="text-center">Status</Table.Head>
						<Table.Head class="text-center">Applied On</Table.Head>
						<Table.Head class="text-center">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if leaveApplications.length}
						{#each leaveApplications as app, i}
							<Table.Row>
								<Table.Cell>{i + 1}</Table.Cell>
								<Table.Cell>{app.leaveTypeName}</Table.Cell>
								<Table.Cell class="text-center">{new Date(app.startDate).toISOString().split('T')[0]}</Table.Cell>
								<Table.Cell class="text-center">{new Date(app.endDate).toISOString().split('T')[0]}</Table.Cell>
								<Table.Cell class="text-center">{app.halfDay ? 'Yes' : 'No'}</Table.Cell>
								<Table.Cell class="text-center">
									{#if app.halfDay}
										{app.halfDaySession ?? '-'}
									{:else}
										-
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">{app.duration} day{app.duration > 1 ? 's' : ''}</Table.Cell>
								<Table.Cell class="text-center">
									{#if app.leaveTypeName === 'Emergency Leave'}
										{app.reason || '-'}
									{:else}
										-
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center">
									{#if app.leaveTypeName === 'Medical Leave' || app.leaveTypeName === 'Hospitalization Leave'}
										{#if app.docImg}
											<a
												href={app.docImg}
												target="_blank"
												class="text-blue-600 dark:text-blue-400 underline">View</a
											>
										{:else}
											-
										{/if}
									{:else}
										-
									{/if}
								</Table.Cell>
								<Table.Cell class="text-center"><LeaveStatusBadge status={app.status} /></Table.Cell>
								<Table.Cell class="text-center">{format.timestamp(app.applicationDate)}</Table.Cell>
								<Table.Cell>
									{#if (app.status === 'Pending' || app.status === 'Approved') && new Date(app.startDate) > new Date()}
										<div class="flex justify-center">
											<button
												on:click={() => confirmCancelLeave(app.id)}
												class="inline-flex items-center justify-center p-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700 transition-colors duration-150 cursor-pointer"
												title="Cancel leave"
												aria-label="Cancel leave"
											>
												<CircleX size={18} />
											</button>
										</div>
									{:else}
										<span class="text-gray-400 dark:text-gray-500">-</span>
									{/if}
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan="12" class="text-center text-muted-foreground h-16">
								No leave applications found.
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

<!-- Apply Leave Modal -->
{#if showApplyForm}
	<LeaveApplicationForm on:close={() => (showApplyForm = false)} on:submitted={onLeaveApplied} />
{/if}

<!-- Cancel Leave Confirm -->
{#if showCancelConfirm}
	<ConfirmDialog
		title="Confirm Cancel Leave"
		message="Are you sure you want to cancel this leave request?"
		on:confirm={executeCancelLeave}
		on:cancel={() => (showCancelConfirm = false)}
	/>
{/if}
