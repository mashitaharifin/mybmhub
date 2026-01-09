<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Clock11, NotebookText, Bell, User, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { getTeamActivities } from './services/dashboardAPI';
	import type { TeamActivity } from '$lib/types/dashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let activities: TeamActivity[] = [];
	let loading = true;
	let error: string | null = null;

	// Show only first 10 activities in the card
	const displayedActivities = () => activities.slice(0, 10);

	const getIcon = (type: string) => {
		switch (type) {
			case 'attendance':
				return Clock11;
			case 'leave':
				return NotebookText;
			case 'notification':
				return Bell;
			default:
				return User;
		}
	};

	const getActivityColor = (type: string) => {
		switch (type) {
			case 'attendance':
				return 'text-green-600 dark:text-green-500';
			case 'leave':
				return 'text-blue-600 dark:text-blue-500';
			case 'notification':
				return 'text-purple-600 dark:text-purple-500';
			default:
				return 'text-gray-600 dark:text-gray-500';
		}
	};

	const formatTime = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 60) {
			return `${diffMins}m ago`;
		} else if (diffHours < 24) {
			return `${diffHours}h ago`;
		} else if (diffDays === 1) {
			return 'Yesterday';
		} else if (diffDays < 7) {
			return `${diffDays}d ago`;
		} else {
			return date.toLocaleDateString('en-MY', {
				day: 'numeric',
				month: 'short'
			});
		}
	};

	const viewMoreActivities = () => {
		goto('/manager/recent-activity');
	};

	let interval: ReturnType<typeof setInterval>;

	async function fetchActivities() {
		loading = true;
		error = null;
		try {
			const data = await getTeamActivities();
			activities = data.length ? data : [];
		} catch (err) {
			console.error('Failed to load team activities:', err);
			error = 'Unable to fetch activities';
			activities = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchActivities();
		interval = setInterval(fetchActivities, 10000); // Refresh every 10 seconds
	});

	onDestroy(() => clearInterval(interval));
</script>

<GlassCard>
	<div class="flex justify-between items-center mb-3 lg:mb-2">
		<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Team Recent Activities</h2>
		<div class="text-xs text-gray-500 dark:text-gray-400">
			{activities.length > 0 ? `${activities.length} showing` : 'No activities'}
		</div>
	</div>

	{#if loading}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-sm text-gray-500 dark:text-gray-400">Loading activities...</div>
		</div>
	{:else if error}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-sm text-red-500">{error}</div>
		</div>
	{:else if activities.length === 0}
		<div class="flex-1 flex items-center justify-center">
			<div class="text-sm text-gray-500 dark:text-gray-400">No recent team activities</div>
		</div>
	{:else}
		<div class="flex-1 space-y-3 max-h-[320px] lg:max-h-[260px] overflow-y-auto pr-2">
			{#each displayedActivities() as activity}
				<div
					class="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-300/20 dark:hover:bg-gray-800/30 transition-colors"
				>
					<div class={`mt-1 ${getActivityColor(activity.type)}`}>
						<svelte:component this={getIcon(activity.type)} size="18" />
					</div>

					<div class="flex-1 min-w-0">
						<div class="flex items-center justify-between mb-1">
							<span class="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
								{activity.employeeName}
							</span>
							<span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2">
								{formatTime(activity.timestamp)}
							</span>
						</div>

						<div class="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
							{activity.details}
						</div>

						<div class="mt-1">
							<span
								class="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full
                {activity.type === 'attendance'
									? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
									: activity.type === 'leave'
										? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
										: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}"
							>
								{activity.type === 'attendance'
									? 'Attendance'
									: activity.type === 'leave'
										? 'Leave'
										: 'Notification'}
							</span>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	<!-- View More Activities Link -->
	{#if !loading && activities.length > 10}
		<div class="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
			<button
				on:click={viewMoreActivities}
				class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
			>
				View More Activities ({activities.length - 5} more)
				<ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
			</button>
		</div>
	{:else if !loading && activities.length > 0}
		<div class="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
			<button
				on:click={viewMoreActivities}
				class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
			>
				View All Activities
				<ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
			</button>
		</div>
	{/if}
</GlassCard>
