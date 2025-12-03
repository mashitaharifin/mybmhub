<script lang="ts">
	import { cn } from '$lib/utils';

	export let value = '';
	export let className = '';
</script>

<!-- svelte-ignore element_invalid_self_closing_tag -->
<textarea
	bind:value
	class={cn(
		'flex w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-50 resize-none',
		className
	)}
	{...$$restProps}
/>
