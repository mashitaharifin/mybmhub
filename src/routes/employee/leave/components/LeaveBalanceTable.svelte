<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import type { LeaveBalanceItem } from '$lib/types/empDashboard';
	import { goto } from '$app/navigation';
	import { History, CalendarPlus } from 'lucide-svelte';

	export let leaveBalances: LeaveBalanceItem[] = [];

	function percentageRemaining(total: number, remaining: number): number {
		if (total === 0) return 0;
		return Math.round((remaining / total) * 100);
	}

	function usageColor(remainingPercent: number): string {
		if (remainingPercent >= 70) return 'bg-green-500';
		if (remainingPercent >= 40) return 'bg-yellow-500';
		return 'bg-red-500';
	}

	function viewHistory(leaveTypeID: number) {
		goto('/employee/leave/apply');
	}

	function applyLeave() {
		goto('/employee/leave/apply');
	}
</script>

<div class="overflow-x-auto">
	<Table.Root>
		<Table.Header>
			<Table.Row>
				<Table.Head>#</Table.Head>
				<Table.Head>Leave Type</Table.Head>
				<Table.Head class="text-center">Total</Table.Head>
				<Table.Head class="text-center">Taken</Table.Head>
				<Table.Head class="text-center">Remaining</Table.Head>
				<Table.Head class="w-[280px] text-center">Usage</Table.Head>
				<Table.Head class="text-right">Actions</Table.Head>
			</Table.Row>
		</Table.Header>
		<Table.Body>
			{#if leaveBalances.length}
				{#each leaveBalances as leave, i}
					{@const remainPercent = percentageRemaining(leave.totalEntitlement, leave.remaining)}
					<Table.Row>
						<Table.Cell>{i + 1}</Table.Cell>
						<Table.Cell>{leave.leaveTypeName}</Table.Cell>
						<Table.Cell class="text-center">{leave.totalEntitlement}</Table.Cell>
						<Table.Cell class="text-center">{leave.daysTaken}</Table.Cell>
						<Table.Cell class="text-center">{leave.remaining}</Table.Cell>

						<!-- Usage Progress Bar from Version 1 -->
						<Table.Cell>
							<div class="flex items-center space-x-2">
								<div
									class="flex-grow w-full bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden"
								>
									<div
										class="h-2.5 rounded-full {usageColor(
											remainPercent
										)} transition-all duration-500 shadow-inner"
										style="width: {remainPercent}%"
									></div>
								</div>
								<span
									class="text-xs font-medium text-gray-600 dark:text-gray-400 w-[40px] text-right"
								>
									{100 - remainPercent}% used
								</span>
							</div>
						</Table.Cell>

						<!-- Actions from Version 1 -->
						<Table.Cell class="flex gap-4 justify-end">
							<!-- View History Link -->
							<a
								href="/employee/leave/apply"
								on:click|preventDefault={() => viewHistory(leave.leaveTypeID)}
								class="flex items-center text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-600 transition-colors group"
							>
								<History class="w-4 h-4 mr-1 group-hover:text-red-500 transition-colors" />
								History
							</a>

							<!-- Apply Leave Button -->
							<button
								on:click={applyLeave}
								class="text-sm font-medium px-3 py-1.5 rounded-2xl border text-red-600 bg-white hover:bg-red-500 hover:text-white dark:bg-gray-700 dark:text-white dark:hover:bg-red-800 transition"
							>
								+ Apply Leave
							</button>
						</Table.Cell>
					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan="7" class="text-center text-gray-500 h-16">
						No leave balances found.
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>
