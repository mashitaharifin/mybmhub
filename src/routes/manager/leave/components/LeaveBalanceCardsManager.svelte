<script lang="ts">
  // This component expects a "group" prop when used in manager page:
  // { employeeName: string, employeeID?: number, items: LeaveBalanceItem[] }
  export let group: { employeeName: string; employeeID?: number; items: any[] };

  const CIRCLE_RADIUS = 36;
  const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

  function percentageRemaining(total: number, remaining: number): number {
    if (!total || total === 0) return 0;
    const p = (Number(remaining) / Number(total)) * 100;
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  function usageColorClass(remainingPercent: number) {
    if (remainingPercent >= 70) return 'text-green-500 dark:text-green-400';
    if (remainingPercent >= 40) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-red-500 dark:text-red-400';
  }

  function getProgressOffset(remainingPercent: number) {
    return CIRCUMFERENCE - (remainingPercent / 100) * CIRCUMFERENCE;
  }

  function toOneDecimal(v: any) {
    const n = Number(v ?? 0);
    return n.toFixed(1);
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
  {#each group.items as leave (leave.leaveTypeID)}
    {@const remainPercent = percentageRemaining(leave.totalEntitlement, leave.remaining)}
    {@const colorClass = usageColorClass(remainPercent)}
    <div class="flex flex-col bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 shadow-sm border dark:border-gray-700">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-sm font-semibold text-gray-800 dark:text-gray-100">{leave.leaveTypeName}</div>
          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Total: {leave.totalEntitlement} days</div>
        </div>
      </div>

      <div class="flex items-center justify-between mt-4">
        <!-- Circular progress -->
        <div class="relative w-20 h-20">
          <svg class="w-full h-full transform -rotate-90">
            <circle
              r={CIRCLE_RADIUS}
              cx="50%"
              cy="50%"
              stroke="currentColor"
              stroke-width="6"
              fill="transparent"
              class="text-gray-200 dark:text-gray-700"
            />
            <circle
              r={CIRCLE_RADIUS}
              cx="50%"
              cy="50%"
              stroke="currentColor"
              stroke-width="6"
              stroke-linecap="round"
              fill="transparent"
              class={colorClass}
              stroke-dasharray={CIRCUMFERENCE}
              style="stroke-dashoffset: {getProgressOffset(remainPercent)}"
            />
          </svg>

          <div class="absolute inset-0 flex items-center justify-center text-sm font-semibold {colorClass}">
            {remainPercent}%
          </div>
        </div>

        <div class="flex flex-col items-end">
          <div class="text-4xl font-bold text-gray-800 dark:text-gray-100 leading-none">
            {toOneDecimal(leave.remaining)}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-300 mt-1">Days left</div>

          <div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Taken: {toOneDecimal(leave.daysTaken)} days
          </div>
        </div>
      </div>
    </div>
  {/each}
</div>
