<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<div
	class={cn(
		'text-sm text-gray-700 dark:text-gray-300 [&_p]:leading-relaxed',
		className
	)}
	{...$$restProps}
>
	<slot />
</div>
