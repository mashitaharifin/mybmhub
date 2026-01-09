<script lang="ts">
  // Expects a group prop:
  // { employeeName: string, employeeID?: number, items: LeaveBalanceItem[] }
  import * as Table from '$lib/components/ui/table';

  export let group: { employeeName: string; employeeID?: number; items: any[] };

  function percentageRemaining(total: number, remaining: number): number {
    if (!total || total === 0) return 0;
    const p = (Number(remaining) / Number(total)) * 100;
    return Math.max(0, Math.min(100, Math.round(p)));
  }

  function usageColorClass(remainingPercent: number) {
    if (remainingPercent >= 70) return 'bg-pink-300 dark:bg-purple-500';
    if (remainingPercent >= 40) return 'bg-orange-400 dark:bg-amber-600';
    return 'bg-red-400 dark:bg-red-600';
  }

  function toOneDecimal(v: any) {
    const n = Number(v ?? 0);
    return n.toFixed(1);
  }
</script>

<div class="overflow-x-auto">
  <Table.Root>
    <Table.Header>
      <Table.Row>
        <Table.Head class="w-[40px]">#</Table.Head>
        <Table.Head>Leave Type</Table.Head>
        <Table.Head class="text-center">Total</Table.Head>
        <Table.Head class="text-center">Taken</Table.Head>
        <Table.Head class="text-center">Remaining</Table.Head>
        <Table.Head class="text-center w-[240px]">Usage</Table.Head>
      </Table.Row>
    </Table.Header>

    <Table.Body>
      {#if group.items && group.items.length}
        {#each group.items as leave, idx}
          {@const remainPercent = percentageRemaining(leave.totalEntitlement, leave.remaining)}
          <Table.Row>
            <Table.Cell>{idx + 1}</Table.Cell>
            <Table.Cell>
              <div class="text-sm font-medium text-gray-800 dark:text-gray-100">{leave.leaveTypeName}</div>
            </Table.Cell>
            <Table.Cell class="text-center">{leave.totalEntitlement}</Table.Cell>
            <Table.Cell class="text-center">{toOneDecimal(leave.daysTaken)}</Table.Cell>
            <Table.Cell class="text-center">{toOneDecimal(leave.remaining)}</Table.Cell>
            <Table.Cell>
              <div class="flex items-center space-x-2">
                <div class="flex-grow bg-gray-200 dark:bg-gray-700 h-2.5 rounded-full overflow-hidden">
                  <div
                    class={`h-2.5 rounded-full ${usageColorClass(remainPercent)} transition-all duration-500`}
                    style="width: {remainPercent}%"
                  ></div>
                </div>
                <span class="text-xs text-gray-600 dark:text-gray-400 w-[48px] text-right">
                  {100 - remainPercent}% used
                </span>
              </div>
            </Table.Cell>
          </Table.Row>
        {/each}
      {:else}
        <Table.Row>
          <Table.Cell colspan="6" class="text-center text-gray-500 h-16">
            No leave types for this employee.
          </Table.Cell>
        </Table.Row>
      {/if}
    </Table.Body>
  </Table.Root>
</div>
