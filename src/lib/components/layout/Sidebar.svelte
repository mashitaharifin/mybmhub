<script lang="ts">
	import { Menu, LogOut, Flower, ChevronDown, ChevronRight, ChevronLeft } from 'lucide-svelte';
	import { MANAGER_MENU, EMPLOYEE_MENU } from '$lib/utils/menu';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { writable } from 'svelte/store';

	export let userRole: string;
	export let isCollapsed: boolean;
	export let onToggleCollapse: () => void;
	export let activePage: string;

	// Determine menu based on role
	$: menu = userRole === 'Manager' ? MANAGER_MENU : EMPLOYEE_MENU;

	// Track which menus with submenus are expanded
	const expandedMenus = writable<Set<string>>(new Set());

	// Reactive active page from current URL
	import { get } from 'svelte/store';
	$: activePage = $page.url.pathname;

	// Navigate function
	const navigate = (path: string) => {
		goto(path);
	};

	// Toggle submenu expansion
	const toggleSubmenu = (itemName: string, event: Event) => {
		event.stopPropagation();
		expandedMenus.update((set) => {
			const newSet = new Set(set);
			if (newSet.has(itemName)) {
				newSet.delete(itemName);
			} else {
				newSet.add(itemName);
			}
			return newSet;
		});
	};

	const logout = async () => {
		await fetch('/auth/logout', { method: 'POST' });
		window.location.href = '/auth/login';
	};

	// Check if menu item (or its children) is active
	const isActive = (item: (typeof menu)[0]) => {
		// Exact match
		if (activePage === item.path) return true;

		// Check submenu items
		if (item.submenu?.some((child) => child.path === activePage)) return true;

		// Check if current path starts with item path (for dynamic routes)
		if (item.path && activePage.startsWith(item.path + '/')) {
			return true;
		}

		// Special case for employee records with dynamic ID
		if (
			item.path === '/manager/employee-records' &&
			activePage.startsWith('/manager/employee-records/')
		) {
			return true;
		}

		// Special case for profile (if profile is separate from employee records)
		if (item.path === '/profile' && activePage === '/profile') {
			return true;
		}

		return false;
	};

	// Auto-expand parent menu when on child page
	$: if (activePage) {
		// Find parent menu items that should be expanded
		const parentItem = menu.find(
			(item) =>
				item.submenu?.some((child) => child.path === activePage) ||
				(item.path && activePage.startsWith(item.path + '/') && item.path !== activePage)
		);

		if (parentItem && !$expandedMenus.has(parentItem.name)) {
			expandedMenus.update((set) => {
				const newSet = new Set(set);
				newSet.add(parentItem.name);
				return newSet;
			});
		}
	}
</script>

<aside
	class={`fixed top-0 left-0 h-full transform transition-transform duration-300 z-40 ${isCollapsed ? '-translate-x-full lg:translate-x-0 w-20' : 'translate-x-0 w-72'}
    bg-gradient-to-br from-red-100/60 via-orange-100/50 to-pink-100/60 dark:bg-gradient-to-br dark:from-red-900/25 dark:via-orange-900/20 dark:to-pink-900/25
    backdrop-blur-2xl saturate-150 border-r border-white/40 dark:border-white/10 shadow-xl shadow-red-300/20 dark:shadow-black/40
    flex flex-col p-4`}
>
	<!-- Overlay for mobile -->
	{#if !isCollapsed}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 bg-black/40 z-30 lg:hidden" on:click={onToggleCollapse}></div>
	{/if}

	<!-- Logo + Collapse Sidebar -->
	<div
		class="flex items-center justify-between h-16 mb-4 px-2 rounded-3xl transition-all duration-200 hover:text-red-900 text-gray-700 dark:text-gray-300"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		{#if !isCollapsed}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				class="flex items-center justify-between h-16 mb-4 px-2 rounded-3xl transition-all duration-200 text-gray-700 dark:text-gray-300"
			>
				<Flower
					class="w-6 h-6 text-orange-700 dark:text-purple-300 flex-shrink-0 transition-transform duration-200"
				/>
				<span
					class="ml-3 text-lg font-bold text-gray-900 dark:text-white transition-colors duration-200"
				>
					MyBM Hub
				</span>
			</div>

			<button
				on:click={onToggleCollapse}
				class="ml-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-300/30 hover:text-pink-700 text-gray-700 dark:text-gray-300 transition-colors duration-200"
				title="Collapse"
			>
				<ChevronLeft class="w-6 h-6" />
			</button>
		{:else}
			<button
				on:click={onToggleCollapse}
				class="w-full flex items-center justify-center p-3 rounded-xl
               hover:bg-gray-800/20 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 transition-colors duration-200"
				title="Expand"
			>
				<Menu class="w-6 h-6" />
			</button>
		{/if}
	</div>

	<!-- Menu -->
	<nav class="flex-grow overflow-y-auto pr-1">
		<ul>
			{#each menu as item}
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<li class="my-1">
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<div
						class="flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-400/20 dark:hover:bg-white/20
         				hover:text-gray-900 dark:hover:text-gray-100 active:scale-[0.98]"
						class:bg-white={isActive(item)}
						class:dark:bg-gray-800={isActive(item)}
						class:text-orange-700={isActive(item)}
						class:dark:text-purple-200={isActive(item)}
						on:click={() => navigate(item.path)}
					>
						<svelte:component this={item.icon} class={`w-5 h-5 ${isCollapsed ? '' : 'mr-3'}`} />
						{#if !isCollapsed}
							<span class="flex-grow">{item.name}</span>
							{#if item.submenu && item.submenu.length > 0}
								<button
									on:click|preventDefault={(e) => toggleSubmenu(item.name, e)}
									class="p-1 rounded transition-colors duration-200"
								>
									{#if $expandedMenus.has(item.name)}
										<ChevronDown class="w-4 h-4" />
									{:else}
										<ChevronRight class="w-4 h-4" />
									{/if}
								</button>
							{/if}
						{/if}
					</div>

					{#if item.submenu && item.submenu.length > 0 && !isCollapsed && $expandedMenus.has(item.name)}
						<ul class="ml-8 mt-1 space-y-1">
							{#each item.submenu as child}
								<li>
									<div
										class="block px-2 py-1 rounded-lg text-sm transition-all duration-200 cursor-pointer hover:bg-gray-300/30 dark:hover:bg-white/20 hover:text-gray-900 dark:hover:text-gray-100 text-gray-600 dark:text-gray-200"
										class:bg-gray-100={activePage === child.path}
										class:dark:bg-gray-800={activePage === child.path}
										class:text-orange-700={activePage === child.path}
										class:dark:text-gray-100={activePage === child.path}
									>
										{child.name}
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</li>
			{/each}
		</ul>
	</nav>

	<!-- Logout -->
	<div class="pt-4 border-t border-gray-200 dark:border-gray-700">
		<button
			class="w-full flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-700/10 dark:hover:bg-white/20
         		hover:text-pink-700 dark:hover:text-gray-100 active:scale-[0.98]"
		>
			<LogOut class={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'}`} />
			{#if !isCollapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>
