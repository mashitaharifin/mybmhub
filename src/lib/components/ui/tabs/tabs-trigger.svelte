<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type $$Props = TabsPrimitive.TriggerProps;

	let className: $$Props['class'] = undefined;
	export let value: $$Props['value'];
	export { className as class };
</script>

<TabsPrimitive.Trigger
	class={cn(
		'relative inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-all duration-200',
		'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2',
		'disabled:pointer-events-none disabled:opacity-50',
		// Active state with brand accent
		'data-[state=active]:text-red-600 dark:data-[state=active]:text-red-400',
		// Underline accent animation
		'after:absolute after:bottom-0 after:left-1/2 after:w-0 after:h-[2px] after:bg-red-600 dark:after:bg-red-400 after:transition-all after:duration-300 after:rounded-full',
		'data-[state=active]:after:w-4/5 data-[state=active]:after:left-1/2 data-[state=active]:after:translate-x-[-50%]',
		// Hover effect
		'hover:text-red-600 dark:hover:text-red-400',
		className
	)}
	value={value}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.Trigger>
