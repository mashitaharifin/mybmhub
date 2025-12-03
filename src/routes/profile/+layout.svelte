<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import Layout from '$lib/components/layout/Layout.svelte';
	import { page } from '$app/stores';

	// Auto-detect role from the current path (employee or manager)
	$: currentPath = $page.url.pathname;
	$: userRole = currentPath.includes('/manager')
		? 'Manager'
		: currentPath.includes('/employee')
		? 'Employee'
		: 'Employee'; // default fallback
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Layout {userRole}>
	<slot />
</Layout>
