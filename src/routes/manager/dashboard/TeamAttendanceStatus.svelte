<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { getTeamAttendance } from './services/dashboardAPI';
	import type { TeamMember } from '$lib/types/dashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let team: TeamMember[] = [];
	let loading = true;
	let error: string | null = null;

	const statusColor = (status: string) => {
		switch (status) {
			case 'Present':
				return 'bg-green-500';
			case 'Late':
				return 'bg-yellow-500';
			case 'Absent':
				return 'bg-red-500';
			case 'On Leave':
				return 'bg-blue-500';
			default:
				return 'bg-gray-400';
		}
	};

	let interval: ReturnType<typeof setInterval>;

	// Helper to determine status from attendance data
	const getAttendanceStatus = (member: TeamMember): 'Present' | 'Late' | 'Absent' | 'On Leave' => {
		if (member.checkInTime && member.checkOutTime) {
			return 'Present';
		} else if (member.checkInTime && !member.checkOutTime) {
			return 'Present'; // Or 'Late' based on check-in time logic
		}
		return 'Absent';
	};

	// Helper to get display name
	const getDisplayName = (member: TeamMember): string => {
		return member.employeeName || member.name || 'Unknown';
	};

	// Helper to get hours worked
	const getHoursWorked = (member: TeamMember): string => {
		return member.workedHours || member.hoursWorked || '0';
	};

	async function fetchAttendance() {
		loading = true;
		error = null;
		try {
			const data = await getTeamAttendance();
			team = data.length ? data : [];
		} catch (err) {
			console.error('Failed to fetch team attendance:', err);
			error = 'Unable to fetch data';
			team = [];
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchAttendance();
		interval = setInterval(fetchAttendance, 10000);
	});

	onDestroy(() => clearInterval(interval));
</script>

<GlassCard>
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
		Team Attendance Status
	</h2>

	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
	{:else if error}
		<div class="text-sm text-red-500">{error}</div>
	{:else if team.length === 0}
		<div class="text-sm text-gray-500 dark:text-gray-400">No attendance records found.</div>
	{:else}
		<ul class="space-y-2 max-h-72 lg:max-h-64 overflow-y-auto">
			{#each team as m}
				<li
					class="flex justify-between items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
				>
					<div class="text-gray-800 dark:text-gray-200">{getDisplayName(m)}</div>
					<div class="flex items-center gap-2">
						<span class={`w-3 h-3 rounded-full ${statusColor(getAttendanceStatus(m))}`}></span>
						<span class="text-xs text-gray-500 dark:text-gray-400">
							{getAttendanceStatus(m)} — {getHoursWorked(m)}h
						</span>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</GlassCard>


