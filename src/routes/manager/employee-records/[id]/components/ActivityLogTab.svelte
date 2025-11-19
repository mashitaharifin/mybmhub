<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { History } from 'lucide-svelte';

	export let data;
</script>

<div class="space-y-6">
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow-sm">
		<Card.Header class="flex flex-row items-center justify-between">
			<div class="flex items-center gap-2">
				<History class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				<Card.Title class="text-lg font-semibold text-gray-900 dark:text-gray-100">
					Activity Log
				</Card.Title>
			</div>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{data.records?.length ?? 0} entries
			</p>
		</Card.Header>

		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Timestamp</Table.Head>
							<Table.Head>Action</Table.Head>
							<Table.Head>Details</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if data.records?.length}
							{#each data.records as log}
								<Table.Row class="hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors">
									<Table.Cell>
										{log.createdAt
											? new Date(log.createdAt).toLocaleString()
											: '—'}
									</Table.Cell>
									<Table.Cell class="font-medium text-gray-800 dark:text-gray-200">
										{log.action}
									</Table.Cell>
									<Table.Cell class="text-gray-600 dark:text-gray-400">
										{log.details || '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell
									colspan="3"
									class="text-center text-gray-500 dark:text-gray-400 h-16"
								>
									No activity log entries available for this employee.
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
