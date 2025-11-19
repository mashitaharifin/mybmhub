<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { IdCardLanyard } from 'lucide-svelte';
  import { getManagerProfile } from './services/dashboardAPI';
  import type { ManagerProfile } from '$lib/types/dashboard';

  const dispatch = createEventDispatcher();

  let employee: ManagerProfile | null = null;
  let loading = true;
  let error: string | null = null;

  // Utility: initials for fallback avatar
  const getInitials = (name: string) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '';

  onMount(async () => {
    try {
      employee = await getManagerProfile();
    } catch (err) {
      console.error('Failed to load manager profile:', err);
      error = 'Unable to load manager data';
    } finally {
      loading = false;
    }
  });
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex items-center gap-6 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-800/20">
  {#if loading}
    <div class="text-sm text-gray-500 dark:text-gray-400 mx-auto">Loading profile...</div>
  {:else if error}
    <div class="text-sm text-red-500 mx-auto">{error}</div>
  {:else if employee}
    <!-- Avatar -->
    <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 text-red-600 dark:text-red-700 font-semibold text-xl flex items-center justify-center flex-shrink-0">
      {#if employee.avatarUrl}
        <img src="{employee.avatarUrl}" alt="Avatar" class="w-full h-full rounded-full object-cover"/>
      {:else}
        {getInitials(employee.name)}
      {/if}
    </div>

    <!-- Manager Info -->
    <div class="flex-1 text-gray-800 dark:text-gray-200">
      <div class="font-semibold text-lg">{employee.name}</div>
      <div class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{employee.role}</div>
      <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{employee.jobTitle}</div>
    </div>

    <!-- Action: View Profile Icon -->
    <div class="flex flex-col gap-2">
      <a href="/profile/" title="View Profile Details" class="text-red-600 hover:text-red-500 transition-colors">
        <IdCardLanyard size="28"/>
      </a>
    </div>
  {/if}
</div>
