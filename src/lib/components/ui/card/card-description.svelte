<script lang="ts">
	import { cn } from '$lib/utils';

	type $$Props = any;
	let className: $$Props['class'] = undefined;
	export { className as class };
</script>

<p class={cn('text-sm text-muted-foreground', className)} {...$$restProps}>
	<slot />
</p>