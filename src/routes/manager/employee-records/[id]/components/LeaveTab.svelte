<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Calendar, ChevronLeft, ChevronRight } from 'lucide-svelte';

	export let data;

	// Pagination
	let offset = 0;
	let limit = 10;
	let totalRecords = data.records?.length ?? 0;

	// Sort latest leave first (by start date)
	$: sortedLeaves = [...(data.records ?? [])].sort(
		(a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
	);
</script>

<div class="space-y-6">
	<!-- Leave Records -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title
				class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
			>
				<Calendar class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				Leave Applications
			</Card.Title>
		</Card.Header>

		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Leave Type</Table.Head>
							<Table.Head>Start Date</Table.Head>
							<Table.Head>End Date</Table.Head>
							<Table.Head>Days</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Remarks</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if sortedLeaves.length}
							{#each sortedLeaves.slice(offset, offset + limit) as l}
								<Table.Row class="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
									<Table.Cell>{l.leaveType}</Table.Cell>
									<Table.Cell>
										{l.startDate ? new Date(l.startDate).toLocaleDateString() : '—'}
									</Table.Cell>
									<Table.Cell>
										{l.endDate ? new Date(l.endDate).toLocaleDateString() : '—'}
									</Table.Cell>
									<Table.Cell>{l.days ?? '—'}</Table.Cell>
									<Table.Cell>
										<span
											class={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
												l.status === 'Approved'
													? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
													: l.status === 'Pending'
														? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
														: l.status === 'Cancelled'
															? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
															: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
											}`}
										>
											{l.status}
										</span>
									</Table.Cell>
									<Table.Cell class="text-gray-600 dark:text-gray-400">
										{l.managerRemark || '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan="6" class="text-center text-gray-500 dark:text-gray-400 h-16">
									No leave records found for this employee.
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>

				<div class="flex justify-between mt-4 items-center">
					<div class="text-sm text-gray-600 dark:text-gray-100">
						Showing {offset + 1}-{Math.min(offset + limit, totalRecords)} of {totalRecords} records
					</div>

					<div class="flex gap-2">
						<button
							on:click={() => (offset = Math.max(0, offset - limit))}
							disabled={offset === 0}
							class="p-1 rounded disabled:opacity-40"
						>
							<ChevronLeft class="w-4 h-4" />
						</button>

						<button
							on:click={() => (offset = Math.min(totalRecords - limit, offset + limit))}
							disabled={offset + limit >= totalRecords}
							class="p-1 rounded disabled:opacity-40"
						>
							<ChevronRight class="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
