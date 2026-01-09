<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getMetrics } from './services/dashboardAPI';
	import type { Metric, MetricsResponse } from '$lib/types/dashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

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
		interval = setInterval(fetchMetricsData, 10000); // auto-refresh every 10s
	});

	onDestroy(() => clearInterval(interval));
</script>

<div class="w-full flex flex-wrap justify-center gap-4 sm:gap-6 md:gap-10">
	{#if loading}
		<GlassCard className="w-full sm:w-[45%] md:w-[350px] text-sm text-gray-500 dark:text-gray-400">
			Loading metrics...
		</GlassCard>
	{:else if error}
		<GlassCard className="w-full sm:w-[45%] md:w-[350px] text-sm text-red-500">
			{error}
		</GlassCard>
	{:else}
		{#each metrics as m}
			<GlassCard 
				className="w-full sm:w-[45%] md:w-[350px] p-4 flex justify-between items-center hover:bg-red-50/50 dark:hover:bg-red-800/20"
			>
				<div>
					<div class="text-lg font-medium text-gray-800 dark:text-gray-200">{m.title}</div>
					<div class="text-lg text-gray-500 dark:text-gray-400 mt-1">
						{m.value !== null ? m.value : 'No data is available'}
					</div>
				</div>
				<!-- Optional: Color bar if you want to use it -->
				<!-- <div class={`w-4 h-20 rounded-full ${m.color}`}></div> -->
			</GlassCard>
		{/each}
	{/if}
</div>