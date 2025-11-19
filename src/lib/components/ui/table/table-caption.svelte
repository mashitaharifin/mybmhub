<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<caption
	class={cn(
		'mt-4 text-sm text-gray-500 dark:text-gray-400 italic',
		className
	)}
	{...$$restProps}
>
	<slot />
</caption>
