<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import type { LeaveBalanceItem } from '$lib/types/empDashboard';
  import { getEmpLeaveBalance } from './services/dashboardAPI';

  let leaveBalances: LeaveBalanceItem[] = [];
  let loading = true;
  let error: string | null = null;

  function percentageRemaining(total: number, remaining: number): number {
    if (total === 0) return 0;
    return Math.round((remaining / total) * 100);
  }

  function usageColor(remainingPercent: number): string {
    if (remainingPercent >= 70) return 'bg-green-300 dark:bg-green-500';
    if (remainingPercent >= 40) return 'bg-yellow-300 dark:bg-yellow-500';
    return 'bg-red-300 dark:bg-red-500';
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

<div class="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-800/20 rounded-2xl shadow p-5">
  <div class="flex items-center justify-between mb-4">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Leave Balance</h2>
    <button
      on:click={applyLeave}
      class="text-sm font-medium px-3 py-1.5 rounded-2xl border border-red-600 text-red-600 bg-white hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-red-800 transition"
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
        <div class="flex flex-col bg-gray-50 dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition">
          <div class="flex justify-between items-center mb-2">
            <h3 class="font-medium text-sm text-gray-700 dark:text-gray-300">{leave.leaveTypeName}</h3>
            <span class="text-xs text-gray-500">{100 - remainPercent}% used</span>
          </div>

          <div class="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
            <div
              class="h-2 rounded-full transition-all duration-300 {usageColor(remainPercent)}"
              style="width: {remainPercent}%"
            ></div>
          </div>

          <div class="flex justify-between items-center mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span class="font-semibold">{leave.remaining} days left</span>
            <span class="text-gray-400">/ {leave.totalEntitlement} total</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
