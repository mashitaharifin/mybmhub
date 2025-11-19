<script lang="ts">
	// These components often rely on a utility function like 'cn' to merge classes elegantly.
	// We assume it's available in your project's $lib/utils, but commenting out the import
	// to avoid breaking if it's not present.
	// import { cn } from '$lib/utils';
	export let className = '';

	// CardHeader defines the top section, typically with some vertical spacing and padding
</script>

<header class={`flex flex-col space-y-1.5 p-6 ${className}`} {...$$restProps}>
	<slot />
</header>
