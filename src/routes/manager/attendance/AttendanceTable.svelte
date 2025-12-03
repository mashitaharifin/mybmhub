<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import LocationDisplay from './LocationDisplay.svelte';
	import InlineEditRow from './InlineEditRow.svelte';
	import { onMount, createEventDispatcher } from 'svelte';
	import { format } from 'date-fns';
	import { Pencil, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	const dispatch = createEventDispatcher();

	type AttendanceRecord = {
		id: number;
		userId: number;
		employeeName: string;
		summaryDate: string;
		checkInTime: string | null;
		checkOutTime: string | null;
		workedHours: number | null;
		status: string;
		locationIn: any;
		locationOut: any;
		isModified: number;
		checkInLat: number | null;
		checkInLng: number | null;
		checkOutLat: number | null;
		checkOutLng: number | null;
		checkInLocation: { lat: number; lng: number; locationName: string | null } | null;
		checkOutLocation: { lat: number; lng: number; locationName: string | null } | null;
		durationStatus?: string;
		reason?: string;
		remarks?: string;
	};

	type WorkingHours = {
		title: string;
		start: string; // "HH:mm"
		end: string; // "HH:mm"
		graceMinutes: number;
	};

	type FilterParams = {
		month?: number;
		year?: number;
		employeeQuery?: string;
	};

	let records: AttendanceRecord[] = [];
	let workingHours: WorkingHours | null = null;
	let workingStart: Date | null = null;
	let workingEnd: Date | null = null;

	let page = 1;
	let pageSize = 20;
	let total = 0;
	let sortBy = { field: 'summaryDate', dir: 'desc' };
	let expandedRowId: number | null = null;

	// Fetch working hours from backend
	async function fetchWorkingHours() {
		const res = await fetch('/api/system-settings/working-hours');
		if (res.ok) {
			workingHours = await res.json();
			if (workingHours) {
				// Create working start and end times for comparison
				workingStart = new Date(`1970-01-01T${workingHours.start}:00`);
				workingEnd = new Date(`1970-01-01T${workingHours.end}:00`);
			}
		} else {
			dispatch('alert', { message: 'Failed to load working hours', variant: 'error' });
		}
	}

	// Calculate worked hours in hours with 2 decimal places
	function calculateWorkedHours(
		checkInTime: string | null,
		checkOutTime: string | null
	): number | null {
		if (!checkInTime || !checkOutTime) return null;

		const checkIn = new Date(checkInTime);
		const checkOut = new Date(checkOutTime);
		const diffMs = checkOut.getTime() - checkIn.getTime();
		const hours = diffMs / (1000 * 60 * 60); // Convert milliseconds to hours

		return Math.round(hours * 100) / 100; // Round to 2 decimal places
	}

	// Determine if the record is complete (has both check-in and check-out)
	function getStatus(record: AttendanceRecord): string {
		return record.checkInTime && record.checkOutTime ? 'Complete' : 'Incomplete';
	}

	function getDurationType(record: AttendanceRecord) {
		// If missing either punch, return "Missing Punch"
		if (!record.checkInTime || !record.checkOutTime) {
			return 'Missing Punch';
		}

		if (!workingStart || !workingEnd) return '—';

		const checkIn = new Date(record.checkInTime);
		const checkOut = new Date(record.checkOutTime);

		// Create shift timing for the record date
		const recordDate = new Date(record.summaryDate);
		const shiftStart = new Date(recordDate);
		const shiftEnd = new Date(recordDate);
		shiftStart.setHours(workingStart.getHours(), workingStart.getMinutes(), 0, 0);
		shiftEnd.setHours(workingEnd.getHours(), workingEnd.getMinutes(), 0, 0);

		// Calculate hours
		const totalShiftHours = (shiftEnd.getTime() - shiftStart.getTime()) / (1000 * 60 * 60); // 8 hours
		const actualWorkedHours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
		const percentageWorked = actualWorkedHours / totalShiftHours;

		// Check if late
		const minutesLate =
			checkIn > shiftStart ? (checkIn.getTime() - shiftStart.getTime()) / (1000 * 60) : 0;
		const isLate = minutesLate > (workingHours?.graceMinutes || 10);

		if (percentageWorked >= 0.9) {
			// ≥ 90% (≥ 7.2 hours)
			return isLate ? 'Late (Full Day)' : 'Full Day';
		} else if (percentageWorked >= 0.5) {
			// 50-89% (4-7.19 hours)
			return 'Half Day';
		} else if (percentageWorked > 0) {
			// 1-49% (0.1-3.9 hours)
			return 'Short Day';
		} else {
			return '—';
		}
	}

	let currentFilters: FilterParams = {};

	onMount(() => {
		const handleFilterEvent = (event: Event) => {
			const customEvent = event as CustomEvent<FilterParams>;
			currentFilters = customEvent.detail;
			// Reset to first page when filters change
			page = 1;
			fetchRecords(currentFilters);
		};

		// Type assertion for custom event
		document.addEventListener('applyFilters', handleFilterEvent as EventListener);

		return () => {
			document.removeEventListener('applyFilters', handleFilterEvent as EventListener);
		};
	});

	async function fetchRecords(filters: FilterParams = {}) {
		const payload = { page, pageSize, sortBy, ...filters };
		const res = await fetch('./attendance/list', {
			method: 'POST',
			body: JSON.stringify(payload),
			headers: { 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			const json = await res.json();
			records = json.records.map((r: AttendanceRecord) => {
				r.workedHours = calculateWorkedHours(r.checkInTime, r.checkOutTime);
				r.status = getStatus(r);
				r.durationStatus = getDurationType(r);
				return r;
			});
			total = json.total;
		} else {
			dispatch('alert', { message: 'Failed to load records', variant: 'error' });
		}
	}

	function previousPage() {
		if (page > 1) {
			page--;
			fetchRecords(currentFilters);
		}
	}

	function nextPage() {
		if (page * pageSize < total) {
			page++;
			fetchRecords(currentFilters);
		}
	}

	$: startIndex = (page - 1) * pageSize + 1;
	$: endIndex = Math.min(page * pageSize, total);
	$: totalPages = Math.ceil(total / pageSize);

	onMount(async () => {
		await fetchWorkingHours();
		await fetchRecords();
	});

	function toggleExpand(id: number) {
		expandedRowId = expandedRowId === id ? null : id;
	}

	function statusClass(status: string) {
		switch (status) {
			case 'Complete':
				return 'bg-green-100 text-green-800';
			case 'Incomplete':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}
</script>

<div class="overflow-x-auto">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>#</Table.Head>
				<Table.Head>Employee</Table.Head>
				<Table.Head>Date</Table.Head>
				<Table.Head>In</Table.Head>
				<Table.Head>Out</Table.Head>
				<Table.Head>Hours</Table.Head>
				<Table.Head>Status</Table.Head>
				<Table.Head>Duration</Table.Head>
				<Table.Head>Location In</Table.Head>
				<Table.Head>Location Out</Table.Head>
				<Table.Head>Remarks</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if records.length}
				{#each records as r, i}
					<Table.Row>
						<Table.Cell>{startIndex + i}</Table.Cell>
						<Table.Cell>{r.employeeName}</Table.Cell>
						<Table.Cell>{format(new Date(r.summaryDate), 'yyyy-MM-dd')}</Table.Cell>
						<Table.Cell>{r.checkInTime ? format(new Date(r.checkInTime), 'HH:mm') : '—'}</Table.Cell
						>
						<Table.Cell
							>{r.checkOutTime ? format(new Date(r.checkOutTime), 'HH:mm') : '—'}</Table.Cell
						>
						<Table.Cell>{r.workedHours?.toFixed(2) ?? '—'}</Table.Cell>
						<Table.Cell
							><span class={`px-2 py-0.5 rounded-xl text-xs ${statusClass(r.status)}`}
								>{r.status}</span
							></Table.Cell
						>
						<Table.Cell>{r.durationStatus || '—'}</Table.Cell>
						<Table.Cell><LocationDisplay record={r} type="in" /></Table.Cell>
						<Table.Cell><LocationDisplay record={r} type="out" /></Table.Cell>
						<Table.Cell>{r.reason ?? '—'}</Table.Cell>

						<Table.Cell class="text-right">
							<button
								class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								on:click={() => toggleExpand(r.id)}
								title="Edit"
							>
								<Pencil class="w-4 h-4" />
							</button>
						</Table.Cell>
					</Table.Row>

					{#if expandedRowId === r.id}
						<Table.Row>
							<Table.Cell colspan="13" class="p-4 bg-gray-50 dark:bg-gray-900">
								<InlineEditRow
									{r}
									on:updated={(e) => {
										const updatedData = e.detail;
										const rec = records.find((r) => r.id === updatedData.id);

										if (rec) {
											// Update all fields including frontend-only reason/remarks
											Object.assign(rec, updatedData);
										}

										// Refresh the data to ensure times and locations are updated
										fetchRecords(currentFilters);
										dispatch('alert', {
											message: 'Record updated successfully!',
											variant: 'success'
										});
									}}
									on:cancel={() => {
										expandedRowId = null;
									}}
								/>
							</Table.Cell>
						</Table.Row>
					{/if}
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan="13" class="text-center text-muted-foreground h-16"
						>No records found.</Table.Cell
					>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>

	<!-- Pagination -->
	<div class="flex justify-between mt-4 items-center">
		<div class="text-sm text-gray-600 dark:text-gray-100">
			Showing {startIndex}-{endIndex} of {total} records
		</div>
		<div class="flex gap-2">
			<Button on:click={previousPage} disabled={page === 1} title="Previous">
				<ChevronLeft class="w-4 h-4" />
			</Button>

			<Button on:click={nextPage} disabled={page >= totalPages} title="Next">
				<ChevronRight class="w-4 h-4" />
			</Button>
		</div>
	</div>
</div>
