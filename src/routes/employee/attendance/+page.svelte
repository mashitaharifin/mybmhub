<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Button from '$lib/components/ui/button.svelte';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import * as Alert from '$lib/components/ui/alert';
	import { Printer, RefreshCcw, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { exportToPDF } from '$lib/utils/exportHelpers';

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	// --- Quick attendance / punch state (reuses /api/dashboard/empQuickAttendance) ---
	let quick: any = {
		summaryDate: null,
		checkInTime: null,
		checkOutTime: null,
		workedHours: null,
		status: 'ABSENT',
		withinGeofence: null
	};
	let formattedTime = '';
	let timer: ReturnType<typeof setInterval> | null = null;

	// --- Filters & pagination ---
	let monthFilter: string = ''; // yyyy-MM
	let limit = 20;
	let offset = 0;
	let totalRecords = 0;
	let loading = false;

	// --- Attendance history data ---
	let records: any[] = [];

	// --- Today's punches (from punch table) and geofence details ---
	let todayPunches: any[] = []; // each: { id, eventType, eventTime, locationLat, locationLng, notes }
	let activeGeofence: {
		id?: number;
		name?: string;
		latitude?: number;
		longitude?: number;
		radiusMeters?: number;
	} | null = null;

	// --- Summary stats for the selected month ---
	let totalLateDays = 0;
	let totalAbsentDays = 0;
	let avgHoursPerDay = 0;
	let totalHoursWorked = 0;

	// --- System shift/settings for validation (fetched) ---
	let attendanceSettings: any = {
		shiftStart: '09:00', // fallback
		shiftEnd: '18:00',
		requiredHours: 8,
		graceMinutes: 10,
		lunchBreakMins: 60
	};

	// Helper: update realtime time display
	function updateClock() {
		const now = new Date();
		formattedTime = now.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	// --- Load quick (today) attendance status ---
	async function loadQuickAttendance() {
		try {
			const res = await fetch('/api/dashboard/empQuickAttendance');
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const data = await res.json();
			if (data?.success) {
				quick = data.data;
			} else {
				console.warn('empQuickAttendance returned no success', data);
			}
		} catch (err) {
			console.error('Failed to fetch quick attendance', err);
			showAlert('Failed to load today summary (quick attendance).', 'error');
		}
	}

	// --- Load attendance settings (shift / required hours) ---
	const loadAttendanceSettings = async () => {
		try {
			const res = await fetch('/api/system-settings/workinghour'); 
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const data = await res.json();
			attendanceSettings.set(data); 
		} catch (err) {
			console.error('Failed to fetch attendance settings', err);
		}
	};
	// --- Load active geofence from system settings (recommended endpoint) ---
	async function loadActiveGeofence() {
		try {
			const res = await fetch('/api/system-settings/active-geofence');
			if (!res.ok) {
				// If endpoint not present, return gracefully
				console.warn('active-geofence endpoint not available', res.status);
				return;
			}
			const data = await res.json();
			if (data?.success && data.data) {
				activeGeofence = data.data;
				// ensure numbers
				if (activeGeofence) {
					activeGeofence.latitude = Number(activeGeofence.latitude ?? 0);
					activeGeofence.longitude = Number(activeGeofence.longitude ?? 0);
					activeGeofence.radiusMeters = Number(activeGeofence.radiusMeters ?? 0);
				}
			}
		} catch (err) {
			console.warn('Failed to load active geofence', err);
		}
	}

	// --- Load today's punches from punch table (recommended endpoint) ---
	async function loadTodayPunches() {
		try {
			const date =
				quick.summaryDate && quick.summaryDate.split
					? quick.summaryDate.split('T')[0]
					: new Date().toISOString().split('T')[0];
			const res = await fetch(`/api/attendance/punches?date=${date}`);
			if (!res.ok) {
				console.warn('attendance/punches responded with', res.status);
				// fallback: keep empty todayPunches
				return;
			}
			const data = await res.json();
			if (data?.success && Array.isArray(data.data?.punches)) {
				todayPunches = data.data.punches.map((p: any) => ({
					...p,
					locationLat: p.locationLat != null ? Number(p.locationLat) : null,
					locationLng: p.locationLng != null ? Number(p.locationLng) : null,
					eventTime: p.eventTime
				}));
			}
		} catch (err) {
			console.warn('Failed to load today punches', err);
		}
	}

	// Haversine distance (meters)
	function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const toRad = (v: number) => (v * Math.PI) / 180;
		const R = 6371000;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	function punchWithinGeofence(punch: any) {
		if (!activeGeofence || !punch.locationLat || !punch.locationLng) return null;
		const dist = haversineDistance(
			Number(punch.locationLat),
			Number(punch.locationLng),
			Number(activeGeofence.latitude),
			Number(activeGeofence.longitude)
		);
		return { within: dist <= Number(activeGeofence.radiusMeters), distanceMeters: dist };
	}

	// --- Load attendance history for the month (monthFilter: yyyy-MM) ---
	async function loadAttendanceHistory() {
		loading = true;
		try {
			// Build params
			const params = new URLSearchParams({
				limit: String(limit),
				offset: String(offset)
			});
			if (monthFilter) params.append('month', monthFilter);

			const res = await fetch(`/api/attendance/history?${params.toString()}`);
			// Improved error reporting (why earlier vague error happened)
			if (!res.ok) {
				let bodyText = '';
				try {
					bodyText = await res.text();
				} catch {}
				const errMsg = `Attendance history fetch failed: status ${res.status} ${bodyText ? '- ' + bodyText : ''}`;
				console.error(errMsg);
				showAlert('Error fetching attendance history. Check console for details.', 'error');
				loading = false;
				return;
			}

			const data = await res.json();
			if (data?.success) {
				records = data.data.records ?? [];
				totalRecords = data.data.total ?? records.length;

				// compute summary stats
				calcSummary(records);
			} else {
				console.error('Attendance history responded with success=false', data);
				showAlert(data?.error || 'Failed to fetch attendance history', 'error');
			}
		} catch (err) {
			console.error('Unexpected error loading attendance history', err);
			showAlert('Failed to fetch attendance history (network or server error).', 'error');
		} finally {
			loading = false;
		}
	}

	function calcSummary(rows: any[]) {
		totalLateDays = 0;
		totalAbsentDays = 0;
		totalHoursWorked = 0;
		let presentDays = 0;
		for (const r of rows) {
			if (!r.checkInTime && !r.checkOutTime) {
				totalAbsentDays++;
				continue;
			}
			if (r.workedHours != null) totalHoursWorked += Number(r.workedHours);
			if (r.checkInTime) {
				const checkIn = new Date(r.checkInTime);
				const [sh, sm] = String(attendanceSettings.shiftStart || '09:00')
					.split(':')
					.map(Number);
				const shiftStart = new Date(checkIn);
				shiftStart.setHours(sh, sm + (attendanceSettings.graceMinutes ?? 0), 0, 0);
				if (checkIn.getTime() > shiftStart.getTime()) totalLateDays++;
			}
			if (r.checkInTime || r.checkOutTime) presentDays++;
		}
		avgHoursPerDay = presentDays ? +(totalHoursWorked / presentDays).toFixed(2) : 0;
		totalHoursWorked = +totalHoursWorked.toFixed(2);
	}

	// --- Pagination controls ---
	function prevPage() {
		if (offset - limit >= 0) {
			offset -= limit;
			loadAttendanceHistory();
		}
	}
	function nextPage() {
		if (offset + limit < totalRecords) {
			offset += limit;
			loadAttendanceHistory();
		}
	}

	// --- Export (PDF only) ---
	async function handleExportPDF() {
		try {
			const filterText = `My Attendance${monthFilter ? ' - ' + monthFilter : ''}`;
			let company = {};
			try {
				const r = await fetch('/api/system-settings/company-profile');
				const d = await r.json();
				if (d?.success) company = d.company ?? {};
			} catch (e) {}
			await exportToPDF(records, `${filterText}.pdf`, filterText, company);
		} catch (err) {
			console.error('Export PDF failed', err);
			showAlert('Failed to export PDF', 'error');
		}
	}

	// --- Punch handler: reuse dashboard POST API ---
	let punchProcessing = false;
	async function handlePunch(actionType: 'IN' | 'OUT') {
		if (punchProcessing) return;
		if (!navigator.geolocation) {
			showAlert('Geolocation not supported in this browser', 'error');
			return;
		}
		punchProcessing = true;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const { latitude, longitude, accuracy } = pos.coords;
					const res = await fetch('/api/dashboard/empQuickAttendance', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ actionType, latitude, longitude, accuracyMeters: accuracy })
					});
					const data = await res.json();
					if (data?.success) {
						showAlert(data.message || 'Punch successful', 'success');
						await loadQuickAttendance();
						await loadAttendanceHistory();
						// refresh punches & geofence
						await loadActiveGeofence();
						await loadTodayPunches();
					} else {
						showAlert(data?.error || 'Punch failed', 'error');
					}
				} catch (err) {
					console.error('Punch error', err);
					showAlert('Failed to punch. Try again.', 'error');
				} finally {
					punchProcessing = false;
				}
			},
			(err) => {
				console.warn('Geolocation error', err);
				showAlert('Failed to retrieve location. Allow location to punch.', 'error');
				punchProcessing = false;
			}
		);
	}

	// --- Derived helpers for display & validation ---
	function formatTime(iso: string | null) {
		if (!iso) return '-';
		try {
			return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
		} catch {
			return iso;
		}
	}

	function getStatusBadge(status: string) {
		if (!status) return 'bg-gray-400 text-white';
		const s = status.toLowerCase();
		if (s === 'present' || s === 'in' || s === 'out') return 'bg-green-500 text-white';
		if (s === 'late') return 'bg-yellow-400 text-black';
		if (s === 'absent') return 'bg-red-500 text-white';
		return 'bg-gray-400 text-white';
	}

	// Show punch button only when needed (hybrid: only if not completed/out)
	function shouldShowPunchButton() {
		const st = (quick?.status ?? '').toUpperCase();
		return st === 'ABSENT' || st === 'NONE' || st === 'IN';
	}

	function punchButtonType() {
		const st = (quick?.status ?? '').toUpperCase();
		if (st === 'IN') return 'OUT';
		return 'IN';
	}

	onMount(async () => {
		updateClock();
		timer = setInterval(updateClock, 1000);

		// default month to current month (yyyy-MM)
		const now = new Date();
		monthFilter = `${now.getFullYear().toString().padStart(4, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;

		await loadAttendanceSettings();
		await loadQuickAttendance();
		await loadActiveGeofence();
		await loadTodayPunches();
		await loadAttendanceHistory();
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
		if (t) clearTimeout(t);
	});
</script>

<svelte:head>
	<title>My Attendance – MyBM Hub</title>
	<meta
		name="description"
		content="Record and view your daily attendance, worked hours, and performance summary."
	/>
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
						<BreadcrumbPage>Attendance</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<br />
			<div>
				<Card.Title>My Attendance</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Record and view your daily attendance, worked hours, and performance summary.
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

		<!-- Top: Daily Status wrapped in a card (improved UI) -->
		<Card.Root class="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
			<Card.Header>
				<div class="flex justify-between items-start">
					<div>
						<Card.Title class="text-lg">Today</Card.Title>
						<Card.Description class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{new Date(quick.summaryDate ?? new Date()).toLocaleDateString()}
						</Card.Description>
					</div>

					<div class="text-sm text-gray-600 dark:text-gray-200">
						<div class="font-medium">{formattedTime}</div>
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
					<div class="space-y-2 flex-1">
						<div class="text-sm">
							<strong>Check In:</strong>
							{formatTime(quick.checkInTime)}
						</div>
						<div class="text-sm">
							<strong>Check Out:</strong>
							{formatTime(quick.checkOutTime)}
						</div>
						<div class="text-sm">
							<strong>Hours Worked:</strong>
							{quick.workedHours != null ? `${+quick.workedHours.toFixed(2)} h` : '-'}
						</div>
						<div class="text-sm">
							<strong>Geofence Summary:</strong>
							{#if activeGeofence}
								<div class="mt-2 space-y-1">
									{#each todayPunches as p}
										<div class="text-sm flex items-center gap-2">
											<div
												class="w-3 h-3 rounded-full"
												style="background-color: {punchWithinGeofence(p)?.within
													? '#10B981'
													: '#F59E0B'}"
											></div>
											<div class="font-semibold">{p.eventType}</div>
											<div class="text-xs text-gray-500">
												at {new Date(p.eventTime).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit'
												})}
											</div>
											{#each todayPunches as p}
												<div class="text-sm flex items-center gap-2">
													<div
														class="w-3 h-3 rounded-full"
														style="background-color: {punchWithinGeofence(p)?.within
															? '#10B981'
															: '#F59E0B'}"
													></div>
													<div class="font-semibold">{p.eventType}</div>
													<div class="text-xs text-gray-500">
														at {new Date(p.eventTime).toLocaleTimeString([], {
															hour: '2-digit',
															minute: '2-digit'
														})}
													</div>
													<div class="ml-2 text-xs">
														{#if punchWithinGeofence(p)}
															{punchWithinGeofence(p)?.within
																? 'Within geofence'
																: `Outside (${Math.round(punchWithinGeofence(p)?.distanceMeters ?? 0)} m)`}
														{:else}
															No location
														{/if}
													</div>
												</div>
											{/each}
										</div>
									{/each}
									{#if todayPunches.length === 0}
										<div class="text-sm text-gray-500">No punches recorded for today.</div>
									{/if}
									<div class="text-xs text-gray-400 mt-1">
										Geofence: {activeGeofence.name ?? '—'} ({activeGeofence.latitude ?? '-'}, {activeGeofence.longitude ??
											'-'}, r={activeGeofence.radiusMeters ?? '-'} m)
									</div>
								</div>
							{:else}
								<div class="ml-2 text-sm text-gray-500">
									Geofence not configured (system setting).
								</div>
							{/if}
						</div>
					</div>

					<!-- Punch button (Hybrid: only when needed) -->
					<div class="min-w-[160px]">
						{#if shouldShowPunchButton()}
							<Button
								on:click={() => handlePunch(punchButtonType() as 'IN' | 'OUT')}
								disabled={punchProcessing}
								class="w-full"
							>
								{punchProcessing
									? 'Processing...'
									: punchButtonType() === 'IN'
										? 'Punch In'
										: 'Punch Out'}
							</Button>
						{:else}
							<div class="text-sm text-gray-500">
								No punch actions here. Use Quick Punch on the Dashboard for quick access.
							</div>
						{/if}
					</div>
				</div>

				<hr class="my-4" />

				<!-- Validation summary (full validation) -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="p-3 rounded-lg border bg-gray-50 dark:bg-gray-700">
						<div class="text-xs text-gray-500">Required Hours</div>
						<div class="text-lg font-semibold">{attendanceSettings.requiredHours} h</div>
					</div>
					<div class="p-3 rounded-lg border bg-gray-50 dark:bg-gray-700">
						<div class="text-xs text-gray-500">Late Today</div>
						{#if quick.checkInTime}
							{#if new Date(quick.checkInTime) > (() => {
									const d = new Date(quick.checkInTime);
									const [h, m] = String(attendanceSettings.shiftStart || '09:00')
										.split(':')
										.map(Number);
									const grace = Number(attendanceSettings.graceMinutes || 0);
									const shift = new Date(d);
									shift.setHours(h, m + grace, 0, 0);
									return shift;
								})()}
								<div class="text-lg font-semibold text-yellow-600">Yes</div>
							{:else}
								<div class="text-lg font-semibold text-green-600">No</div>
							{/if}
						{:else}
							<div class="text-lg font-semibold text-gray-500">-</div>
						{/if}
					</div>
					<div class="p-3 rounded-lg border bg-gray-50 dark:bg-gray-700">
						<div class="text-xs text-gray-500">Over / Under Time</div>
						{#if quick.workedHours != null}
							{#if quick.workedHours >= attendanceSettings.requiredHours}
								<div class="text-lg font-semibold text-green-600">
									Overtime {+(quick.workedHours - attendanceSettings.requiredHours).toFixed(2)} h
								</div>
							{:else}
								<div class="text-lg font-semibold text-red-600">
									Under {+(attendanceSettings.requiredHours - quick.workedHours).toFixed(2)} h
								</div>
							{/if}
						{:else}
							<div class="text-lg font-semibold text-gray-500">-</div>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Monthly summary & controls -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 mb-4">
			<div class="col-span-2">
				<Card.Root class="p-4">
					<Card.Header>
						<Card.Title class="text-sm">Attendance Records</Card.Title>
					</Card.Header>
					<Card.Content>
						<!-- Filters -->
						<div class="flex flex-wrap gap-4 mb-4 items-end">
							<div class="flex flex-col text-sm font-medium">
								<label for="month" class="text-gray-700 dark:text-gray-300">Month</label>
								<input
									id="month"
									type="month"
									bind:value={monthFilter}
									on:change={() => {
										offset = 0;
										loadAttendanceHistory();
									}}
									class="text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100"
								/>
							</div>

							<div class="flex gap-2 ml-auto items-center">
								<button
									title="Refresh"
									on:click={() => {
										offset = 0;
										loadAttendanceHistory();
									}}
									class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
									aria-label="Refresh"
								>
									<RefreshCcw class="w-5 h-5" />
								</button>

								<button
									title="Export PDF"
									on:click={handleExportPDF}
									class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
									aria-label="Export PDF"
								>
									<Printer class="w-5 h-5" />
								</button>
							</div>
						</div>

						<!-- Attendance Table -->
						<div class="overflow-x-auto">
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head class="w-[50px]">#</Table.Head>
										<Table.Head>Date</Table.Head>
										<Table.Head>Day</Table.Head>
										<Table.Head>Check In</Table.Head>
										<Table.Head>Check Out</Table.Head>
										<Table.Head>Hours</Table.Head>
										<Table.Head>Status</Table.Head>
										<Table.Head>Remarks</Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#if records.length}
										{#each records as r, i}
											<Table.Row>
												<Table.Cell>{offset + i + 1}</Table.Cell>
												<Table.Cell>{r.summaryDate ?? '-'}</Table.Cell>
												<Table.Cell
													>{r.summaryDate
														? new Date(r.summaryDate).toLocaleDateString([], { weekday: 'short' })
														: '-'}</Table.Cell
												>
												<Table.Cell>{formatTime(r.checkInTime)}</Table.Cell>
												<Table.Cell>{formatTime(r.checkOutTime)}</Table.Cell>
												<Table.Cell
													>{r.workedHours != null
														? `${+r.workedHours.toFixed(2)} h`
														: '-'}</Table.Cell
												>
												<Table.Cell>
													<span
														class={`px-2 py-1 rounded-xl text-xs ${getStatusBadge(r.status ?? (r.checkInTime ? 'Present' : 'Absent'))}`}
														>{r.status ?? (r.checkInTime ? 'Present' : 'Absent')}</span
													>
												</Table.Cell>
												<Table.Cell class="whitespace-pre-wrap break-words max-w-xs"
													>{r.remarks ?? '-'}</Table.Cell
												>
											</Table.Row>
										{/each}
									{:else}
										<Table.Row>
											<Table.Cell colspan="8" class="text-center text-muted-foreground h-16"
												>No attendance records found.</Table.Cell
											>
										</Table.Row>
									{/if}
								</Table.Body>
							</Table.Root>
						</div>

						<!-- Pagination Icons only -->
						<div class="flex justify-between mt-4 items-center">
							<div class="text-sm text-gray-600 dark:text-gray-100">
								Showing {offset + 1}-{Math.min(offset + limit, totalRecords)} of {totalRecords} records
							</div>
							<div class="flex space-x-2 items-center">
								<button
									title="Previous page"
									on:click={prevPage}
									disabled={offset === 0}
									class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
									aria-label="Previous page"
								>
									<ChevronLeft class="w-5 h-5" />
								</button>
								<button
									title="Next page"
									on:click={nextPage}
									disabled={offset + limit >= totalRecords}
									class="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
									aria-label="Next page"
								>
									<ChevronRight class="w-5 h-5" />
								</button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Monthly summary tiles -->
			<div class="col-span-1">
				<Card.Root class="p-4 space-y-3">
					<Card.Header>
						<Card.Title class="text-sm">Monthly Summary</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="grid grid-cols-1 gap-2">
							<div class="flex justify-between text-sm">
								<span>Total Late Days</span>
								<span class="font-medium">{totalLateDays}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span>Total Absent Days</span>
								<span class="font-medium">{totalAbsentDays}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span>Total Hours Worked</span>
								<span class="font-medium">{totalHoursWorked} h</span>
							</div>
							<div class="flex justify-between text-sm">
								<span>Average Hours/Day</span>
								<span class="font-medium">{avgHoursPerDay} h</span>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</Card.Content>
</Card.Root>
