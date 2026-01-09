<script lang="ts">
  import { onMount } from 'svelte';
  import { Clock11, NotebookText, Bell, ChevronRight } from 'lucide-svelte';
  import { goto } from '$app/navigation';
  import { getEmpActivity } from './services/dashboardAPI';
  import type { EmployeeActivity } from '$lib/types/empDashboard';
  import GlassCard from '$lib/components/ui/GlassCard.svelte'; 

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

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'Attendance':
        return 'text-orange-600 dark:text-orange-500';
      case 'Leave':
        return 'text-blue-600 dark:text-blue-500';
      default:
        return 'text-purple-600 dark:text-purple-500';
    }
  };

  function viewAllActivities() {
    goto('/employee/recent-activity');
  }

  // Show only first 5 activities in the card
  const displayedActivities = () => activities.slice(0, 5);

  // Format time similar to manager's version
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

  // Truncate long text for better display
  function truncateText(text: string, maxLength: number = 60): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  onMount(async () => {
    try {
      // fetch raw API activities (backend returns unified activity shape)
      const raw = await getEmpActivity() as unknown as ApiActivity[]; // cast to ApiActivity[]

      // We'll map API items -> EmployeeActivity and dedupe.
      const seen = new Set<string>();
      const out: EmployeeActivity[] = [];

      for (const a of raw) {
        

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
          date: a.timestamp // Keep as ISO string for formatting
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

<GlassCard className="w-full" hoverEffect={true}>
  <div class="flex justify-between items-center mb-3 lg:mb-2">
    <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Recent Activity</h2>
    <div class="text-xs text-gray-300 dark:text-gray-400">
      {activities.length > 0 ? `${activities.length} showing` : 'No activities'}
    </div>
  </div>

  {#if loading}
    <div class="flex-1 flex items-center justify-center py-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">Loading activities...</div>
    </div>
  {:else if error}
    <div class="flex-1 flex items-center justify-center py-4">
      <div class="text-sm text-red-500">{error}</div>
    </div>
  {:else if activities.length === 0}
    <div class="flex-1 flex items-center justify-center py-4">
      <div class="text-sm text-gray-500 dark:text-gray-400">No recent activity</div>
    </div>
  {:else}
  <div class="flex-1 space-y-3 max-h-[300px] overflow-y-auto pr-2">
    {#each displayedActivities() as activity}
      <div
        class="flex items-start gap-3 p-3 rounded-lg hover:bg-white/20 dark:hover:bg-white/5 transition-colors"
      >
        <div class={`mt-1 ${getActivityColor(activity.action)}`}>
          <svelte:component this={getIcon(activity.action)} size="18" />
        </div>

        <div class="flex-1 min-w-0">
          <!-- Activity details and time on the same line -->
          <div class="flex items-start justify-between mb-1 gap-2">
            <div class="text-xs text-gray-600 dark:text-gray-300 flex-1">
              {truncateText(activity.details, 60)}
            </div>
            <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap flex-shrink-0">
              {formatTime(activity.date)}
            </span>
          </div>

          <div class="mt-1">
            <span
              class="inline-block px-2 py-0.5 text-[10px] font-medium rounded-full
              {activity.action === 'Attendance'
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                : activity.action === 'Leave'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'}"
            >
              {activity.action}
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

  <!-- View All Activities Link -->
  {#if !loading && activities.length > 5}
    <div class="pt-4 mt-4 border-t border-white/30 dark:border-white/10">
      <button
        on:click={viewAllActivities}
        class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
      >
        View More Activities ({activities.length - 5} more)
        <ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  {:else if !loading && activities.length > 0}
    <div class="pt-4 mt-4 border-t border-white/30 dark:border-white/10">
      <button
        on:click={viewAllActivities}
        class="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:italic transition-all group"
      >
        View All Activities
        <ChevronRight size={16} class="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  {/if}
</GlassCard>