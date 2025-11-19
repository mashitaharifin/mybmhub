<script lang="ts">
	import DashboardHeader from './DashboardHeader.svelte';
	import QuickProfileCard from './QuickProfileCard.svelte';
	import QuickAttendancePanel from './QuickAttendancePanel.svelte';
	import AttendanceSnapshot from './AttendanceSnapshot.svelte';
	import DashboardCalendar from './DashboardCalendar.svelte';
	import LeaveBalanceCards from './LeaveBalanceCards.svelte';
	import RecentActivity from './RecentActivity.svelte';

	import { onMount } from 'svelte';

	onMount(() => console.log('Dashboard page mounted'));
</script>

<svelte:head>
	<title>Employee Dashboard – MyBM Hub</title>
	<meta
		name="description"
		content="Personalized workspace to track attendance, leaves, and daily updates. "
	/>
</svelte:head>

<div class="min-h-screen p-8 space-y-6">
	<!-- Header with streak -->
	<DashboardHeader />

	<!-- Top Row: Profile + Quick Attendance -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<QuickAttendancePanel />
		<QuickProfileCard />
	</div>

	<!-- Middle Row: Snapshot + Calendar -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<AttendanceSnapshot />
		<DashboardCalendar />
		<RecentActivity />
	</div>

	<!-- Bottom Row: Leave Balance + Recent Activity -->
	<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
		<div class="lg:col-span-3">
			<LeaveBalanceCards />
		</div>
	</div>
</div>
