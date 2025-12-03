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
	import {
		Printer,
		ChevronLeft,
		ChevronRight,
		UserX,
		UserCheck,
		Clock,
		CalendarDays,
		CalendarCheck
	} from 'lucide-svelte';
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

	// --- Quick attendance / today's summary ---
	let quick: any = {
		summaryDate: null,
		checkInTime: null,
		checkOutTime: null,
		workedHours: null,
		status: 'ABSENT',
		withinGeofence: null
	};
	let formattedTime = '';
	let runningHours = 0;
	let runningMinutes = 0;
	let timer: ReturnType<typeof setInterval> | null = null;

	// --- Last 30 days summary + detailed records ---
	let summaryData: any = {
		summary: { totalDays: 0, present: 0, absent: 0, avgHours: 0 },
		records: []
	};
	let loading = false;
	let offset = 0;
	let limit = 20;
	let totalRecords = 0;

	// --- Geofence and today's punches ---
	let todayPunches: any[] = [];
	let activeGeofence: any = null;

	// --- Attendance settings ---
	let attendanceSettings: any = {
		shiftStart: '09:00',
		shiftEnd: '18:00',
		requiredHours: 8,
		graceMinutes: 10,
		lunchBreakMins: 60
	};

	// --- Clock ---
	function updateClock() {
		const now = new Date();
		formattedTime = now.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});

		// Update running hours for today's attendance
		if (quick.checkInTime && !quick.checkOutTime) {
			const diffMs = new Date().getTime() - new Date(quick.checkInTime).getTime();
			runningHours = Math.floor(diffMs / (1000 * 60 * 60));
			runningMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		} else if (quick.workedHours != null) {
			runningHours = Math.floor(quick.workedHours);
			runningMinutes = Math.floor((quick.workedHours % 1) * 60);
		} else {
			runningHours = 0;
			runningMinutes = 0;
		}
	}

	// --- Load quick (today) attendance ---
	async function loadQuickAttendance() {
		try {
			const res = await fetch('/api/dashboard/empQuickAttendance');
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const data = await res.json();
			if (data?.success && data.data) {
				quick = { ...data.data, workedHours: Number(data.data.workedHours ?? 0) };
			}
		} catch (err) {
			console.error('Failed to load quick attendance', err);
			showAlert('Failed to load today summary.', 'error');
		}
	}

	// --- Load attendance settings ---
	async function loadAttendanceSettings() {
		try {
			const res = await fetch('/api/system-settings/workinghour');
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const data = await res.json();
			if (data?.success && data.data) attendanceSettings = data.data;
		} catch (err) {
			console.error('Failed to fetch attendance settings', err);
		}
	}

	// --- Load geofence ---
	async function loadActiveGeofence() {
		try {
			const res = await fetch('/api/system-settings/active-geofence');
			if (!res.ok) return;
			const data = await res.json();
			if (data?.success && data.data) activeGeofence = data.data;
		} catch {}
	}

	// --- Load today's punches ---
	async function loadTodayPunches() {
		try {
			const date = quick.summaryDate
				? quick.summaryDate.split('T')[0]
				: new Date().toISOString().split('T')[0];
			const res = await fetch(`/api/attendance/punches?date=${date}`);
			if (!res.ok) {
				todayPunches = [];
				return;
			}
			const data = await res.json();
			if (data?.success && Array.isArray(data.records)) todayPunches = data.records;
		} catch (err) {
			todayPunches = [];
		}
	}

	// --- Haversine distance ---
	function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
		const toRad = (v: number) => (v * Math.PI) / 180;
		const R = 6371000;
		const dLat = toRad(lat2 - lat1);
		const dLon = toRad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) ** 2 +
			Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
		return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	}

	function punchWithinGeofence(punch: any) {
		if (!activeGeofence || !punch.locationLat || !punch.locationLng) return null;
		const dist = haversineDistance(
			punch.locationLat,
			punch.locationLng,
			activeGeofence.latitude,
			activeGeofence.longitude
		);
		return { within: dist <= activeGeofence.radiusMeters, distanceMeters: dist };
	}

	// --- Load last 30 days summary ---
	async function loadAttendanceSummary() {
		loading = true;
		try {
			const res = await fetch('/api/attendance/summary');
			if (!res.ok) throw new Error(`Status ${res.status}`);
			const data = await res.json();
			if (data?.success && data.records) {
				summaryData = data;
				totalRecords = summaryData.records.length;
			}
		} catch (err) {
			console.error('Failed to load attendance summary', err);
			showAlert('Failed to load attendance summary.', 'error');
		} finally {
			loading = false;
		}
	}

	$: sortedRecords = [...summaryData.records].sort(
		(a, b) => new Date(b.summaryDate).getTime() - new Date(a.summaryDate).getTime()
	);

	// --- Punch handler ---
	let punchProcessing = false;
	async function handlePunch(actionType: 'IN' | 'OUT') {
		if (punchProcessing) return;
		if (!navigator.geolocation) {
			showAlert('Geolocation not supported', 'error');
			return;
		}
		punchProcessing = true;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				try {
					const res = await fetch('/api/dashboard/empQuickAttendance', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							actionType,
							latitude: pos.coords.latitude,
							longitude: pos.coords.longitude,
							accuracyMeters: pos.coords.accuracy
						})
					});
					const data = await res.json();
					if (data?.success) {
						showAlert(data.message || 'Punch successful', 'success');
						await loadQuickAttendance();
						await loadAttendanceSummary();
						await loadActiveGeofence();
						await loadTodayPunches();
					} else showAlert(data?.error || 'Punch failed', 'error');
				} catch (err) {
					showAlert('Failed to punch', 'error');
				} finally {
					punchProcessing = false;
				}
			},
			(err) => {
				showAlert('Failed to get location', 'error');
				punchProcessing = false;
			}
		);
	}

	function formatTime(iso: string | null) {
		if (!iso) return '-';
		return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	}

	function getStatusBadge(status: string) {
		const s = (status ?? '').toLowerCase();

		switch (s) {
			case 'present':
			case 'in':
			case 'out':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
			case 'late':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-500 dark:text-yellow-100';
			case 'absent':
				return 'bg-red-200 text-red-800 dark:bg-red-600 dark:text-red-100';
			default:
				return 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
		}
	}

	function punchButtonType() {
		// If no check-in time, show Punch In
		if (!quick.checkInTime) return 'IN';

		// If has check-in time but no check-out time, show Punch Out
		if (quick.checkInTime && !quick.checkOutTime) return 'OUT';

		// If both check-in and check-out exist, show Punch In (for next day)
		return 'IN';
	}

	let company: {
		logoPath?: string;
		name?: string;
		address?: string;
		country?: string;
		email?: string;
		phone?: string;
		regNo?: string;
	} = {};

	async function loadCompanyProfile() {
		try {
			const res = await fetch('/api/system-settings/company-profile');
			const data = await res.json();
			if (data.success) company = data.company;
		} catch (err) {
			console.error('Failed to fetch company info:', err);
		}
	}

	onMount(async () => {
		await loadQuickAttendance();
		updateClock();
		timer = setInterval(updateClock, 1000);
		await loadCompanyProfile(); // Cleaner call
		await loadAttendanceSettings();
		await loadQuickAttendance();
		await loadActiveGeofence();
		await loadTodayPunches();
		await loadAttendanceSummary();
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
		<Breadcrumb>
			<BreadcrumbList>
				<BreadcrumbItem
					><BreadcrumbLink href="/employee/dashboard">Dashboard</BreadcrumbLink></BreadcrumbItem
				>
				<BreadcrumbSeparator />
				<BreadcrumbItem><BreadcrumbPage>Attendance</BreadcrumbPage></BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
		<br />
		<Card.Title>My Attendance</Card.Title>
		<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
			Record and view your daily attendance, worked hours, and performance summary.
		</Card.Description>
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

		<!-- Today's Attendance Card -->
		<Card.Root class="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
			<Card.Header>
				<div class="flex justify-between items-start">
					<div>
						<Card.Title class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							Today's Attendance
						</Card.Title>
						<Card.Description class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{new Date(quick.summaryDate ?? new Date()).toLocaleDateString()}
						</Card.Description>
					</div>
					<div class="text-lg font-bold text-gray-600 dark:text-gray-200">
						{formattedTime}
					</div>
				</div>
			</Card.Header>

			<Card.Content>
				<div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
					<div class="space-y-2 flex-1">
						<div class="text-sm text-gray-800 dark:text-gray-200">
							<strong>Check In:</strong>
							{formatTime(quick.checkInTime)}
						</div>
						<div class="text-sm text-gray-800 dark:text-gray-200">
							<strong>Check Out:</strong>
							{formatTime(quick.checkOutTime)}
						</div>
						<div class="text-sm text-gray-800 dark:text-gray-200">
							<strong>Hours Worked:</strong>
							{runningHours}h {runningMinutes}m
						</div>

						<div class="text-sm text-gray-800 dark:text-gray-200">
							<strong>Geofence Summary:</strong>
							{#if activeGeofence}
								<div class="mt-2 space-y-1">
									{#each todayPunches as p}
										<div class="text-sm flex items-center gap-2">
											<!-- Geofence dot -->
											<div
												class="w-3 h-3 rounded-full"
												style="background-color: {punchWithinGeofence(p)?.within
													? document.documentElement.classList.contains('dark')
														? '#059669'
														: '#10B981'
													: document.documentElement.classList.contains('dark')
														? '#FBBF24'
														: '#F59E0B'}"
											></div>

											<div class="font-semibold text-gray-900 dark:text-gray-100">
												{p.eventType}
											</div>

											<div class="text-xs text-gray-500 dark:text-gray-400">
												at {new Date(p.eventTime).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit'
												})}
											</div>

											<div class="text-xs text-gray-600 dark:text-gray-300">
												{punchWithinGeofence(p)
													? punchWithinGeofence(p)?.within
														? 'Within geofence'
														: `Outside (${Math.round(punchWithinGeofence(p)?.distanceMeters ?? 0)} m)`
													: 'No location'}
											</div>
										</div>
									{/each}

									{#if todayPunches.length === 0}
										<div class="text-sm text-gray-500 dark:text-gray-400">
											No punches recorded for today.
										</div>
									{/if}

									<div class="text-sm text-gray-400 dark:text-gray-500 mt-1">
										Geofence: {activeGeofence?.name ?? '—'} ({activeGeofence?.latitude ?? '-'},
										{activeGeofence?.longitude ?? '-'}, r={activeGeofence?.radiusMeters ?? '-'} m)
									</div>
								</div>
							{:else}
								<div class="ml-2 text-sm text-gray-500 dark:text-gray-400">
									Geofence not configured (system setting).
								</div>
							{/if}
						</div>
					</div>

					<!-- Punch button right-aligned like the live clock -->
					<div class="flex items-start justify-end min-w-[160px]">
						{#if quick.checkOutTime}
							<div class="text-sm text-gray-500 dark:text-gray-400 text-right">
								Completed for today
							</div>
						{:else}
							<button
								on:click={() => handlePunch(quick.checkInTime ? 'OUT' : 'IN')}
								disabled={punchProcessing}
								class="text-sm font-medium px-3 py-1.5 rounded-2xl border text-red-600 bg-white hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-red-800 transition"
							>
								{punchProcessing ? 'Processing...' : quick.checkInTime ? 'Punch Out' : 'Punch In'}
							</button>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Last 30 Days Summary Card -->
		<Card.Root class="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg mt-4">
			<Card.Header>
				<Card.Title
					class="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100"
				>
					<CalendarDays class="w-5 h-5 text-blue-600 dark:text-blue-400" />
					Last 30 Days Summary
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
					<div class="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900">
						<CalendarCheck class="w-6 h-6 text-blue-600 dark:text-blue-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Total Days</p>
							<p class="text-lg font-semibold text-blue-700 dark:text-blue-300">
								{summaryData.summary.totalDays}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900">
						<UserCheck class="w-6 h-6 text-green-600 dark:text-green-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Present</p>
							<p class="text-lg font-semibold text-green-700 dark:text-green-300">
								{summaryData.summary.present}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900">
						<UserX class="w-6 h-6 text-red-600 dark:text-red-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Absent</p>
							<p class="text-lg font-semibold text-red-700 dark:text-red-300">
								{summaryData.summary.absent}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900">
						<Clock class="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Average Hours / Day</p>
							<p class="text-lg font-semibold text-indigo-700 dark:text-indigo-300">
								{+summaryData.summary.avgHours.toFixed(2)}
							</p>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Detailed Attendance Records Card -->
		<Card.Root class="p-4 bg-white dark:bg-gray-800 shadow-sm rounded-lg mt-4">
			<Card.Header>
				<Card.Title
					class="text-lg font-semibold flex items-center gap-2 text-gray-900 dark:text-gray-100"
				>
					<Clock class="w-5 h-5 text-blue-600 dark:text-blue-400" /> Detailed Attendance Records
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="overflow-x-auto mt-2">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>#</Table.Head>
								<Table.Head>Date</Table.Head>
								<Table.Head>Punch In</Table.Head>
								<Table.Head>Punch-in Location</Table.Head>
								<Table.Head>Punch Out</Table.Head>
								<Table.Head>Punch-out Location</Table.Head>
								<Table.Head>Hours</Table.Head>
								<Table.Head>Status</Table.Head>
								<Table.Head>Remarks</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if loading}
								<Table.Row>
									<Table.Cell colspan="7" class="text-center h-16">Loading...</Table.Cell>
								</Table.Row>
							{:else if summaryData.records.length === 0}
								<Table.Row>
									<Table.Cell colspan="9" class="text-center h-16"
										>No attendance records in last 30 days.</Table.Cell
									>
								</Table.Row>
							{:else}
								{#each sortedRecords.slice(offset, offset + limit) as r, i}
									<Table.Row>
										<Table.Cell>{offset + i + 1}</Table.Cell>
										<Table.Cell>{new Date(r.summaryDate).toLocaleDateString()}</Table.Cell>
										<Table.Cell>{formatTime(r.checkInTime)}</Table.Cell>
										<Table.Cell>
											{#if r.checkInLocation}
												{r.checkInLocation.locationName
													? r.checkInLocation.locationName
													: `Outside Geofence (${r.checkInLocation.lat.toFixed(6)}, ${r.checkInLocation.lng.toFixed(6)})`}
											{:else}-{/if}
										</Table.Cell>
										<Table.Cell>{formatTime(r.checkOutTime)}</Table.Cell>
										<Table.Cell>
											{#if r.checkOutLocation}
												{r.checkOutLocation.locationName
													? r.checkOutLocation.locationName
													: `Outside Geofence (${r.checkOutLocation.lat.toFixed(6)}, ${r.checkOutLocation.lng.toFixed(6)})`}
											{:else}-{/if}
										</Table.Cell>
										<Table.Cell
											>{r.workedHours != null
												? `${Number(r.workedHours).toFixed(2)} h`
												: '-'}</Table.Cell
										>
										<Table.Cell>
											<span
												class={`px-2 py-1 rounded-xl text-xs ${getStatusBadge(r.status ?? (r.checkInTime ? 'Present' : 'Absent'))}`}
											>
												{r.status ?? (r.checkInTime ? 'Present' : 'Absent')}
											</span>
										</Table.Cell>
										<Table.Cell>{r.remarks ?? '-'}</Table.Cell>
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
							<Button
								on:click={() => (offset = Math.max(0, offset - limit))}
								disabled={offset === 0}
								title="Previous"
							>
								<ChevronLeft class="w-4 h-4" />
							</Button>

							<Button
								on:click={() => (offset = Math.min(totalRecords - limit, offset + limit))}
								disabled={offset + limit >= totalRecords}
								title="Next"
							>
								<ChevronRight class="w-4 h-4" />
							</Button>
							<Button
								title="Export PDF"
								on:click={() =>
									exportToPDF(
										summaryData.records,
										'Attendance_Last_30_Days.pdf',
										'Last 30 Days Attendance'
									)}
							>
								<Printer />
							</Button>
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</Card.Content>
</Card.Root>
