<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { CalendarDays, CalendarCheck, UserCheck, UserX, Clock } from 'lucide-svelte';
	export let data;

	// Expected data: { summary: {...}, records: [...] }
</script>

<div class="space-y-6">
	<!-- Attendance Summary -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title
				class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
			>
				<CalendarDays class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				Attendance Summary
			</Card.Title>
		</Card.Header>

		<Card.Content>
			<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<!-- Total Working Days -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900">
					<CalendarCheck class="w-6 h-6 text-blue-600 dark:text-blue-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Total Working Days</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{data.summary.totalDays ?? '—'}
						</p>
					</div>
				</div>

				<!-- Present -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900">
					<UserCheck class="w-6 h-6 text-green-600 dark:text-green-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Present</p>
						<p class="text-lg font-semibold text-green-700 dark:text-green-300">
							{data.summary.present ?? '—'}
						</p>
					</div>
				</div>

				<!-- Absent -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900">
					<UserX class="w-6 h-6 text-red-600 dark:text-red-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Absent</p>
						<p class="text-lg font-semibold text-red-700 dark:text-red-300">
							{data.summary.absent ?? '—'}
						</p>
					</div>
				</div>

				<!-- Avg Hours -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900">
					<Clock class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Average Hours / Day</p>
						<p class="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
							{data.summary.avgHours ?? '—'}
						</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Detailed Records -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title
				class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2"
			>
				<Clock class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				Detailed Attendance Records
			</Card.Title>
		</Card.Header>

		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Date</Table.Head>
							<Table.Head>Check In</Table.Head>
							<Table.Head>Check Out</Table.Head>
							<Table.Head>Worked Hours</Table.Head>
							<Table.Head>Remarks</Table.Head>
						</Table.Row>
					</Table.Header>

					<Table.Body>
						{#if data.records?.length}
							{#each data.records as r}
								<Table.Row>
									<Table.Cell>{r.summaryDate}</Table.Cell>
									<Table.Cell>
										{r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString() : '—'}
									</Table.Cell>
									<Table.Cell>
										{r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString() : '—'}
									</Table.Cell>
									<Table.Cell>{r.workedHours ?? '—'}</Table.Cell>
									<Table.Cell class="text-sm text-gray-600 dark:text-gray-400">
										{r.isModified ? 'Adjusted' : '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan="5" class="text-center text-muted-foreground h-16">
									No attendance records available for this employee.
								</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>
