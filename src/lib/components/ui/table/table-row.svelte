<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<tr
	class={cn(
		'border-b border-gray-200 dark:border-gray-700 transition-colors duration-150',
		'hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer',
		'data-[state=selected]:bg-red-100 dark:data-[state=selected]:bg-red-900/40',
		className
	)}
	{...$$restProps}
>
	<slot />
</tr>
