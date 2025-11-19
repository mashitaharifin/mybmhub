<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<h5
	class={cn(
		'mb-1 font-semibold leading-none tracking-tight text-gray-900 dark:text-gray-100',
		className
	)}
	{...$$restProps}
>
	<slot />
</h5>
