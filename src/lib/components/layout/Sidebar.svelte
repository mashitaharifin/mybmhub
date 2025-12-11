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
		return activePage === item.path || item.submenu?.some((child) => child.path === activePage);
	};
</script>

<aside
	class={`fixed top-0 left-0 h-full transform transition-transform duration-300 z-40
    ${isCollapsed ? '-translate-x-full lg:translate-x-0 w-20' : 'translate-x-0 w-72'}
    bg-white dark:bg-gray-800 shadow-xl flex flex-col p-4`}
>
	<!-- Overlay for mobile -->
	{#if !isCollapsed}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="fixed inset-0 bg-black/40 z-30 lg:hidden" on:click={onToggleCollapse}></div>
	{/if}

	<!-- Logo + Collapse Sidebar -->
	<div
		class="flex items-center justify-between h-16 mb-4 px-2 rounded-3xl transition-all duration-200
           hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-900 text-gray-700 dark:text-gray-300"
	>
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		{#if !isCollapsed}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div class="flex items-center cursor-pointer" on:click={() => navigate('/dashboard')}>
				<Flower
					class="w-6 h-6 text-red-600 hover:text-gray-900 dark:hover:text-white flex-shrink-0 transition-transform duration-200"
				/>
				<span
					class="ml-3 text-lg font-bold text-gray-900 dark:text-white transition-colors duration-200"
				>
					MyBM Hub
				</span>
			</div>

			<button
				on:click={onToggleCollapse}
				class="ml-2 p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-900 text-gray-700 dark:text-gray-300 transition-colors duration-200"
				title="Collapse sidebar"
			>
				<ChevronLeft class="w-6 h-6" />
			</button>
		{:else}
			<button
				on:click={onToggleCollapse}
				class="w-full flex items-center justify-center p-3 rounded-xl
               hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-900 text-gray-700 dark:text-gray-300
               transition-colors duration-200"
				title="Expand sidebar"
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
						class="flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium
text-gray-700 dark:text-gray-300
hover:bg-red-50 dark:hover:bg-red-900/40
hover:text-red-600 dark:hover:text-red-300
active:scale-[0.98]"
						class:bg-red-600={isActive(item)}
						class:text-white={isActive(item)}
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
										class="block px-2 py-1 rounded-lg text-sm transition-all duration-200 cursor-pointer
                      hover:bg-red-100 dark:hover:bg-red-800 hover:text-red-900 text-gray-600 dark:text-gray-400"
										class:bg-red-600={activePage === child.path}
										class:text-white={activePage === child.path}
										on:click={() => navigate(child.path)}
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
			class="w-full flex items-center p-3 rounded-lg transition-all duration-200 cursor-pointer text-sm font-medium
text-gray-700 dark:text-gray-300
hover:bg-red-50 dark:hover:bg-red-900/40
hover:text-red-600 dark:hover:text-red-300
active:scale-[0.98]"
			on:click={logout}
		>
			<LogOut class={`w-5 h-5 ${isCollapsed ? 'mr-0' : 'mr-3'}`} />
			{#if !isCollapsed}
				<span>Logout</span>
			{/if}
		</button>
	</div>
</aside>
