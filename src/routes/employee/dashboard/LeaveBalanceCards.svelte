<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import type { LeaveBalanceItem } from '$lib/types/empDashboard';
	import { getEmpLeaveBalance } from './services/dashboardAPI';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let leaveBalances: LeaveBalanceItem[] = [];
	let loading = true;
	let error: string | null = null;

	function percentageRemaining(total: number, remaining: number): number {
		if (total === 0) return 0;
		return Math.round((remaining / total) * 100);
	}

	function usageColor(remainingPercent: number): string {
		if (remainingPercent >= 70) {
			return 'bg-pink-300 dark:bg-purple-500';
		}
		if (remainingPercent >= 40) {
			return 'bg-orange-400 dark:bg-amber-600'; // Using red-400 for light mode, different from red-300
		}
		return 'bg-red-400 dark:bg-red-600';
	}

	function applyLeave() {
		goto('/employee/leave/apply');
	}

	onMount(async () => {
		try {
			// Fetch full LeaveBalanceItem from backend
			leaveBalances = await getEmpLeaveBalance();
		} catch (err) {
			console.error(err);
			error = 'Failed to load leave balances';
		} finally {
			loading = false;
		}
	});
</script>

<GlassCard className="w-full">
	<div class="flex items-center justify-between mb-3 lg:mb-2">
		<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Leave Balance</h2>
		<button
			on:click={applyLeave}
			class="text-sm font-medium px-3 py-1.5 rounded-2xl border border-white dark:border-gray-500 bg-gradient-to-br
				from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d] text-gray-100 dark:text-white
				hover:opacity-80 transition"
		>
			+ Apply Leave
		</button>
	</div>

	{#if loading}
		<div class="text-gray-500 dark:text-gray-400">Loading leave balances...</div>
	{:else if error}
		<div class="text-red-500">{error}</div>
	{:else}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
			{#each leaveBalances as leave}
				{@const remainPercent = percentageRemaining(leave.totalEntitlement, leave.remaining)}
				<GlassCard
					className="bg-white/20 dark:bg-gray-900/20 border-white/80 dark:border-white/20"
				>
					<div class="flex justify-between items-center mb-2">
						<h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">
							{leave.leaveTypeName}
						</h3>
						<span class="text-xs text-gray-500 dark:text-gray-200">{100 - remainPercent}% used</span
						>
					</div>

					<div class="w-full bg-gray-300 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
						<div
							class="h-2 rounded-full transition-all duration-300 {usageColor(remainPercent)}"
							style="width: {remainPercent}%"
						></div>
					</div>

					<div
						class="flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-400"
					>
						<span class="font-semibold">{leave.remaining} days left</span>
						<span class="text-gray-400 dark:text-gray-400">{leave.totalEntitlement} total</span>
					</div>
				</GlassCard>
			{/each}
		</div>
	{/if}
</GlassCard>