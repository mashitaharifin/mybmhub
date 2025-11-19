<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<thead
	class={cn(
		'bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300',
		'[&_tr]:border-b',
		className
	)}
	{...$$restProps}
>
	<slot />
</thead>
