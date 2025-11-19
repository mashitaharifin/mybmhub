<script lang="ts">
	import { cn } from '$lib/utils';
	import type { VariantProps } from 'tailwind-variants';
	import { alertVariants } from '.'; // imports from index.ts

	type TProps = VariantProps<typeof alertVariants>;

	export let variant: TProps['variant'] = 'default';
	let className: string | undefined = undefined;
	export { className as class };
</script>

<div
	role="alert"
	class={cn(
		alertVariants({ variant }),
		'transition-colors duration-200 rounded-xl border p-4 flex items-start gap-3',
		className
	)}
	{...$$restProps}
>
	<slot />
</div>
