<script lang="ts">
	import Sidebar from '$lib/components/layout/Sidebar.svelte';
	import Topbar from '$lib/components/layout/Topbar.svelte';
	import Footer from '$lib/components/layout/Footer.svelte';
	import { getPageTitle } from '$lib/utils/menu';
	import { onMount } from 'svelte';

	// svelte-ignore export_let_unused
	export let user: any = null;
	// svelte-ignore export_let_unused
	export let userRole: string | null = null;

	let resolvedUser: any = null;
	let resolvedRole: string = 'Employee';

	onMount(async () => {
		const res = await fetch('/api/auth/me');
		if (res.ok) {
			resolvedUser = await res.json();
			resolvedRole = resolvedUser.role;
		} else {
			// fallback if not logged in
			resolvedUser = null;
			resolvedRole = 'Employee';
		}
	});

	let activePage = '/dashboard';
	let isCollapsed = false;

	// Recompute title when page changes
	$: pageTitle = getPageTitle(activePage);

	// Automatically collapse sidebar on small screens
	onMount(() => {
		const handleResize = () => {
			isCollapsed = window.innerWidth < 1024;
		};
		handleResize();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<div
	class="min-h-screen font-inter transition-colors duration-300 flex flex-col lg:flex-row
    bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))]
    from-indigo-50 via-gray-100 to-gray-100
    dark:from-indigo-950 dark:via-gray-900 dark:to-gray-900"
>
	<Sidebar
		userRole={resolvedRole}
		{isCollapsed}
		{activePage}
		onToggleCollapse={() => (isCollapsed = !isCollapsed)}
	/>

	<div class="flex flex-col flex-1 w-full overflow-hidden">
		<Topbar
			user={resolvedUser ?? { name: '', title: '', role: '', initials: '', notificationCount: 0 }}
			{isCollapsed}
		/>

		<main
			class={`flex-1 pt-16 pb-12 transition-all duration-300 ${
				isCollapsed ? 'lg:ml-20' : 'lg:ml-72'
			}`}
		>
			<slot />
		</main>
		<Footer />
	</div>
</div>

<style>
	/* Add this to your main layout file */
	main, .main-content {
		margin-top: 4rem; /* h-16 = 4rem */
		padding-top: 1rem;
	}

	/* For mobile specifically */
	@media (max-width: 640px) {
		main, .main-content {
			margin-top: 4rem;
			padding-top: 0.5rem;
			padding-left: 1rem;
			padding-right: 1rem;
		}
	}
</style>
