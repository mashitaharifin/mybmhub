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
		CalendarCheck,
		CheckCircle2,
		Plane
	} from 'lucide-svelte';

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
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
	let limit = 11;
	let totalRecords = 0;

	// --- Geofence and today's punches ---
	let todayPunches: any[] = [];
	let activeGeofence: any = null;

	// --- Attendance settings ---
	let attendanceSettings: any = {
		shiftStart: '11:00',
		shiftEnd: '19:00',
		requiredHours: 8,
		graceMinutes: 10,
		lunchBreakMins: 60
	};

	// --- Auto punch-out reason modal ---
	let showReasonModal = false;
	let pendingRecordId: number | null = null;
	let reasonText = '';

	// --- Punch-out confirmation ---
	let showPunchOutConfirm = false;

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

				// Check if reason is required (inside the success block)
				if (data.autoPunchedOutReasonRequired && data.id) {
					pendingRecordId = data.id;
					showReasonModal = true;
					showAlert(
						"You must submit a reason for yesterday's auto punch-out before punching in.",
						'info'
					);
				}
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

	// --- Submit auto punch reason ---
	async function submitAutoPunchReason(recordId: number, reason: string) {
		try {
			const res = await fetch('/api/attendance/submit-auto-punch-reason', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ recordId, reason })
			});
			const data = await res.json();
			if (!data.success) {
				showAlert(data.error || 'Failed to submit reason', 'error');
				return false;
			}
			return true;
		} catch (err) {
			showAlert('Failed to submit reason', 'error');
			return false;
		}
	}

	async function handleReasonSubmit() {
		if (!reasonText.trim()) {
			showAlert('Please enter a reason.', 'error');
			return;
		}

		const ok = await submitAutoPunchReason(pendingRecordId!, reasonText);
		if (ok) {
			showAlert('Reason Submitted Successfully! You can now punch in for today.', 'success');

			showReasonModal = false;
			reasonText = '';
			pendingRecordId = null;
			await loadQuickAttendance(); // refresh UI
			showAlert('Reason submitted successfully. You can now punch in.', 'success');
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
		// ⭐ Block punch in if reason modal is open
		if (showReasonModal) {
			showAlert('You must submit your auto punch-out reason first.', 'info');
			return;
		}

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
						// ⭐ Check if punch is blocked due to required reason
						if (data.autoPunchedOutReasonRequired && data.id) {
							pendingRecordId = data.id;
							showReasonModal = true;
							showAlert(
								data.message || "Please submit reason for yesterday's auto punch-out.",
								'info'
							);
							punchProcessing = false;
							return;
						}
						// --- Punch timeliness message ---
						let statusMessage = '';
						if (data.punchTimeliness) {
							switch (data.punchTimeliness) {
								case 'early':
									statusMessage = 'You punched in early! 🎉🌟';
									break;
								case 'on-time':
									statusMessage = 'You are on time! ⏰👍';
									break;
								case 'late':
									statusMessage = 'You are late! ⚠️😬';
									break;
							}
						}

						// Show message using showAlert()
						showAlert(`${data.message}${statusMessage ? ' — ' + statusMessage : ''}`, 'success');
						await loadQuickAttendance();
						await loadAttendanceSummary();
						await loadActiveGeofence();
						await loadTodayPunches();
					} else {
						showAlert(data?.error || 'Punch failed', 'error');
					}
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

	function getStatusBadge(
		status: string,
		autoPunchedOut: boolean = false,
		onLeave: boolean = false
	) {
		const s = (status ?? '').toLowerCase();

		// Check for leave status FIRST (highest priority)
		if (onLeave || s.includes('leave')) {
			if (s.includes('half day')) {
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
			}
			return 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200';
		}

		// Check for auto-punch
		if (autoPunchedOut) {
			return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-100';
		}

		// Regular statuses
		switch (s) {
			case 'present':
			case 'complete':
				return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200';
			case 'absent':
				return 'bg-red-100 text-red-800 dark:bg-red-600/50 dark:text-red-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-100';
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

	function handlePunchClick() {
		const actionType = punchButtonType();

		// Require confirmation ONLY for Punch Out
		if (actionType === 'OUT') {
			showPunchOutConfirm = true;
			return;
		}

		// Punch In proceeds normally
		handlePunch('IN');
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
						{:else if showReasonModal}
							<div class="text-sm text-yellow-600 dark:text-yellow-400 text-right">
								Reason Required
							</div>
						{:else}
							<button
								on:click={handlePunchClick}
								disabled={punchProcessing}
								class="text-sm font-medium px-3 py-1.5 rounded-2xl border border-white dark:border-gray-500 bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d]
								text-gray-100 dark:text-white hover:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
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
				<div class="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mt-2">
					<div class="flex items-center gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/50">
						<CalendarCheck class="w-6 h-6 text-blue-600 dark:text-blue-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Total Working Days</p>
							<p class="text-lg font-semibold text-blue-700 dark:text-blue-300">
								{summaryData.summary.totalDays}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-900/50">
						<UserCheck class="w-6 h-6 text-green-600 dark:text-green-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Present</p>
							<p class="text-lg font-semibold text-green-700 dark:text-green-300">
								{summaryData.summary.present}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/50">
						<UserX class="w-6 h-6 text-red-600 dark:text-red-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Absent</p>
							<p class="text-lg font-semibold text-red-700 dark:text-red-300">
								{summaryData.summary.absent}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-800/60">
						<CheckCircle2 class="w-6 h-6 text-gray-600 dark:text-gray-300" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">Auto-completed</p>
							<p class="text-lg font-semibold text-gray-700 dark:text-gray-200">
								{summaryData.summary.autoCompleted ?? '—'}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/40">
						<Plane class="w-6 h-6 text-amber-600 dark:text-amber-400" />
						<div>
							<p class="text-sm text-gray-500 dark:text-white">On Leave</p>
							<p class="text-lg font-semibold text-amber-700 dark:text-amber-300">
								{summaryData.summary.onLeave ?? '—'}
							</p>
						</div>
					</div>
					<div class="flex items-center gap-3 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/50">
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
												class={`px-2 py-1 rounded-xl text-xs ${getStatusBadge(
													r.status ?? (r.checkInTime ? 'Present' : 'Absent'),
													r.autoPunchedOut,
													r.onLeave
												)}`}
											>
												{#if r.onLeave}
													{r.status}
												{:else if r.autoPunchedOut}
													{#if r.autoPunchedOutReason}
														Auto-Complete
													{:else if r.autoPunchedOutReasonRequired}
														Auto-Incomplete
													{:else}
														Auto-Complete
													{/if}
												{:else}
													{r.status ?? (r.checkInTime ? 'Present' : 'Absent')}
												{/if}
											</span>
										</Table.Cell>

										<Table.Cell>
											<!-- Show auto-punch reason if it exists -->
											{#if r.autoPunchedOutReason}
												<div class="max-w-xs">
													<div class="flex items-center gap-1 mb-1">
														<div class="w-2 h-2 bg-yellow-500 rounded-full"></div>
														<span class="text-xs font-medium text-yellow-700 dark:text-yellow-300">
															Auto-punched
														</span>
													</div>
													<div
														class="text-xs text-gray-700 dark:text-gray-300 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-100 dark:border-yellow-800"
													>
														{r.autoPunchedOutReason}
													</div>
												</div>
											{:else if r.onLeave}
												<!-- Show leave information -->
												<div class="max-w-xs">
													<div class="flex items-center gap-1 mb-1">
														<div class="w-2 h-2 bg-blue-500 rounded-full"></div>
														<span class="text-xs font-medium text-blue-700 dark:text-blue-300">
															{r.leaveType}
															{#if r.halfDayLeave}
																<span class="italic"> (Half Day – {r.leaveSession || 'AM'})</span>
															{/if}
														</span>
													</div>
													{#if r.halfDayLeave}
														<div class="text-xs text-blue-600 dark:text-blue-400 italic">
															Half Day ({r.leaveSession || 'AM'} session)
														</div>
													{/if}
												</div>
											{:else if r.autoPunchedOut && r.autoPunchedOutReasonRequired}
												<div class="max-w-xs">
													<div class="flex items-center gap-1 mb-1">
														<div class="w-2 h-2 bg-red-500 rounded-full"></div>
														<span class="text-xs font-medium text-red-700 dark:text-red-300">
															Reason Required
														</span>
													</div>
													<div class="text-xs text-red-600 dark:text-red-400 italic">
														Please submit auto-punch reason
													</div>
												</div>
											{:else if r.remarks}
												<!-- Show other remarks -->
												<div class="max-w-xs text-xs text-gray-700 dark:text-gray-300">
													{r.remarks}
												</div>
											{:else}
												<span class="text-gray-400 text-xs">-</span>
											{/if}
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
						</div>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</Card.Content>
</Card.Root>

<!-- ⭐ NEW: Auto Punch Reason Modal -->
{#if showReasonModal}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
			<h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
				⚠️ Explanation Required
			</h3>
			<p class="text-gray-600 dark:text-gray-300 mb-4">
				You were auto-punched out yesterday. Please explain why you didn't punch out manually:
			</p>

			<textarea
				bind:value={reasonText}
				class="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg mb-4 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
				placeholder="E.g., forgot, emergency, system issue..."
				rows="3"
			></textarea>

			<div class="flex justify-end gap-3">
				<button
					on:click={() => {
						showReasonModal = false;
						reasonText = '';
						pendingRecordId = null;
					}}
					class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
				>
					Cancel
				</button>
				<button
					on:click={handleReasonSubmit}
					disabled={!reasonText.trim()}
					class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
				>
					Submit Reason
				</button>
			</div>
		</div>
	</div>
{/if}

{#if showPunchOutConfirm}
	<div class="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50 p-4">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
			<h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">⚠️ Confirm Punch Out</h3>

			<p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
				Are you sure you want to punch out? This will end your working hours for today.
			</p>

			<div class="flex justify-end gap-3">
				<button
					on:click={() => (showPunchOutConfirm = false)}
					class="px-4 py-2 text-sm rounded-3xl border border-gray-300 dark:border-gray-600
						text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
				>
					Cancel
				</button>

				<button
					on:click={() => {
						showPunchOutConfirm = false;
						handlePunch('OUT');
					}}
					class="px-4 py-2 text-sm bg-pink-400 dark:bg-purple-700 text-white font-semibold rounded-3xl
						hover:bg-orange-500 hover:dark:bg-orange-700 transition"
				>
					Yes, Punch Out
				</button>
			</div>
		</div>
	</div>
{/if}
