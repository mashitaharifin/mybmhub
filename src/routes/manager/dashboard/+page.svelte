<script lang="ts">
	import DashboardHeader from './DashboardHeader.svelte';
	import ClockWidget from './ClockWidget.svelte';
	import QuickProfileCard from './QuickProfileCard.svelte';
	import PendingLeaveRequests from './PendingLeaveRequests.svelte';
	import TeamRecentActivities from './TeamRecentActivities.svelte';
	import TeamMetricsSnapshot from './TeamMetricsSnapshot.svelte';
	import DashboardCalendar from './DashboardCalendar.svelte';
</script>

<svelte:head>
	<title>Manager Dashboard – MyBM Hub</title>
	<meta
		name="description"
		content="Monitor your team’s attendance, leaves, and performance insights at a 
glance."
	/>
</svelte:head>

<div class="min-h-screen p-6 lg:p-8 space-y-5 lg:space-y-5 dashboard-compact">
	<DashboardHeader />

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<ClockWidget />
		<QuickProfileCard />
	</div>

    <div>
		<TeamMetricsSnapshot />
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<PendingLeaveRequests />
		<TeamRecentActivities />
		<DashboardCalendar />
	</div>
</div>
