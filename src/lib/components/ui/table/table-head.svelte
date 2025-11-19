<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<th
	class={cn(
		'h-12 px-4 text-left align-middle font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide text-xs',
		'border-b border-gray-200 dark:border-gray-700',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2',
		className
	)}
	{...$$restProps}
>
	<slot />
</th>
