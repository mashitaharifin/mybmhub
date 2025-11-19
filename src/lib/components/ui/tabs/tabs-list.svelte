<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type $$Props = TabsPrimitive.ListProps;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<TabsPrimitive.List
	class={cn(
		'inline-flex items-center justify-start rounded-lg bg-gray-100 dark:bg-gray-800 p-1 text-gray-600 dark:text-gray-300 shadow-inner',
		// Accent outline when focused
		'focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2',
		'transition-colors duration-200',
		className
	)}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.List>
