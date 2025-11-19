<script lang="ts">
	import { Separator as SeparatorPrimitive } from 'bits-ui';
	import { cn } from '$lib/utils';

	type $$Props = SeparatorPrimitive.Props;

	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<SeparatorPrimitive.Root
	class={cn(
		'shrink-0 bg-border',
		className,
		$$restProps.orientation === 'vertical' ? 'h-full w-[1px]' : 'h-[1px] w-full'
	)}
	{...$$restProps}
	orientation={$$restProps.orientation ?? 'horizontal'}
>
	<slot />
</SeparatorPrimitive.Root>