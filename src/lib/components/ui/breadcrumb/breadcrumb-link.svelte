<script lang="ts">
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	export let href: string = '#';
	export let className: string = '';
	export let props: HTMLAnchorAttributes = {};
</script>

<a
	{href}
	{...props}
	class={`transition-all duration-200 text-muted-foreground hover:font-bold dark:text-gray-200  ${className}`}
>
	<slot />
</a>
