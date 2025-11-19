<script lang="ts">
	import { onMount } from 'svelte';
	import { MapPin } from 'lucide-svelte';

	let currentTime: string = '';
	let currentDate: string = '';
	let location: string = 'Detecting...';

	const updateClock = () => {
		const now = new Date();
		currentTime = now.toLocaleTimeString([], {
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
	};

	const detectLocation = async () => {
		if (navigator.geolocation) {
			navigator.geolocation.getCurrentPosition(
				async (pos) => {
					const { latitude, longitude } = pos.coords;
					// Use a free reverse geocoding API (like OpenStreetMap Nominatim)
					try {
						const res = await fetch(
							`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
						);
						const data = await res.json();
						location = data.address.city || data.address.town || data.address.village || 'Unknown';
					} catch (err) {
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

	onMount(() => {
		updateClock();
		detectLocation();
		const interval = setInterval(updateClock, 1000);
		return () => clearInterval(interval);
	});
</script>

<div
	class="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-800/20 rounded-2xl shadow-md p-5 flex flex-col gap-3 transition-colors"
>
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">Clock Widget</h2>
	<div class="text-3xl font-bold text-gray-900 dark:text-gray-100">{currentTime}</div>
	<div class="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
		<MapPin class="w-4 h-4 text-red-500" />
		<span>{location}</span>
		<span>•</span>
		<span>{currentDate}</span>
	</div>
</div>
