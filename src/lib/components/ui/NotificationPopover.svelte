<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import NotificationItem from './NotificationItem.svelte';
	import GlassCard from './GlassCard.svelte';

	let open = false;
	let notifications: any[] = [];
	let loading = false;
	let eventSource: EventSource | null = null;
	let isMobile = false;

	const limit = 6;

	// To dispatch events for notification updates
	function dispatchNotificationEvent(
		type: 'new-notification' | 'mark-read' | 'mark-all-read',
		data?: any
	) {
		window.dispatchEvent(
			new CustomEvent('notification-update', {
				detail: { type, data }
			})
		);
	}

	// Check if mobile
	function checkIfMobile() {
		isMobile = window.innerWidth < 768;
	}

	// Update body class when popover opens/closes
	function updateBodyClass() {
		if (typeof document !== 'undefined') {
			if (open && isMobile) {
				document.body.classList.add('notification-popover-open');
			} else {
				document.body.classList.remove('notification-popover-open');
			}
		}
	}

	// SSE connection for real-time notifications
	function connectSSE() {
		if (eventSource || !window.EventSource) return;

		try {
			eventSource = new EventSource('/notifications/stream');

			eventSource.onopen = () => {
				console.log('✅ SSE connection established successfully');
			};

			eventSource.onmessage = (event) => {
				try {
					if (event.data === ': ping') {
						return;
					}

					const data = JSON.parse(event.data);

					if (data.type === 'connected' || data.type === 'ping') {
						console.log('SSE system message:', data.message || data.type);
						return;
					}

					if (data && data.id) {
						console.log('📬 New notification via SSE:', data);
						const newNotification = {
							...data,
							isRead: false,
							createdAt: data.createdAt || new Date().toISOString()
						};

						notifications = [newNotification, ...notifications].slice(0, limit);
						playNotificationSound();

						if (open) {
							showNewNotificationIndicator();
						}
						dispatchNotificationEvent('new-notification', { id: data.id });
					}
				} catch (err) {
					console.error('Failed to parse SSE message:', err, 'Raw data:', event.data);
				}
			};

			eventSource.onerror = (error) => {
				console.error('❌ SSE connection error. ReadyState:', eventSource?.readyState, error);

				if (eventSource?.readyState === EventSource.CLOSED) {
					console.log('SSE connection closed by server');
				}

				disconnectSSE();

				setTimeout(() => {
					if (!eventSource) {
						console.log('🔄 Attempting SSE reconnection...');
						connectSSE();
					}
				}, 5000);
			};

			eventSource.addEventListener('notification', (event) => {
				console.log('Received notification event:', event);
			});
		} catch (error) {
			console.error('Failed to establish SSE connection:', error);
		}
	}

	function disconnectSSE() {
		if (eventSource) {
			eventSource.close();
			eventSource = null;
		}
	}

	function playNotificationSound() {
		try {
			const audio = new Audio('/notifications.mp3');
			audio.volume = 0.3;
			audio.play().catch(() => {});
		} catch (error) {}
	}

	function showNewNotificationIndicator() {
		const popover = document.querySelector('.notification-popover');
		if (popover) {
			popover.classList.add('new-notification');
			setTimeout(() => {
				popover.classList.remove('new-notification');
			}, 1000);
		}
	}

	async function fetchNotifications() {
		loading = true;
		try {
			const res = await fetch(`/notifications?limit=${limit}`);
			const data = await res.json();
			if (data.success) {
				notifications = data.data;
			}
		} catch (err) {
			console.error('Failed to fetch notifications', err);
		} finally {
			loading = false;
		}
	}

	function toggle() {
		open = !open;
		if (open) {
			fetchNotifications();
			if (!eventSource) {
				connectSSE();
			}
		}
		updateBodyClass();
	}

	async function markAllRead() {
		try {
			const res = await fetch('/notifications/mark-all-read', {
				method: 'PATCH'
			});
			const data = await res.json();
			if (data.success) {
				notifications = notifications.map((n) => ({ ...n, isRead: true }));
				dispatchNotificationEvent('mark-all-read');
			}
		} catch (err) {
			console.error('Failed to mark all read', err);
		}
	}

	async function handleNotificationClick(notification: {
		isRead: boolean;
		id: number;
		link?: string;
	}) {
		try {
			if (!notification.isRead) {
				await fetch(`/notifications/${notification.id}/read`, { method: 'PATCH' });
				notification.isRead = true;
				dispatchNotificationEvent('mark-read', { id: notification.id });
			}
			if (notification.link) {
				open = false; // Close popover before navigating
				updateBodyClass();
				goto(notification.link);
			}
		} catch (err) {
			console.error('Failed to mark notification read or navigate', err);
		}
	}

	function handleOutsideClick(event: MouseEvent) {
		const path = event.composedPath();
		if (!path.includes(container)) {
			open = false;
			updateBodyClass();
		}
	}

	let container: HTMLDivElement;

	onMount(() => {
		document.addEventListener('click', handleOutsideClick);
		window.addEventListener('resize', checkIfMobile);
		checkIfMobile(); // Initial check

		if (typeof window !== 'undefined' && window.EventSource) {
			connectSSE();
		} else {
			console.warn('EventSource not supported in this browser');
		}

		return () => {
			document.removeEventListener('click', handleOutsideClick);
			window.removeEventListener('resize', checkIfMobile);
			disconnectSSE();
			// Clean up body class
			if (typeof document !== 'undefined') {
				document.body.classList.remove('notification-popover-open');
			}
		};
	});

	onDestroy(() => {
		disconnectSSE();
		window.removeEventListener('resize', checkIfMobile);
		if (typeof document !== 'undefined') {
			document.body.classList.remove('notification-popover-open');
		}
	});
</script>

<div bind:this={container} class="relative">
	<!-- Trigger -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div on:click={toggle} class="relative">
		<slot name="trigger"></slot>
	</div>

	<!-- Backdrop for mobile -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	{#if open && isMobile}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore element_invalid_self_closing_tag -->
		<div
			class="fixed inset-0 bg-black/30 dark:bg-black/50 z-[100]"
			on:click={() => {
				open = false;
				updateBodyClass();
			}}
		/>
	{/if}

	<!-- Notification Popover -->
	{#if open}
		<div
			in:scale={{ duration: 150, start: 0.9 }}
			out:fly={{ y: -10, duration: 150 }}
			class="fixed md:absolute z-[101] 
			       inset-x-0 md:inset-x-auto
			       top-16 md:top-full md:mt-2
			       md:right-0
			       flex justify-center md:justify-start
			       px-4 md:px-0"
		>
			<GlassCard
				className="notification-popover w-full md:w-[360px] p-0 overflow-hidden 
				          bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl
				          border border-gray-200 dark:border-gray-700/50
				          shadow-xl dark:shadow-gray-900/30
				          max-h-[80vh] md:max-h-[500px]
				          md:min-w-[360px]"
				hoverEffect={false}
				padding={false}
			>
				<!-- Header -->
				<div
					class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 
					       bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm
					       border-b border-gray-200 dark:border-gray-700"
				>
					<div class="flex items-center gap-2">
						<h3 class="font-semibold text-gray-900 dark:text-white">Notifications</h3>

						{#if eventSource && eventSource.readyState === EventSource.OPEN}
							<!-- svelte-ignore element_invalid_self_closing_tag -->
							<span
								class="w-2 h-2 bg-pink-500 rounded-full animate-pulse"
								title="Live updates connected"
							/>
						{/if}
					</div>

					<button
						class="text-sm text-pink-600 dark:text-purple-400 hover:text-pink-400 dark:hover:text-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						on:click={markAllRead}
						disabled={notifications.length === 0 || notifications.every((n) => n.isRead)}
					>
						Mark all read
					</button>
				</div>

				<!-- List -->
				<div class="overflow-y-auto flex-1 custom-scrollbar">
					{#if loading}
						<div class="space-y-2 p-4">
							{#each Array(4) as _, i (i)}
								<div class="flex items-center space-x-3 animate-pulse">
									<!-- svelte-ignore element_invalid_self_closing_tag -->
									<div class="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
									<div class="flex-1 space-y-2">
										<!-- svelte-ignore element_invalid_self_closing_tag -->
										<div class="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
										<!-- svelte-ignore element_invalid_self_closing_tag -->
										<div class="h-2 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
									</div>
								</div>
							{/each}
						</div>
					{:else if notifications.length === 0}
						<div class="flex flex-col items-center justify-center py-10 px-4 text-center">
							<div class="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600">
								<!-- Bell icon -->
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-full h-full"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
									/>
								</svg>
							</div>
							<p class="text-gray-500 dark:text-gray-400 font-medium">No notifications</p>
							<p class="text-sm text-gray-400 dark:text-gray-500 mt-1">
								You're all caught up!
							</p>
						</div>
					{:else}
						<div class="divide-y divide-gray-100 dark:divide-gray-800">
							{#each notifications as notification (notification.id)}
								<NotificationItem
									{notification}
									on:click={() => handleNotificationClick(notification)}
								/>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Footer -->
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				{#if notifications.length > 0}
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="sticky bottom-0 px-4 py-3 text-center text-sm font-medium cursor-pointer
						       text-pink-600 dark:text-purple-400
						       hover:bg-gray-50 dark:hover:bg-gray-800/50
						       transition-colors border-t border-gray-200 dark:border-gray-700
						       bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
						on:click={() => {
							open = false;
							updateBodyClass();
							goto('/notifications');
						}}
					>
						View All Notifications
					</div>
				{/if}
			</GlassCard>
		</div>
	{/if}
</div>

<style>
	/* Custom scrollbar for notifications */
	.custom-scrollbar {
		scrollbar-width: thin;
		scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
	}

	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}

	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: rgba(156, 163, 175, 0.3);
		border-radius: 3px;
	}

	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background-color: rgba(156, 163, 175, 0.5);
	}

	/* Animation for new notifications (used dynamically via JS) */
	@keyframes subtle-bounce {
		0%, 100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.02);
		}
	}

	/* Prevent body scroll when popover is open on mobile */
	:global(body.notification-popover-open) {
		overflow: hidden;
	}
</style>