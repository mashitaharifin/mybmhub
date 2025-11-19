<script lang="ts">
	import { cn } from '$lib/utils';
	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<div class="relative w-full overflow-x-auto rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
	<table
		class={cn(
			'w-full caption-bottom text-sm text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-900 transition-colors duration-200',
			className
		)}
		{...$$restProps}
	>
		<slot />
	</table>
</div>
