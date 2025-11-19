<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { MapPin } from 'lucide-svelte';

	let punchStatus: 'IN' | 'OUT' | 'NONE' = 'NONE';
	let punchInTime: Date | null = null;
	let hoursWorked = 0;
	let minutesWorked = 0;

	let formattedTime = '';
	let currentDate = '';
	let location: string = 'Detecting...';
	let timer: ReturnType<typeof setInterval> | null = null;

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

	onMount(async () => {
		updateClock();
		detectLocation();

		// ✅ Fetch today's attendance to initialize status and timer
		try {
			const res = await fetch('/api/dashboard/empQuickAttendance');
			const data = await res.json();

			if (data.success) {
				const today = data.data;

				if (today.status === 'IN') {
					punchStatus = 'IN';
					punchInTime = today.checkInTime ? new Date(today.checkInTime) : new Date();
				} else if (today.status === 'OUT') {
					punchStatus = 'OUT';
					punchInTime = today.checkInTime ? new Date(today.checkInTime) : null;
					if (today.workedHours != null) {
						hoursWorked = Math.floor(today.workedHours);
						minutesWorked = Math.floor((today.workedHours % 1) * 60);
					}
				} else {
					punchStatus = 'NONE';
					punchInTime = null;
				}
			}
		} catch (err) {
			console.error('Failed to fetch attendance', err);
		}

		// Start the clock & hours timer
		timer = setInterval(updateClock, 1000);
	});

	onDestroy(() => {
		if (timer) clearInterval(timer);
	});

	const handlePunch = async () => {
		if (!navigator.geolocation) {
			alert('Geolocation not supported.');
			return;
		}

		navigator.geolocation.getCurrentPosition(async (pos) => {
			const { latitude, longitude, accuracy } = pos.coords;
			const actionType = punchStatus === 'IN' ? 'OUT' : 'IN';

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
				alert(data.message);
				punchStatus = actionType;

				if (actionType === 'IN') {
					punchInTime = new Date();
					hoursWorked = 0;
					minutesWorked = 0;
				} else if (actionType === 'OUT') {
					punchInTime = null;
				}
			} else {
				alert('Error: ' + data.error);
			}
		});
	};

	const getPunchButtonText = () => {
		switch (punchStatus) {
			case 'IN':
				return 'Punch Out';
			case 'OUT':
			case 'NONE':
				return 'Punch In';
		}
	};
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
		</div>

		<!-- Punch Button -->
		<div>
			<button
				on:click={handlePunch}
				class="text-sm font-medium px-3 py-1.5 rounded-2xl border text-red-600 bg-white hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-red-800 transition"
				class:bg-red-600={punchStatus !== 'IN'}
				class:bg-red-500={punchStatus === 'IN'}
				class:hover:bg-red-700={punchStatus !== 'IN'}
				class:hover:bg-red-800={punchStatus === 'IN'}
			>
				{getPunchButtonText()}
			</button>
		</div>
	</div>
</div>
