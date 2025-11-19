<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	export let className: string = '';
	export let props: HTMLAttributes<HTMLLIElement> = {};
</script>

<li {...props} class={`inline-flex items-center gap-1 ${className}`}>
	<slot />
</li>
