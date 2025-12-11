<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { CalendarDays, CalendarCheck, UserCheck, UserX, Clock, Printer, ChevronLeft, ChevronRight } from 'lucide-svelte';
	export let data;

	// Pagination
	let offset = 0;
	let limit = 20;
	let totalRecords = data.records?.length ?? 0;

	// Sort records latest first
	$: sortedRecords = [...(data.records ?? [])].sort((a, b) => new Date(b.summaryDate).getTime() - new Date(a.summaryDate).getTime());

	// Format time helper
	const formatTime = (iso: string | null) =>
		iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—';

	// Status badge helper
	const getStatusBadge = (status: string) => {
		const s = (status ?? '').toLowerCase();
		switch (s) {
			case 'present':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
			case 'late':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500 dark:text-yellow-100';
			case 'absent':
				return 'bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-100';
			default:
				return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
		}
	};
</script>

<div class="space-y-6">
	<!-- Attendance Summary Card (unchanged) -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
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
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">{data.summary.totalDays ?? '—'}</p>
					</div>
				</div>
				<!-- Present -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900">
					<UserCheck class="w-6 h-6 text-green-600 dark:text-green-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Present</p>
						<p class="text-lg font-semibold text-green-700 dark:text-green-300">{data.summary.present ?? '—'}</p>
					</div>
				</div>
				<!-- Absent -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900">
					<UserX class="w-6 h-6 text-red-600 dark:text-red-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Absent</p>
						<p class="text-lg font-semibold text-red-700 dark:text-red-300">{data.summary.absent ?? '—'}</p>
					</div>
				</div>
				<!-- Avg Hours -->
				<div class="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900">
					<Clock class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
					<div>
						<p class="text-sm text-gray-500 dark:text-white">Average Hours / Day</p>
						<p class="text-lg font-semibold text-indigo-700 dark:text-indigo-300">{data.summary.avgHours ?? '—'}</p>
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Detailed Records Card with pagination and export -->
	<Card.Root class="p-2 rounded-3xl border-gray-200 dark:border-gray-700 shadow">
		<Card.Header>
			<Card.Title class="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
				<Clock class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				Detailed Attendance Records
			</Card.Title>
		</Card.Header>

		<Card.Content>
			<div class="overflow-x-auto">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>#</Table.Head>
							<Table.Head>Date</Table.Head>
							<Table.Head>Check In</Table.Head>
							<Table.Head>Check-in Location</Table.Head>
							<Table.Head>Check Out</Table.Head>
							<Table.Head>Check-out Location</Table.Head>
							<Table.Head>Worked Hours</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head>Notes</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if sortedRecords.length === 0}
							<Table.Row>
								<Table.Cell colspan="9" class="text-center text-muted-foreground h-16">
									No attendance records available.
								</Table.Cell>
							</Table.Row>
						{:else}
							{#each sortedRecords.slice(offset, offset + limit) as r, i}
								<Table.Row>
									<Table.Cell>{offset + i + 1}</Table.Cell>
									<Table.Cell>{new Date(r.summaryDate).toLocaleDateString()}</Table.Cell>
									<Table.Cell>{formatTime(r.checkInTime)}</Table.Cell>
									<Table.Cell>{r.checkInLocation?.locationName ?? '—'}</Table.Cell>
									<Table.Cell>{formatTime(r.checkOutTime)}</Table.Cell>
									<Table.Cell>{r.checkOutLocation?.locationName ?? '—'}</Table.Cell>
									<Table.Cell>{r.workedHours ?? '—'}</Table.Cell>
									<Table.Cell>
										<span class={`px-2 py-1 rounded-xl text-xs ${getStatusBadge(r.status)}`}>
											{r.status ?? '—'}
										</span>
									</Table.Cell>
									<Table.Cell class="text-sm text-gray-600 dark:text-gray-400">
										{r.remarks ?? '—'}
									</Table.Cell>
								</Table.Row>
							{/each}
						{/if}
					</Table.Body>
				</Table.Root>

				<!-- Pagination & Export -->
				<div class="flex justify-between mt-4 items-center">
					<div class="text-sm text-gray-600 dark:text-gray-100">
						Showing {offset + 1}-{Math.min(offset + limit, totalRecords)} of {totalRecords} records
					</div>
					<div class="flex gap-2">
						<button on:click={() => (offset = Math.max(0, offset - limit))} disabled={offset === 0}>
							<ChevronLeft class="w-4 h-4" />
						</button>
						<button
							on:click={() => (offset = Math.min(totalRecords - limit, offset + limit))}
							disabled={offset + limit >= totalRecords}
						>
							<ChevronRight class="w-4 h-4" />
						</button>
						<!-- 
						<button on:click={() => exportElementToPDF(sortedRecords, 'Attendance.pdf', 'Attendance Records')}>
							<Printer class="w-4 h-4" />
						</button>
						-->
					</div>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>
