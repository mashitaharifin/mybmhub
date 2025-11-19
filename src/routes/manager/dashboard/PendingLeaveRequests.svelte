<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { getPendingLeaves } from './services/dashboardAPI';
  import type { LeaveRequest } from '$lib/types/dashboard';

  let requests: LeaveRequest[] = [];
  let loading = true;
  let error: string | null = null;

  const statusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500 text-white';
      case 'Approved': return 'bg-green-500 text-white';
      case 'Rejected': return 'bg-red-500 text-white';
      default: return 'bg-gray-400 text-white';
    }
  };

  let interval: ReturnType<typeof setInterval>;

  async function fetchRequests() {
    loading = true;
    error = null;
    try {
      const data = await getPendingLeaves();
      requests = data.length ? data : [];
    } catch (err) {
      console.error('Failed to load leave requests:', err);
      error = 'Unable to fetch data';
      requests = [];
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    fetchRequests();
    interval = setInterval(fetchRequests, 5000); // auto-refresh every 5s
  });

  onDestroy(() => clearInterval(interval));
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 transition-colors hover:bg-red-50 dark:hover:bg-red-800/20">
  <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">Pending Leave Requests</h2>

  {#if loading}
    <div class="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
  {:else if error}
    <div class="text-sm text-red-500">{error}</div>
  {:else if requests.length === 0}
    <div class="text-sm text-gray-500 dark:text-gray-400">No pending leave requests.</div>
  {:else}
    <ul class="space-y-2 max-h-72 overflow-y-auto">
      {#each requests as r}
        <li class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition">
          <div>
            <div class="font-medium text-gray-800 dark:text-gray-200">{r.employee}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {r.type} – {r.days} day(s) • {r.date}
            </div>
          </div>
          <div class={`text-xs font-semibold px-2 py-1 rounded ${statusColor(r.status)}`}>{r.status}</div>
        </li>
      {/each}
    </ul>
  {/if}
</div>
