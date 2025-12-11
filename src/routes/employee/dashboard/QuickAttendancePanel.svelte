<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { MapPin } from 'lucide-svelte';
	import { toast } from '$lib/components/ui/toast/use-toast';
	import Toast from '$lib/components/ui/toast/Toast.svelte';

	let punchStatus: 'IN' | 'OUT' | 'NONE' = 'NONE';
	let punchInTime: Date | null = null;
	let hoursWorked = 0;
	let minutesWorked = 0;

	// Track if day is completed
	let dayCompleted = false; // true when both check-in and check-out exist for today

	let formattedTime = '';
	let currentDate = '';
	let location: string = 'Detecting...';
	let timer: ReturnType<typeof setInterval> | null = null;
	let processing = false; // Prevent multiple clicks

	// 🕒 Clock + Work Hours updater
	const updateClock = () => {
		const now = new Date();
		formattedTime = now.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
		currentDate = now.toLocaleDateString([], {
			weekday: 'long',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});

		// ⏱️ If currently punched in, calculate elapsed time
		if (punchStatus === 'IN' && punchInTime) {
			const diffMs = now.getTime() - punchInTime.getTime();
			hoursWorked = Math.floor(diffMs / (1000 * 60 * 60));
			minutesWorked = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
		}
	};

	const detectLocation = async () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				async (pos) => {
					const { latitude, longitude } = pos.coords;
					try {
						const res = await fetch(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						);
						const data = await res.json();
						location = data.address.city || data.address.town || data.address.village || 'Unknown';
					} catch {
						location = 'Unknown';
					}
				},
				() => {
					location = 'Permission denied';
				}
			);
		} else {
			location = 'Not supported';
		}
	};

	async function loadQuickAttendance() {
		try {
			const res = await fetch('/api/dashboard/empQuickAttendance');
			const data = await res.json();

			if (data.success) {
				// ⭐ NEW: Check if reason is required
				if (data.autoPunchedOutReasonRequired && data.id) {
					pendingRecordId = data.id;
					showReasonModal = true;
					// Don't update other UI states - user must submit reason first
					return;
				}

				const today = data.data;

				if (today.status === 'IN') {
					punchStatus = 'IN';
					punchInTime = today.checkInTime ? new Date(today.checkInTime) : new Date();
					dayCompleted = false;
				} else if (today.status === 'OUT') {
					punchStatus = 'OUT';
					punchInTime = today.checkInTime ? new Date(today.checkInTime) : null;
					dayCompleted = true;

					if (today.workedHours != null) {
						hoursWorked = Math.floor(today.workedHours);
						minutesWorked = Math.floor((today.workedHours % 1) * 60);
					}
				} else {
					punchStatus = 'NONE';
					punchInTime = null;
					dayCompleted = false;
				}
			}
		} catch (err) {
			console.error('Failed to fetch attendance', err);
			showAlert('Connection Error: Failed to load attendance data', 'error');
		}
	}

	onMount(async () => {
		updateClock();
		detectLocation();
		await loadQuickAttendance();
		timer = setInterval(updateClock, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	async function submitAutoPunchReason(recordId: number, reason: string) {
		const res = await fetch('/api/attendance/submit-auto-punch-reason', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ recordId, reason })
		});

		const data = await res.json();
		if (!data.success) {
			showAlert(`Submission Failed: ${data.error || 'Failed to submit reason'}`, 'error');
			return false;
		}
		return true;
	}

	let showReasonModal = false;
	let pendingRecordId: number | null = null;
	let reasonText = '';

	async function handleReasonSubmit() {
		if (!reasonText.trim()) {
			showAlert('Validation Error: Please enter a reason.', 'error');
			return;
		}

		const ok = await submitAutoPunchReason(pendingRecordId!, reasonText);
		if (ok) {
			showAlert('Reason Submitted Successfully! You can now punch in for today.', 'success');
			showReasonModal = false;
			reasonText = '';
			pendingRecordId = null;
			await loadQuickAttendance(); // refresh UI
		}
	}

	const handlePunch = async () => {
		// Check if day is already completed
		if (dayCompleted) {
			showAlert('Day Completed! You have already completed your attendance for today.', 'info');
			return;
		}

		// Block Punch In Until Reason Submitted
		if (showReasonModal) {
			showAlert(
				'Punch In Blocked! Please complete the auto punch-out reason form above before punching in.',
				'error'
			);
			return;
		}

		if (processing) return; // Prevent multiple clicks
		if (!navigator.geolocation) {
			showAlert('Geolocation is not supported by your browser.', 'error');
			return;
		}

		processing = true;
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const { latitude, longitude, accuracy } = pos.coords;
				const actionType = punchStatus === 'IN' ? 'OUT' : 'IN';

				try {
					const res = await fetch('/api/dashboard/empQuickAttendance', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							actionType,
							latitude,
							longitude,
							accuracyMeters: accuracy
						})
					});

					const data = await res.json();

					if (data.success) {
						// Blocked punch-in
						if (data.autoPunchedOutReasonRequired && data.id) {
							pendingRecordId = data.id;
							showReasonModal = true;
							processing = false;
							return; // Stop here, don't update UI
						}

						let statusMessage = '';
						// Show punch timeliness
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

						// Determine if day is completed
						if (data.dayStatus === 'complete') {
							dayCompleted = true;
						}

						// Punch Status Alert
						if (statusMessage) {
							showAlert(
								`${statusMessage}: ${data.message}`,
								data.punchTimeliness === 'late' ? 'error' : 'success'
							);
						} else {
							showAlert(`Attendance Updated: ${data.message}`, 'success');
						}

						// Update UI state
						punchStatus = actionType;

						if (actionType === 'IN') {
							punchInTime = new Date();
							hoursWorked = 0;
							minutesWorked = 0;
						} else if (actionType === 'OUT') {
							punchInTime = null;
							// Update hours from API response
							if (data.workedHours != null) {
								hoursWorked = Math.floor(data.workedHours);
								minutesWorked = Math.floor((data.workedHours % 1) * 60);
							}
						}
					} else {
						showAlert(`Punch Failed: ${data.error || 'Unknown error occurred'}`, 'error');
					}
				} catch (error) {
					showAlert(
						'Network Error: Failed to connect to server. Please check your connection.',
						'error'
					);
					console.error('Punch error:', error);
				} finally {
					processing = false;
				}
			},
			(error) => {
				// Geolocation permission denied or error
				showAlert(
					`Location Error: ${error.message || 'Cannot access your location. Please enable location services.'}`,
					'error'
				);
				processing = false;
			}
		);
	};

	const getPunchButtonText = () => {
		// Show disabled state when day completed & reason required
		if (showReasonModal) return 'Submit Reason Required';
		if (dayCompleted) return 'Completed';

		switch (punchStatus) {
			case 'IN':
				return 'Punch Out';
			case 'OUT':
			case 'NONE':
				return 'Punch In';
		}
	};

	// Check if button should be disabled
	const isButtonDisabled = () => {
		return showReasonModal || dayCompleted || processing;
	};

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
	}
</script>

<!-- 🧭 UI -->
<div
	class="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-800/20 rounded-2xl shadow-md p-5 flex flex-col gap-3 transition-colors"
>
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Quick Attendance</h2>

	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-col gap-1 text-gray-800 dark:text-gray-200">
			<div class="text-3xl font-bold">{formattedTime}</div>

			<div class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
				<MapPin class="w-4 h-4 text-red-500" />
				<span>{location}</span>
				<span>•</span>
				<span>{currentDate}</span>
			</div>

			<div class="text-sm">
				Hours Worked Today:
				<span class="font-semibold">{hoursWorked}h {minutesWorked}m</span>
			</div>

			<!-- 🔧 NEW: Show completion status -->
			{#if dayCompleted}
				<div class="text-xs text-green-600 dark:text-green-400 font-medium mt-1">
					✓ Day completed
				</div>
			{/if}
		</div>

		<!-- Punch Button -->
		<div>
			<button
				on:click={handlePunch}
				disabled={isButtonDisabled()}
				class="text-sm font-medium px-3 py-1.5 rounded-2xl border text-red-600 bg-white hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-red-800 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-red-600 dark:disabled:hover:bg-gray-700 dark:disabled:hover:text-white"
				class:bg-red-600={punchStatus !== 'IN' && !dayCompleted}
				class:bg-red-500={punchStatus === 'IN' && !dayCompleted}
				class:hover:bg-red-700={punchStatus !== 'IN' && !dayCompleted}
				class:hover:bg-red-800={punchStatus === 'IN' && !dayCompleted}
			>
				{getPunchButtonText()}
			</button>
		</div>

		<!-- Toast container -->
		<Toast />

		{#if showReasonModal}
			<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
				<div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
					<h3 class="text-lg font-semibold text-gray-800 dark:text-white mb-3">
						⚠️ Explanation Required
					</h3>
					<p class="text-gray-600 dark:text-gray-300 mb-4">
						You were auto-punched out. Please explain why you didn't punch out manually:
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
	</div>
</div>
