<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getMetrics } from './services/dashboardAPI';
	import type { Metric, MetricsResponse } from '$lib/types/dashboard';

	// Initialize with all metrics so cards always exist
	let metrics: Metric[] = [
		{ title: 'Total Employees', value: null, color: 'bg-blue-500' },
		{ title: 'Present Today', value: null, color: 'bg-green-500' },
		{ title: 'Absent Today', value: null, color: 'bg-red-500' },
		{ title: 'Pending Leave Requests', value: null, color: 'bg-yellow-500' }
	];

	let loading = true;
	let error: string | null = null;
	let interval: ReturnType<typeof setInterval>;

	async function fetchMetricsData() {
		loading = true;
		error = null;
		try {
			const data: MetricsResponse = await getMetrics();

			metrics = metrics.map((m) => {
				switch (m.title) {
					case 'Total Employees':
						return { ...m, value: data?.totalEmployees ?? null };
					case 'Present Today':
						return { ...m, value: data?.attendanceSummary?.totalPresent ?? null };
					case 'Absent Today':
						return { ...m, value: data?.attendanceSummary?.totalAbsent ?? null };
					case 'Pending Leave Requests':
						return { ...m, value: data?.leaveSummary?.pending ?? null };
					default:
						return m;
				}
			});
		} catch (err) {
			console.error('Failed to fetch metrics:', err);
			error = 'Unable to fetch data';
			metrics = metrics.map((m) => ({ ...m, value: null }));
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchMetricsData();
		interval = setInterval(fetchMetricsData, 5000); // auto-refresh every 5s
	});

	onDestroy(() => clearInterval(interval));
</script>

<div class="flex justify-center gap-10 overflow-x-auto">
	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400">Loading metrics...</div>
	{:else if error}
		<div class="text-sm text-red-500">{error}</div>
	{:else}
		{#each metrics as m}
			<div
				class="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-6 transition-colors hover:bg-red-50 dark:hover:bg-red-800/20 flex justify-between items-center min-w-[350px]"
			>
				<div>
					<div class="text-sm font-medium text-gray-500 dark:text-gray-400">{m.title}</div>
					<div class="text-sm text-gray-500 dark:text-gray-400 mt-1">
						{m.value !== null ? m.value : 'No data is available'}
					</div>
				</div>
				<div class={`w-4 h-20 rounded-full ${m.color}`}></div>
			</div>
		{/each}
	{/if}
</div>
