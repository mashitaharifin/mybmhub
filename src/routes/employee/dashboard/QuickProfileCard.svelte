<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { IdCardLanyard } from 'lucide-svelte';
	import { getEmployeeProfile } from './services/dashboardAPI';
	import type { EmployeeProfile } from '$lib/types/empDashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

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
			.map((n) => n[0])
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

<GlassCard className="w-full">
	<!-- Title -->
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 lg:mb-2">Profile Card</h2>

	<!-- Card Content -->
	<div class="flex items-center gap-6">
		<!-- Avatar with gradient border -->
		<div class="w-18 h-18 p-1 rounded-full bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d] flex items-center justify-center">
			<div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 text-red-600 dark:text-purple-400 flex items-center justify-center">
				{#if loading}
					<span>...</span>
				{:else if employee.avatarUrl}
					<img
						src={employee.avatarUrl}
						alt="Avatar"
						class="w-full h-full rounded-full object-cover"
					/>
				{:else}
					{getInitials(employee.name)}
				{/if}
			</div>
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
				<div class="text-sm text-gray-500 dark:text-gray-200 mt-0.5">{employee.role}</div>
				<div class="text-xs text-gray-400 dark:text-gray-300 mt-0.5">{employee.jobTitle}</div>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex flex-col gap-2">
			<a
				href="/profile/"
				title="View Profile Details"
				class="text-red-600 dark:text-gray-400 hover:text-red-500 hover:dark:text-purple-600 transition-colors"
			>
				<IdCardLanyard size="28" />
			</a>
		</div>
	</div>
</GlassCard>
