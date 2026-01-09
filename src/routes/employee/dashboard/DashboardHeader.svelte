<script lang="ts">
	import { onMount } from 'svelte';
	import { getEmpHeader } from './services/dashboardAPI';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	// Reactive variables
	let streakCount = 0;
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		try {
			const data = await getEmpHeader();
			streakCount = data.streakCount ?? 0;
		} catch (err) {
			console.error(err);
			error = 'Failed to load dashboard header';
		} finally {
			loading = false;
		}
	});
</script>

<GlassCard hoverEffect={false} className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
	{#if loading}
		<div class="text-gray-500 dark:text-gray-400">Loading header...</div>
	{:else if error}
		<div class="text-red-500">
			{error}
		</div>
	{:else}
		<div>
			<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Employee Dashboard</h1>
			<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
				Your personalized workspace to track attendance, leaves, and daily updates
			</p>
		</div>

		<div
			class="mt-3 sm:mt-0 flex items-center gap-2
             bg-pink-100 dark:bg-purple-800/30
             text-red-700 dark:text-purple-100
             px-3 py-1.5 rounded-full font-medium text-sm"
		>
			<span>🔥</span>
			<span>{streakCount} days streak</span>
		</div>
	{/if}
</GlassCard>
