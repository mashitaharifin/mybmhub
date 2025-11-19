<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	export let className: string = '';
	export let props: HTMLAttributes<HTMLElement> = {};
</script>

<nav
	{...props}
	class={`flex items-center text-sm text-muted-foreground ${className}`}
	aria-label="Breadcrumb"
>
	<slot />
</nav>
