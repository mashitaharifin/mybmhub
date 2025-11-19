<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<td
	class={cn(
		'p-4 align-middle text-gray-700 dark:text-gray-300',
		'group-hover:text-gray-900 dark:group-hover:text-white',
		className
	)}
	{...$$restProps}
>
	<slot />
</td>
