<script lang="ts">
  import * as Card from '$lib/components/ui/card';
  import { onMount } from 'svelte';
  import { getEmpAttendanceSnapshot } from './services/dashboardAPI';
  import type { AttendanceSnapshot, AttendanceDay } from '$lib/types/empDashboard';

  // --- reactive state ---
  let data: AttendanceSnapshot = {
    totalDaysInWindow: 0,
    totalWorkedHours: 0,
    averageWorkedHours: 0,
    chart: []
  };

  let weekdays: AttendanceDay[] = [];
  let averageHours = 0;
  let loading = true;
  let error: string | null = null;

  const maxHours = 10;
  const chartHeight = 180;
  const barWidth = 24;
  const gap = 12;

  function getBarHeight(hours: number) {
    return (hours / maxHours) * chartHeight;
  }

  function getBarX(index: number) {
    return index * (barWidth + gap);
  }

  function getBarY(hours: number) {
    return chartHeight - getBarHeight(hours);
  }

  onMount(async () => {
    try {
      const snapshot = await getEmpAttendanceSnapshot();
      data = snapshot;

      // Filter weekdays (Mon–Fri)
      weekdays = data.chart.filter(d => {
        if (!d.date) return false;
        const day = new Date(d.date).getDay();
        return day !== 0 && day !== 6; // exclude Sunday(0) & Saturday(6)
      });

      // Calculate average hours
      averageHours = weekdays.length
        ? weekdays.reduce((acc, item) => acc + item.workedHours, 0) / weekdays.length
        : 0;

    } catch (err) {
      console.error(err);
      error = 'Failed to load attendance snapshot';
    } finally {
      loading = false;
    }
  });
</script>

<Card.Root class="rounded-2xl shadow-md bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-800/20">
  <Card.Header>
    <Card.Title class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-1">
      Attendance Snapshot
    </Card.Title>
  </Card.Header>

  <Card.Content>
    {#if loading}
      <div class="text-gray-500 dark:text-gray-400">Loading attendance snapshot...</div>
    {:else if error}
      <div class="text-red-500">{error}</div>
    {:else}
      <div class="relative w-full flex flex-col items-center">
        <svg width="{weekdays.length * (barWidth + gap)}" height="{chartHeight + 50}" class="mx-auto">
          <!-- Y-axis label -->
          <text x="-30" y="{chartHeight / 2}" transform="rotate(-90 -30,{chartHeight / 2})" text-anchor="middle" class="text-xs fill-gray-500 dark:fill-gray-400">
            Hours
          </text>

          <!-- Grid lines & tick labels -->
          {#each [0, 3, 6, 9] as tick}
            <line
              x1="0"
              y1="{chartHeight - (tick / maxHours) * chartHeight}"
              x2="{weekdays.length * (barWidth + gap) - gap}"
              y2="{chartHeight - (tick / maxHours) * chartHeight}"
              stroke="#e5e7eb"
              stroke-dasharray="3"
            />
            <text
              x="-8"
              y="{chartHeight - (tick / maxHours) * chartHeight + 3}"
              text-anchor="end"
              class="text-xs fill-gray-500 dark:fill-gray-400"
            >
              {tick}
            </text>
          {/each}

          <!-- Bars -->
          {#each weekdays as item, index}
            <g class="cursor-pointer group">
              <rect
                x="{getBarX(index)}"
                y="{getBarY(item.workedHours)}"
                width="{barWidth}"
                height="{getBarHeight(item.workedHours)}"
                fill="#dc2626"
                stroke="#dc2626"
                stroke-width="0.5"
                rx="6"
                class="transition-all duration-200 group-hover:opacity-60"
              />
              <title>{item.workedHours} hours</title>

              {#if item.workedHours > 0}
                <text
                  x="{getBarX(index) + barWidth / 2}"
                  y="{getBarY(item.workedHours) - 6}"
                  text-anchor="middle"
                  class="text-xs fill-gray-800 dark:fill-gray-200"
                >
                  {item.workedHours}h
                </text>
              {/if}

              <!-- Day labels -->
              <text
                x="{getBarX(index) + barWidth / 2}"
                y="{chartHeight + 15}"
                text-anchor="middle"
                class="text-xs fill-gray-600 dark:fill-gray-300"
              >
                {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
              </text>
            </g>
          {/each}

          <!-- X-axis label -->
          <text
            x="{(weekdays.length * (barWidth + gap) - gap) / 2}"
            y="{chartHeight + 35}"
            text-anchor="middle"
            class="text-xs fill-gray-500 dark:fill-gray-400"
          >
            Day
          </text>
        </svg>

        <!-- Average Hours -->
        <div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Average weekday hours: <span class="font-semibold">{averageHours.toFixed(1)}h</span>
        </div>
      </div>
    {/if}
  </Card.Content>
</Card.Root>
