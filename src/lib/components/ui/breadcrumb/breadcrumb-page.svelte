<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	export let className: string = '';
	export let props: HTMLAttributes<HTMLElement> = {};
</script>

<span
	{...props}
	class={`font-medium text-foreground dark:text-white ${className}`}
	aria-current="page"
>
	<slot />
</span>
