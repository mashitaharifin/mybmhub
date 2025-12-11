<script lang="ts">
	import type { LeaveBalanceItem } from '$lib/types/empDashboard';

	export let leaveBalances: LeaveBalanceItem[] = [];

	function percentageRemaining(total: number, remaining: number): number {
		if (total === 0) return 0;

		return Math.round((remaining / total) * 100);
	}

	function usageColor(remainingPercent: number): string {
		if (remainingPercent >= 70) return 'text-green-500'; // High remaining (Good)
		if (remainingPercent >= 40) return 'text-yellow-500'; // Medium remaining (Caution)
		return 'text-red-500'; // Low remaining (Urgent)
	}

	const CIRCLE_RADIUS = 40; // This controls the size of the ring
	const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

	function getProgressOffset(remainingPercent: number): number {
		return CIRCUMFERENCE - (remainingPercent / 100) * CIRCUMFERENCE;
	}
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
	{#each leaveBalances as leave}
		{@const remainPercent = percentageRemaining(leave.totalEntitlement, leave.remaining)}
		{@const colorClass = usageColor(remainPercent)}

		<div
			class="flex flex-col bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-100 dark:border-gray-700 hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] min-h-[180px]"
		>
			<h3 class="font-semibold text-xl mb-1 text-gray-900 dark:text-gray-50">
				{leave.leaveTypeName}
			</h3>
			<span class="text-sm text-gray-500 dark:text-gray-400 mb-6"
				>Total Entitlement: {leave.totalEntitlement} days</span
			>

			<div class="flex items-center justify-between mb-6">
				<div class="relative w-24 h-24">
					<svg class="w-full h-full transform -rotate-90">
						<circle
							class="text-gray-200 dark:text-gray-700"
							stroke-width="8"
							stroke="currentColor"
							fill="transparent"
							r={CIRCLE_RADIUS}
							cx="50%"
							cy="50%"
						/>
						<circle
							class="transition-all duration-1000 {colorClass}"
							stroke-width="8"
							stroke-linecap="round"
							stroke="currentColor"
							fill="transparent"
							r={CIRCLE_RADIUS}
							cx="50%"
							cy="50%"
							stroke-dasharray={CIRCUMFERENCE}
							style="stroke-dashoffset: {getProgressOffset(remainPercent)}"
						/>
					</svg>
					<div
						class="absolute inset-0 flex items-center justify-center text-lg font-semibold {colorClass}"
					>
						{remainPercent}%
					</div>
				</div>

				<div class="flex flex-col items-end">
					<span class="text-5xl font-bold text-gray-800 dark:text-white leading-none"
						>{leave.remaining}</span
					>
					<span class="text-lg font-medium text-gray-600 dark:text-gray-300 mt-1">Days Left</span>
				</div>
			</div>

		</div>
	{/each}
</div>
