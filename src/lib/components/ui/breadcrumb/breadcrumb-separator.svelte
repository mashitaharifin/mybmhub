<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	export let className: string = '';
	export let props: HTMLAttributes<HTMLElement> = {};
</script>

<span {...props} class={`text-muted-foreground/70 dark:text-gray-400 select-none ${className}`}>
	> 
</span>
