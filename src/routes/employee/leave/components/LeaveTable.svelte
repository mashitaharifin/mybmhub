<script lang="ts">
	import { format } from '$lib/utils/formatHelpers';
	import LeaveStatusBadge from './LeaveStatusBadge.svelte';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button.svelte';
	import { ChevronLeft, ChevronRight, CircleX, Eye } from 'lucide-svelte';

	export let applications: any[] = [];
	export let loading = false;
	export let totalRecords = 0;
	export let limit = 10;
	export let offset = 0;

	// Events
	export let onPageChange: (offset: number) => void;
	export let onOpenDetails: (app: any) => void;
	export let onConfirmCancel: (id: number) => void;

	function prevPage() {
		if (offset - limit >= 0) {
			onPageChange(offset - limit);
		}
	}

	function nextPage() {
		if (offset + limit < totalRecords) {
			onPageChange(offset + limit);
		}
	}
</script>

{#if loading}
	<div class="text-center py-8 text-gray-500 dark:text-gray-400">
		Loading leave applications...
	</div>
{:else}
	<!-- Leave Applications Table -->
	<div class="overflow-x-auto">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>#</Table.Head>
					<Table.Head>Leave Type</Table.Head>
					<Table.Head class="text-center">Start Date</Table.Head>
					<Table.Head class="text-center">End Date</Table.Head>
					<Table.Head class="text-center">Duration</Table.Head>
					<Table.Head class="text-center">Status</Table.Head>
					<Table.Head class="text-center">Applied On</Table.Head>
					<Table.Head class="text-center">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if applications.length}
					{#each applications as app, i}
						<Table.Row>
							<Table.Cell>{i + 1}</Table.Cell>
							<Table.Cell>{app.leaveTypeName}</Table.Cell>
							<Table.Cell class="text-center">
								{new Date(app.startDate).toISOString().split('T')[0]}
							</Table.Cell>
							<Table.Cell class="text-center">
								{new Date(app.endDate).toISOString().split('T')[0]}
							</Table.Cell>
							<Table.Cell class="text-center">
								{app.duration} day{app.duration > 1 ? 's' : ''}
							</Table.Cell>
							<Table.Cell class="text-center">
								<LeaveStatusBadge status={app.status} />
							</Table.Cell>
							<Table.Cell class="text-center">
								{format.timestamp(app.applicationDate)}
							</Table.Cell>
							<Table.Cell>
								<div class="flex justify-center space-x-1">
									<!-- View Details Button -->
									<button
										on:click={() => onOpenDetails(app)}
										class="inline-flex items-center justify-center p-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-300 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 dark:hover:border-blue-700 transition-colors duration-150 cursor-pointer border border-transparent"
										title="View details"
										aria-label="View details"
									>
										<Eye size={18} />
									</button>

									{#if (app.status === 'Pending' || app.status === 'Approved') && new Date(app.startDate) > new Date()}
										<!-- Cancel Button -->
										<button
											on:click={() => onConfirmCancel(app.id)}
											class="inline-flex items-center justify-center p-1.5 rounded-md text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 hover:border-red-300 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:hover:border-red-700 transition-colors duration-150 cursor-pointer"
											title="Cancel leave"
											aria-label="Cancel leave"
										>
											<CircleX size={18} />
										</button>
									{/if}
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan="8" class="text-center text-muted-foreground h-16">
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
			<Button variant="primary" on:click={prevPage} disabled={offset === 0}>
				<ChevronLeft class="w-4 h-4" />
			</Button>
			<Button variant="primary" on:click={nextPage} disabled={offset + limit >= totalRecords}>
				<ChevronRight class="w-4 h-4" />
			</Button>
		</div>
	</div>
{/if}