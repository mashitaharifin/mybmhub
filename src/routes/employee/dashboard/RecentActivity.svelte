<script lang="ts">
  import { onMount } from 'svelte';
  import { Clock11, NotebookText, Bell } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { getEmpActivity } from './services/dashboardAPI';
  import type { EmployeeActivity } from '$lib/types/empDashboard';

  // API item shape (what empActivity/+server.ts returns)
  type ApiActivity = {
    type: 'audit' | 'leave' | 'attendance';
    id: number;
    title: string;
    details?: string | null;
    timestamp: string; // ISO
  };

  let activities: EmployeeActivity[] = [];
  let loading = true;
  let error: string | null = null;

  const getIcon = (action: string) => {
    switch (action) {
      case 'Attendance':
        return Clock11;
      case 'Leave':
        return NotebookText;
      default:
        return Bell;
    }
  };

  function viewDetails() {
    goto('/employee/recent-activity');
  }

  onMount(async () => {
    try {
      // fetch raw API activities (backend returns unified activity shape)
      const raw = await getEmpActivity() as unknown as ApiActivity[]; // cast to ApiActivity[]

      // We'll map API items -> EmployeeActivity and dedupe.
      const seen = new Set<string>();
      const out: EmployeeActivity[] = [];

      for (const a of raw) {
        // prefer only punch data for attendance: backend attendance details include "In:" and/or "Out:"
        if (a.type === 'attendance') {
          const details = a.details ?? '';
          // include only if it looks like punch data (contains In: or Out:)
          if (!/In:|Out:/i.test(details)) {
            continue; // skip non-punch attendance lines
          }
        }

        // Normalize frontend fields
        const action =
          a.type === 'attendance' ? 'Attendance' : a.type === 'leave' ? 'Leave' : 'Notification';

        // Compose a display details string. For attendance we show details (In/Out + hours).
        const detailsText = a.details ?? '';

        // create a dedupe key so we don't show the same event twice (e.g., an audit log + attendance record)
        const key = `${a.type}:${a.title}:${detailsText}:${a.timestamp}`;

        if (seen.has(key)) continue;
        seen.add(key);

        out.push({
          id: a.id,
          action,
          details: detailsText,
          date: new Date(a.timestamp).toLocaleString()
        });
      }

      // sort by date desc (just in case)
      activities = out.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));
    } catch (err) {
      console.error(err);
      error = 'Failed to load recent activity';
    } finally {
      loading = false;
    }
  });
</script>

<div
  class="bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-800/20 rounded-2xl shadow-md p-5 flex flex-col"
>
  <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">Recent Activity</h2>

  {#if loading}
    <div class="text-gray-500 dark:text-gray-400">Loading activities...</div>
  {:else if error}
    <div class="text-red-500">{error}</div>
  {:else if activities.length === 0}
    <div class="text-gray-500 dark:text-gray-400">No recent activity</div>
  {:else}
    {#each activities as activity}
      <div class="flex items-center gap-3 p-2 border-b border-gray-100 dark:border-gray-800 last:border-none">
        <div class="text-red-600 dark:text-red-500">
          <svelte:component this={getIcon(activity.action)} size="20" />
        </div>

        <div class="flex-1 text-sm text-gray-700 dark:text-gray-300">
          {#if activity.action === 'Attendance'}
            <!-- attendance: show details (In/Out) first, fallback to details-->
            <div class="font-medium">{activity.details}</div>
          {:else}
            <div class="font-medium">{activity.details}</div>
          {/if}
        </div>

        <div class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{activity.date}</div>
      </div>
    {/each}
  {/if}

  <!-- View Details Link -->
  <div class="mt-4 text-center">
    <a
      href="/employee/recent-activity"
      class="text-xs font-medium text-gray-600 dark:text-gray-400 hover:italic"
      on:click|preventDefault={viewDetails}
    >
      View detailed activity →
    </a>
  </div>
</div>
