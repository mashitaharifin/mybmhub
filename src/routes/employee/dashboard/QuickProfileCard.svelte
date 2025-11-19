<script lang="ts">
  import { onMount } from 'svelte';
  import { createEventDispatcher } from 'svelte';
  import { IdCardLanyard } from 'lucide-svelte';
  import { getEmployeeProfile } from './services/dashboardAPI';
  import type { EmployeeProfile } from '$lib/types/empDashboard';

  const dispatch = createEventDispatcher();

  let employee: EmployeeProfile = {
    id: '',
    name: 'Loading...',
    role: '',
    jobTitle: '',
    avatarUrl: ''
  };

  let loading = true;
  let error: string | null = null;

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

  onMount(async () => {
    try {
      const data = await getEmployeeProfile();
      employee = data;
    } catch (err) {
      console.error(err);
      error = 'Failed to load profile';
    } finally {
      loading = false;
    }
  });
</script>

<div class="bg-white dark:bg-gray-800 rounded-2xl shadow-md p-5 flex items-center gap-6 transition-colors duration-200 hover:bg-red-50 dark:hover:bg-red-800/20">
  <!-- Avatar -->
  <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-900 text-red-600 dark:text-red-700 font-semibold text-xl flex items-center justify-center flex-shrink-0">
    {#if loading}
      <span>...</span>
    {:else if employee.avatarUrl}
      <img src="{employee.avatarUrl}" alt="Avatar" class="w-full h-full rounded-full object-cover"/>
    {:else}
      {getInitials(employee.name)}
    {/if}
  </div>

  <!-- Employee Info -->
  <div class="flex-1 text-gray-800 dark:text-gray-200">
    {#if loading}
      <div class="animate-pulse h-5 w-32 bg-gray-300 dark:bg-gray-700 rounded mb-1"></div>
      <div class="animate-pulse h-3 w-24 bg-gray-300 dark:bg-gray-700 rounded mb-1"></div>
      <div class="animate-pulse h-2 w-20 bg-gray-300 dark:bg-gray-700 rounded mb-1"></div>
      <div class="animate-pulse h-2 w-16 bg-gray-300 dark:bg-gray-700 rounded"></div>
    {:else if error}
      <div class="text-red-500 text-sm">{error}</div>
    {:else}
      <div class="font-semibold text-lg">{employee.name}</div>
      <div class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{employee.role}</div>
      <div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{employee.jobTitle}</div>
    {/if}
  </div>

  <!-- Actions: Icon -->
  <div class="flex flex-col gap-2">
    <a href="/profile/" title="View Profile Details" class="text-red-600 hover:text-red-500 transition-colors">
      <IdCardLanyard size="28"/>
    </a>
  </div>
</div>
