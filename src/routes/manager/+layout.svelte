<script lang="ts">
	import favicon from '$lib/assets/favicon.png';
	import Layout from "$lib/components/layout/Layout.svelte";
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<Layout userRole="Manager">
  <slot />
</Layout>
