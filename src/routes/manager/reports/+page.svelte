<script lang="ts">
	import AttendanceReport from './AttendanceReport.svelte';
	import LeaveReport from './LeaveReport.svelte';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { onDestroy } from 'svelte';

	// ALERT HANDLING
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => t && clearTimeout(t));

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 9000);
	}

	// Handle alerts from child components
	function handleChildAlert(e: CustomEvent) {
		showAlert(e.detail.message, e.detail.variant);
	}
</script>

<svelte:head>
	<title>Reports & Analytics – MyBM Hub</title>
	<meta
		name="description"
		content="Monitor your team's attendance & leave reports with visual analytics."
	/>
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="/manager/dashboard">Dashboard</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>Reports & Analytics</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>Reports & Analytics</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Monitor your team's attendance & leave reports with interactive visual analytics.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content >
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success'
						? 'Success'
						: alertVariant === 'error'
						? 'Error'
						: 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<section
			class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
		>
			<div
				class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
			>
				<div class="flex items-center">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Attendance Report</h2>
				</div>
			</div>
			<div class="p-6">
				<AttendanceReport on:alert={handleChildAlert} />
			</div>
		</section>
        <br/>

		<section
			class="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
		>
			<div
				class="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900"
			>
				<div class="flex items-center">
					<h2 class="text-xl font-bold text-gray-900 dark:text-white">Leave Report</h2>
				</div>
			</div>
			<div class="p-6">
				<LeaveReport on:alert={handleChildAlert} />
			</div>
		</section>
	</Card.Content>
</Card.Root>