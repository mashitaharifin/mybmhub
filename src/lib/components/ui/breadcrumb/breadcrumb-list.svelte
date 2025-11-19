<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	export let className: string = '';
	export let props: HTMLAttributes<HTMLElement> = {};
</script>

<ol {...props} class={`flex flex-wrap items-center gap-1.5 break-words ${className}`}>
	<slot />
</ol>
