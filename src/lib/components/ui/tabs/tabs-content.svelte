<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type $$Props = TabsPrimitive.ContentProps;

	let className: $$Props['class'] = undefined;
	export let value: $$Props['value'];
	export { className as class };
</script>

<TabsPrimitive.Content
	class={cn(
		'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg',
		'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2',
		'transition-colors duration-200',
		className
	)}
	value={value}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.Content>
