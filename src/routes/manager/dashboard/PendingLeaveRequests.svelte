<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getPendingLeaves } from './services/dashboardAPI';
	import type { LeaveRequest } from '$lib/types/dashboard';
	import { ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	let requests: LeaveRequest[] = [];
	let loading = true;
	let error: string | null = null;

	const viewAllRequests = () => {
		goto('/manager/leave/manage');
	};

	const statusColor = (status: string) => {
		switch (status) {
			case 'Pending':
				return 'bg-yellow-500 text-white dark:bg-yellow-800 dark:text-yellow-100 rounded-xl';
			case 'Approved':
				return 'bg-green-500 text-white dark:bg-green-800 dark:text-green-100 rounded-xl';
			case 'Rejected':
				return 'bg-red-500 text-white dark:bg-red-800 dark:text-red-100 rounded-xl';
			default:
				return 'bg-gray-400 text-white dark:bg-gray-700 dark:text-gray-100 rounded-xl';
		}
	};

	// Helper to calculate days between dates
	const calculateDays = (startDate: string, endDate: string): number => {
		const start = new Date(startDate);
		const end = new Date(endDate);
		const diffTime = Math.abs(end.getTime() - start.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
	};

	// Helper to format date for display
	const formatDisplayDate = (dateString: string): string => {
		return new Date(dateString).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric'
		});
	};

	// Helper to get display name
	const getDisplayName = (request: LeaveRequest): string => {
		return request.employeeName || request.employee || 'Unknown';
	};

	// Helper to get leave type
	const getLeaveType = (request: LeaveRequest): string => {
		return request.leaveType || request.type || 'Leave';
	};

	let interval: ReturnType<typeof setInterval>;

	async function fetchRequests() {
		loading = true;
		error = null;
		try {
			const data = await getPendingLeaves();
			requests = data.length ? data : [];
		} catch (err) {
			console.error('Failed to load leave requests:', err);
			error = 'Unable to fetch data';
			requests = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchRequests();
		interval = setInterval(fetchRequests, 10000);
	});

	onDestroy(() => clearInterval(interval));
</script>

<div
	class="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 transition-colors hover:bg-red-50 dark:hover:bg-red-800/20 h-full flex flex-col"
>
<div class="flex justify-between items-center mb-4">
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Leave Requests</h2>
	<div class="text-xs text-gray-500 dark:text-gray-400">
      {requests.length > 0 ? `${requests.length} showing` : 'No requests'}
    </div>
</div>
	

	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
	{:else if error}
		<div class="text-sm text-red-500">{error}</div>
	{:else if requests.length === 0}
		<div class="text-sm text-gray-500 dark:text-gray-400">No pending leave requests.</div>
	{:else}
		<ul class="space-y-2 max-h-72 overflow-y-auto">
			{#each requests as r}
				<li
					class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
				>
					<div>
						<div class="font-medium text-gray-800 dark:text-gray-200">{getDisplayName(r)}</div>
						<div class="text-xs text-gray-500 dark:text-gray-400">
							{getLeaveType(r)} – {calculateDays(r.startDate, r.endDate)} day(s) • {formatDisplayDate(
								r.startDate
							)}
						</div>
					</div>
					<div class={`text-xs font-semibold px-2 py-1 rounded ${statusColor(r.status)}`}>
						{r.status}
					</div>
				</li>
			{/each}
		</ul>
	{/if}

	<!-- View All Requests Link -->
	{#if !loading && requests.length > 10}
		<div class="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
			<button
				on:click={viewAllRequests}
				class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
			>
				View All Requests ({requests.length - 10} more)
				<ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
			</button>
		</div>
	{:else if !loading && requests.length > 0}
		<div class="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
			<button
				on:click={viewAllRequests}
				class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
			>
				View All Requests
				<ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
			</button>
		</div>
	{/if}
</div>
