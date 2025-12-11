<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, scale } from 'svelte/transition';
	import { goto } from '$app/navigation';
	import NotificationItem from './NotificationItem.svelte';

	let open = false;
	let notifications: any[] = [];
	let loading = false;
	let eventSource: EventSource | null = null;

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

	// SSE connection for real-time notifications
	function connectSSE() {
		// Only connect if we have a user and not already connected
		if (eventSource || !window.EventSource) return;

		try {
			// Use your SSE endpoint - make sure this matches your API route
			eventSource = new EventSource('/notifications/stream');

			eventSource.onopen = () => {
				console.log('✅ SSE connection established successfully');
			};

			eventSource.onmessage = (event) => {
				try {
					// Check if it's a ping (just a colon)
					if (event.data === ': ping') {
						return;
					}

					const data = JSON.parse(event.data);

					// Check if this is a ping or connection message
					if (data.type === 'connected' || data.type === 'ping') {
						console.log('SSE system message:', data.message || data.type);
						return; // Ignore system messages
					}

					// It's a real notification
					if (data && data.id) {
						console.log('📬 New notification via SSE:', data);
						// Add new notification to the beginning of the list
						const newNotification = {
							...data,
							isRead: false, // New notifications are unread by default
							createdAt: data.createdAt || new Date().toISOString()
						};

						// Prepend to notifications list, keeping limit
						notifications = [newNotification, ...notifications].slice(0, limit);

						// Optional: Play a sound or show a subtle notification
						playNotificationSound();

						// If popover is open, show a subtle indicator
						if (open) {
							showNewNotificationIndicator();
						}
						// Dispatch event for Topbar counter
						dispatchNotificationEvent('new-notification', { id: data.id });
					}
				} catch (err) {
					console.error('Failed to parse SSE message:', err, 'Raw data:', event.data);
				}
			};

			eventSource.onerror = (error) => {
				console.error('❌ SSE connection error. ReadyState:', eventSource?.readyState, error);

				// Check readyState to determine error type
				if (eventSource?.readyState === EventSource.CLOSED) {
					console.log('SSE connection closed by server');
				}

				disconnectSSE();

				// Attempt to reconnect after 5 seconds
				setTimeout(() => {
					if (!eventSource) {
						console.log('🔄 Attempting SSE reconnection...');
						connectSSE();
					}
				}, 5000);
			};

			// Also listen for custom events if your broadcaster uses them
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
		// Optional: Play a subtle notification sound
		// You can use the Web Audio API or just a simple beep
		try {
			const audio = new Audio('/notifications.mp3'); // Add this sound file to your static folder
			audio.volume = 0.3;
			audio.play().catch(() => {
				// Silent fail if audio can't play
			});
		} catch (error) {
			// Ignore audio errors
		}
	}

	function showNewNotificationIndicator() {
		// Optional: Add a subtle visual indicator
		const popover = document.querySelector('.popover');
		if (popover) {
			popover.classList.add('new-notification');
			setTimeout(() => {
				popover.classList.remove('new-notification');
			}, 1000);
		}
	}

	// Fetch notifications from API
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

	// Toggle popover
	function toggle() {
		open = !open;
		if (open) {
			fetchNotifications();
			// Ensure SSE is connected when popover opens
			if (!eventSource) {
				connectSSE();
			}
		}
	}

	// Mark all as read
	async function markAllRead() {
		try {
			const res = await fetch('/notifications/mark-all-read', {
				method: 'PATCH'
			});
			const data = await res.json();
			if (data.success) {
				// Update local notifications
				notifications = notifications.map((n) => ({ ...n, isRead: true }));
				dispatchNotificationEvent('mark-all-read'); // Dispatch event for Topbar counter
			}
		} catch (err) {
			console.error('Failed to mark all read', err);
		}
	}

	// Navigate to specific notification link and mark as read
	async function handleNotificationClick(notification: {
		isRead: boolean;
		id: number;
		link?: string;
	}) {
		try {
			if (!notification.isRead) {
				await fetch(`/notifications/${notification.id}/read`, { method: 'PATCH' });
				notification.isRead = true;
				dispatchNotificationEvent('mark-read', { id: notification.id }); // Dispatch event for Topbar counter
			}
			if (notification.link) {
				goto(notification.link);
			}
		} catch (err) {
			console.error('Failed to mark notification read or navigate', err);
		}
	}

	// Close when clicking outside
	function handleOutsideClick(event: MouseEvent) {
		const path = event.composedPath();
		if (!path.includes(container)) {
			open = false;
		}
	}

	let container: HTMLDivElement;

	onMount(() => {
		document.addEventListener('click', handleOutsideClick);

		// Connect to SSE when component mounts
		if (typeof window !== 'undefined' && window.EventSource) {
			connectSSE();
		} else {
			console.warn('EventSource not supported in this browser');
		}

		return () => {
			document.removeEventListener('click', handleOutsideClick);
			disconnectSSE();
		};
	});

	onDestroy(() => {
		disconnectSSE();
	});
</script>

<div bind:this={container} class="relative">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div on:click={toggle}>
		<slot name="trigger"></slot>
	</div>

	{#if open}
		<div
			class="popover"
			in:scale={{ duration: 150 }}
			out:fly={{ y: -10, duration: 150 }}
			style="position: absolute; right: 0; top: 2.5rem;"
		>
			<div class="header">
				<div class="flex items-center gap-2">
					<h3 class="text-gray-900 dark:text-white">Notifications</h3>
					{#if eventSource && eventSource.readyState === EventSource.OPEN}
						<span
							class="w-2 h-2 bg-green-500 rounded-full animate-pulse"
							title="Live updates connected"
						></span>
					{/if}
				</div>
				<button
					class="text-sm text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
					on:click={markAllRead}
				>
					Mark all read
				</button>
			</div>

			<div class="list">
				{#if loading}
					{#each Array(4) as _, i (i)}
						<div class="skeleton"></div>
					{/each}
				{:else if notifications.length === 0}
					<div class="p-4 text-center text-gray-500 dark:text-gray-400">No notifications</div>
				{:else}
					{#each notifications as notification (notification.id)}
						<NotificationItem
							{notification}
							on:click={() => handleNotificationClick(notification)}
						/>
					{/each}
				{/if}
			</div>

			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="footer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
				on:click={() => goto('/notifications')}
			>
				View All
			</div>
		</div>
	{/if}
</div>

<style>
	.popover {
		min-width: 300px;
		max-width: 360px;
		background: white;
		border-radius: 1rem;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		overflow: hidden;
		z-index: 50;
		transition: all 0.3s ease;
	}

	:global(.dark) .popover {
		background: #1f2937; /* gray-800 */
		color: white;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid #e5e7eb; /* gray-200 */
	}

	:global(.dark) .header {
		border-color: #374151; /* gray-700 */
	}

	.header h3 {
		font-weight: 600;
		font-size: 1rem;
	}

	.list {
		max-height: 300px;
		overflow-y: auto;
	}

	.footer {
		padding: 0.75rem 1rem;
		border-top: 1px solid #e5e7eb; /* gray-200 */
		text-align: center;
		font-size: 0.875rem;
		cursor: pointer;
		color: #ef4444; /* red-500 */
		font-weight: 500;
		transition: background-color 150ms ease-in-out;
	}

	:global(.dark) .footer {
		border-color: #374151; /* gray-700 */
		color: #f87171; /* red-400 */
	}

	.skeleton {
		height: 60px;
		padding: 0.75rem 1rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: #f9fafb; /* gray-50 */
		border-bottom: 1px solid #e5e7eb; /* gray-200 */
		border-radius: 0.5rem;
		animation: pulse 1.5s infinite;
	}

	:global(.dark) .skeleton {
		background: #374151; /* gray-700 */
		border-color: #4b5563; /* gray-600 */
	}

	@keyframes pulse {
		0% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
		100% {
			opacity: 1;
		}
	}

	/* For better dark mode transitions */
	:global(.dark) .popover,
	:global(.dark) .header,
	:global(.dark) .footer,
	:global(.dark) .skeleton {
		transition:
			background-color 200ms ease-in-out,
			border-color 200ms ease-in-out;
	}
</style>
