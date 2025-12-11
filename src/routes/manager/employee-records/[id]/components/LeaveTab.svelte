<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Calendar, ClipboardList, BarChart3 } from 'lucide-svelte';

	export let data;
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
						{#if data.records?.length}
							{#each data.records as l}
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
			</div>
		</Card.Content>
	</Card.Root>
</div>
