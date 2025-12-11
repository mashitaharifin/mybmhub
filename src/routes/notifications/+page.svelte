<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import Button from '$lib/components/ui/button.svelte';
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	export let data: PageData;

	// PAGINATION STATE
	let page = 1;
	const pageSize = 4; // Show 20 notifications per page

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

	// MARK ALL AS READ
	async function markAllRead() {
		try {
			const res = await fetch('/notifications/mark-all-read', {
				method: 'PATCH'
			});

			if (res.ok) {
				const result = await res.json();
				if (result.success) {
					// Update local state
					data.notifications = data.notifications.map((n: any) => ({
						...n,
						isRead: true
					}));
					showAlert('All notifications marked as read', 'success');
				} else {
					showAlert(result.message || 'Failed to mark all as read', 'error');
				}
			} else {
				showAlert('Failed to mark all as read', 'error');
			}
		} catch (error) {
			console.error('Error marking all as read:', error);
			showAlert('An error occurred', 'error');
		}
	}

	// MARK SINGLE NOTIFICATION AS READ
	async function markAsRead(notificationId: number) {
		try {
			const res = await fetch(`/notifications/${notificationId}/read`, {
				method: 'PATCH'
			});

			if (res.ok) {
				const result = await res.json();
				if (result.success) {
					// Update local state
					data.notifications = data.notifications.map((n: any) =>
						n.id === notificationId ? { ...n, isRead: true } : n
					);
					showAlert('Notification marked as read', 'success');
				}
			}
		} catch (error) {
			console.error('Error marking notification as read:', error);
		}
	}

	// PAGINATION CALCULATIONS
	$: total = data.notifications.length;
	$: totalPages = Math.ceil(total / pageSize);
	$: startIndex = (page - 1) * pageSize;
	$: endIndex = Math.min(page * pageSize, total);
	$: paginatedNotifications = data.notifications.slice(startIndex, endIndex);

	// CALCULATE COUNTS
	$: totalNotifications = data.notifications.length;
	$: unreadNotifications = data.notifications.filter((n: any) => !n.isRead).length;

	// PAGINATION FUNCTIONS
	function nextPage() {
		if (page < totalPages) {
			page++;
			// Scroll to top of notifications list
			const notificationsList = document.querySelector('.notifications-list');
			if (notificationsList) {
				notificationsList.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}

	function previousPage() {
		if (page > 1) {
			page--;
			// Scroll to top of notifications list
			const notificationsList = document.querySelector('.notifications-list');
			if (notificationsList) {
				notificationsList.scrollIntoView({ behavior: 'smooth' });
			}
		}
	}

	// Format date for display
	function formatDate(dateString: string | Date | null) {
		if (!dateString) return 'Recently';

		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays === 1) return 'Yesterday';
		if (diffDays < 7) return `${diffDays}d ago`;

		return date.toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: diffDays < 365 ? undefined : 'numeric'
		});
	}

	// Get notification type badge color
	function getTypeColor(type: string | null) {
		const typeValue = type || 'General';
		switch (typeValue) {
			case 'LeaveStatus':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'MedicalReminder':
				return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
			case 'SystemAlert':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'Attendance':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			default:
				return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
		}
	}

	// Get notification icon based on type
	function getTypeIcon(type: string | null) {
		const typeValue = type || 'General';
		switch (typeValue) {
			case 'LeaveStatus':
				return '📋';
			case 'MedicalReminder':
				return '🏥';
			case 'SystemAlert':
				return '⚠️';
			case 'Attendance':
				return '⏰';
			default:
				return '🔔';
		}
	}

	// Format full date
	function formatFullDate(dateString: string | Date | null) {
		if (!dateString) return 'Date not available';

		const date = new Date(dateString);
		return date.toLocaleDateString('en-US', {
			weekday: 'short',
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
	
</script>

<svelte:head>
	<title>My Notifications – MyBM Hub</title>
	<meta
		name="description"
		content="Stay updated with system alerts, leave approvals, and attendance reminders."
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
						<BreadcrumbPage>Notifications Centre</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
			<br />
			<div>
				<Card.Title>My Notifications</Card.Title>
				<Card.Description class="mt-1 text-gray-500 dark:text-gray-400">
					Stay updated with system alerts, leave approvals, and attendance reminders.
				</Card.Description>
			</div>
		</div>
	</Card.Header>

	<Card.Content>
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Filters with Counts and Action Button -->
		<div class="flex flex-wrap justify-between items-center gap-4 mb-6">
			<!-- Left side: Filter buttons -->
			<div class="flex flex-wrap gap-3">
				<!-- All Notifications Button -->
				<a
					href="/notifications?filter=all"
					class="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
				{data.filter === 'all'
						? 'bg-red-600 text-white'
						: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
				>
					All Notifications
					<span
						class="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium"
					>
						{totalNotifications}
					</span>
				</a>

				<!-- Unread Only Button -->
				<a
					href="/notifications?filter=unread"
					class="px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2
				{data.filter === 'unread'
						? 'bg-red-600 text-white'
						: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}"
				>
					Unread
					<span
						class="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium"
					>
						{unreadNotifications}
					</span>
				</a>
			</div>

			<!-- Right side: Action button -->
			<button
				on:click={markAllRead}
				class="px-4 py-2.5 bg-gray-500/80 text-white hover:bg-red-700 transition-colors text-sm font-medium flex items-center gap-2 rounded-xl whitespace-nowrap"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M5 13l4 4L19 7"
					/>
				</svg>
				Mark All as Read
			</button>
		</div>

		<!-- Notifications List -->
		<div class="notifications-list space-y-3">
			{#if paginatedNotifications.length === 0}
				<div class="text-center py-12">
					<div class="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600">
						<svg class="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="1.5"
								d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
							/>
						</svg>
					</div>
					<h3 class="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
						No notifications
					</h3>
					<p class="text-gray-500 dark:text-gray-400">
						{data.filter === 'unread'
							? 'You have no unread notifications'
							: 'You have no notifications yet'}
					</p>
				</div>
			{:else}
				{#each paginatedNotifications as n (n.id)}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="group p-4 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800
							   hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors cursor-pointer
							   {!n.isRead ? 'border-l-4 border-l-red-500 dark:border-l-red-700' : ''}"
						on:click={() => {
							if (!n.isRead) {
								markAsRead(n.id);
							}
						}}
					>
						<div class="flex gap-4">
							<!-- Icon -->
							<div
								class="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-lg"
							>
								{getTypeIcon(n.type)}
							</div>

							<!-- Content -->
							<div class="flex-1 min-w-0">
								<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
									<h3 class="font-semibold text-gray-900 dark:text-white truncate">
										{n.title || 'Notification'}
									</h3>
									<div class="flex items-center gap-3">
										<span class="px-2 py-1 text-xs rounded-full {getTypeColor(n.type)}">
											{n.type || 'General'}
										</span>
										<span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
											{formatDate(n.createdAt)}
										</span>
									</div>
								</div>

								<p class="text-gray-600 dark:text-gray-400 text-sm mb-3">
									{n.message || 'No message content'}
								</p>

								<div class="flex items-center justify-between">
									<div class="flex items-center gap-4">
										{#if !n.isRead}
											<span
												class="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400"
											>
												<span class="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></span>
												Unread
											</span>
										{/if}
										<span class="text-xs text-gray-500 dark:text-gray-400">
											{formatFullDate(n.createdAt)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- Pagination -->
		{#if total > pageSize}
			<div class="flex justify-between mt-8 pt-6 border-t dark:border-gray-700 items-center">
				<div class="text-sm text-gray-600 dark:text-gray-300">
					Showing {startIndex + 1}-{endIndex} of {total} notifications
				</div>
				<div class="flex gap-2">
					<Button on:click={previousPage} disabled={page === 1} title="Previous" class="px-3 py-2">
						<ChevronLeft class="w-4 h-4" />
					</Button>

					<Button on:click={nextPage} disabled={page >= totalPages} title="Next" class="px-3 py-2">
						<ChevronRight class="w-4 h-4" />
					</Button>
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>

<style>
	/* Smooth transitions */
	div[class*='transition-colors'] {
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}
</style>
