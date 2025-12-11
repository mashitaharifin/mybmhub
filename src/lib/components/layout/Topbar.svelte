<script lang="ts">
	import { Moon, Sun, Bell, ChevronDown } from 'lucide-svelte';
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import NotificationPopover from '$lib/components/ui/NotificationPopover.svelte';

	export let user: any;
	export let isCollapsed: boolean;

	let showUserMenu = false;
	let notificationCount = 0; // Add this
	let pollInterval: NodeJS.Timeout; // Add this

	// Fetch notification count
	async function fetchNotificationCount() {
		try {
			const res = await fetch('/notifications/count');
			const data = await res.json();
			if (data.success) {
				notificationCount = data.count;
			}
		} catch (err) {
			console.error('Failed to fetch notification count', err);
		}
	}

	// Listen for custom events from NotificationPopover
	function handleNotificationEvent(event: CustomEvent) {
		if (event.detail.type === 'new-notification') {
			notificationCount++;
		} else if (event.detail.type === 'mark-read') {
			notificationCount = Math.max(0, notificationCount - 1);
		} else if (event.detail.type === 'mark-all-read') {
			notificationCount = 0;
		}
	}

	const handleNotifications = () => {
		console.log('Notifications clicked');
	};

	// Automatically apply saved theme on mount (no reactive conflict)
	onMount(() => {
		if (browser) {
			document.documentElement.classList.toggle('dark', $theme === 'dark');
			
			fetchNotificationCount(); // Fetch initial notification count
			
			// Poll for updates every 30 seconds (fallback for SSE issues)
			pollInterval = setInterval(fetchNotificationCount, 30000);
			
			// Listen for events from NotificationPopover
			window.addEventListener('notification-update', handleNotificationEvent as EventListener);
		}
	});

	// Cleanup
	onDestroy(() => {
		if (browser && pollInterval) {
			clearInterval(pollInterval);
		}
		if (browser) {
			window.removeEventListener('notification-update', handleNotificationEvent as EventListener);
		}
	});

	// Reactively watch theme changes
	$: if (browser) {
		document.documentElement.classList.toggle('dark', $theme === 'dark');
	}

	const logout = async () => {
		await fetch('/auth/logout', {
			method: 'POST',
			body: new FormData() // empty form-encoded data
		});
		window.location.href = '/auth/login';
	};
</script>

<header
	class={`fixed top-0 right-0 h-16 bg-white dark:bg-gray-800 border-b dark:border-gray-800 shadow-sm z-20
    flex flex-wrap items-center justify-between transition-all duration-300 px-4 sm:px-6
    ${isCollapsed ? 'w-full lg:w-[calc(100%-5rem)]' : 'w-full lg:w-[calc(100%-18rem)]'}`}
>
	<div class="flex items-center justify-between w-full sm:w-auto mb-2 sm:mb-0">
		<h1 class="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white truncate">
			Hello, <span class="text-red-500 dark:text-red-600">{user?.name}</span>.
		</h1>
	</div>

	<div class="flex items-center space-x-4 relative">
		<!-- Theme Toggle -->
		<button
			on:click={toggleTheme}
			class="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-transform duration-300 active:rotate-180"
		>
			{#if $theme === 'light'}
				<Moon class="w-6 h-6" />
			{:else}
				<Sun class="w-6 h-6" />
			{/if}
		</button>

		<NotificationPopover>
			<button
				slot="trigger"
				class="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
			>
				<Bell class="w-6 h-6 text-gray-500 dark:text-gray-400" />
				{#if notificationCount > 0}
					<span class="absolute -top-1 -right-1 text-xs bg-red-600 text-white rounded-full px-1 min-w-[1.25rem] h-5 flex items-center justify-center">
						{notificationCount > 99 ? '99+' : notificationCount}
					</span>
				{/if}
			</button>
		</NotificationPopover>

		<!-- User Profile -->
		<div class="relative">
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<div
				class="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
				on:click={() => (showUserMenu = !showUserMenu)}
			>
				<div
					class="w-10 h-10 bg-red-600 text-white flex items-center justify-center rounded-full font-semibold"
				>
					{user?.initials}
				</div>
				<div class="flex flex-col items-start">
					<span class="text-sm font-medium text-gray-900 dark:text-white">
						{user?.name}
					</span>
					<span class="text-xs text-gray-500 dark:text-gray-400">
						{user?.title}
					</span>
				</div>
				<ChevronDown class="w-4 h-4 text-gray-500 dark:text-gray-400" />
			</div>

			{#if showUserMenu}
				<div
					class="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden border dark:border-gray-700 z-30"
				>
					<!-- User Info Section -->
					<div class="px-4 py-3 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
						<div class="flex items-center space-x-3">
							<div
								class="w-10 h-10 bg-red-600 text-white flex items-center justify-center rounded-full font-semibold"
							>
								{user?.initials}
							</div>
							<div class="flex flex-col">
								<span class="text-sm font-medium text-gray-900 dark:text-white">
									{user?.name}
								</span>
								<span class="text-xs text-gray-500 dark:text-gray-400">
									{user?.title}
								</span>
								<span class="text-xs text-red-600 dark:text-red-400 font-medium">
									{user?.role}
								</span>
							</div>
						</div>
					</div>

					<!-- Menu Items -->
					<div class="py-1">
						<a
							href="/profile"
							class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
						>
							Profile
						</a>

						<button
							class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50 transition-colors duration-200"
							on:click={logout}
						>
							Logout
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</header>