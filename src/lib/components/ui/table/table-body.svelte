<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<tbody
	class={cn(
		'divide-y divide-gray-200 dark:divide-gray-700',
		'[&_tr:last-child]:border-0',
		className
	)}
	{...$$restProps}
>
	<slot />
</tbody>
