<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import type { LeaveBalanceItem } from '$lib/types/empDashboard';

	export let leaveBalances: LeaveBalanceItem[] = [];

	function percentageRemaining(total: number, remaining: number): number {
		if (total === 0) return 0;
		return Math.round((remaining / total) * 100);
	}

	function usageColor(remainingPercent: number): string {
		if (remainingPercent >= 70) return 'bg-pink-300 dark:bg-purple-500';
		if (remainingPercent >= 40) return 'bg-orange-400 dark:bg-amber-600';
		return 'bg-red-400 dark:bg-red-600';
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

					</Table.Row>
				{/each}
			{:else}
				<Table.Row>
					<Table.Cell colspan="6" class="text-center text-gray-500 h-16">
						No leave balances found.
					</Table.Cell>
				</Table.Row>
			{/if}
		</Table.Body>
	</Table.Root>
</div>
