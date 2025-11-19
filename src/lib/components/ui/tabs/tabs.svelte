<script lang="ts">
	import { Tabs as TabsPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type $$Props = TabsPrimitive.RootProps;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<TabsPrimitive.Root
	class={cn(
		'w-full text-text dark:text-text-dark transition-colors duration-200',
		className
	)}
	{...$$restProps}
>
	<slot />
</TabsPrimitive.Root>
