<script lang="ts">
	import { Moon, Sun, Bell, ChevronDown } from 'lucide-svelte';
	import { theme, toggleTheme } from '$lib/stores/theme';
	import { goto } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import { browser } from '$app/environment';
	import NotificationPopover from '$lib/components/ui/NotificationPopover.svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

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
	class={`fixed top-0 right-0 h-16 z-50
    bg-gradient-to-r 
      from-red-100/60 via-orange-100/50 to-pink-100/60
    dark:bg-gradient-to-r 
      dark:from-red-900/25 dark:via-orange-900/20 dark:to-pink-900/25
    backdrop-blur-2xl saturate-150
    border-b border-white/40 dark:border-white/10
    shadow-lg shadow-red-300/20 dark:shadow-black/30
    flex items-center justify-between transition-all duration-300 px-4 sm:px-6
    ${isCollapsed ? 'w-full lg:w-[calc(100%-5rem)]' : 'w-full lg:w-[calc(100%-18rem)]'}`}
>
	<div class="flex items-center">
		<h1 class="text-sm sm:text-lg font-semibold text-gray-800 dark:text-white truncate">
			Hello, <span class="text-orange-700 dark:text-purple-300">{user?.name}</span>.
		</h1>
	</div>

	<div class="flex items-center space-x-2 sm:space-x-4 relative">
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
					<span
						class="absolute -top-1 -right-1 text-xs bg-orange-700 dark:bg-purple-400 text-white rounded-full px-1 min-w-[1.25rem] h-5 flex items-center justify-center"
					>
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
				<!-- Avatar with gradient ring -->
				<div
					class="w-10 h-10 p-[2px] rounded-full bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d]
					flex items-center justify-center"
				>
					<div
						class="w-full h-full rounded-full bg-white dark:bg-gray-700 text-red-600 dark:text-purple-400 font-semibold text-sm flex items-center justify-center"
					>
						{user?.initials}
					</div>
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

			<!-- User Menu -->
			{#if showUserMenu}
				<div class="absolute right-0 mt-2 w-64 z-30">
					<GlassCard
						className="w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50"
						padding={false}
						hoverEffect={false}
					>
						<!-- User Info Section -->
						<div class="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
							<div class="flex items-center space-x-3">
								<div
									class="w-10 h-10 p-[2px] rounded-full bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d]
						flex items-center justify-center"
								>
									<div
										class="w-full h-full rounded-full bg-white dark:bg-gray-700 text-red-600 dark:text-purple-400 font-semibold text-sm flex items-center justify-center"
									>
										{user?.initials}
									</div>
								</div>
								<div class="flex flex-col">
									<span class="text-sm font-medium text-gray-900 dark:text-white">
										{user?.name}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{user?.title}
									</span>
									<span class="text-xs text-red-600 dark:text-purple-400 font-medium">
										{user?.role}
									</span>
								</div>
							</div>
						</div>

						<!-- Menu Items -->
						<div class="py-1">
							<a
								href="/profile"
								class="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors duration-200"
							>
								Profile
							</a>

							<button
								class="block w-full text-left px-4 py-2 text-sm text-red-600 dark:text-purple-400 hover:bg-red-50 dark:hover:bg-gray-700/50 transition-colors duration-200"
								on:click={logout}
							>
								Logout
							</button>
						</div>
					</GlassCard>
				</div>
			{/if}
		</div>
	</div>
</header>
