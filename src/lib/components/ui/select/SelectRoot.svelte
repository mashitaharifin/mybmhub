<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let value: string | null = null;
	export let name: string = '';
	export let open = false;
	const dispatch = createEventDispatcher();

	function toggle() {
		open = !open;
		dispatch('toggle', { open });
	}
</script>

<div class="relative inline-block w-full">
	<slot name="trigger" {open} {toggle}></slot>
	{#if open}
		<slot name="content" {value}></slot>
	{/if}
	<input type="hidden" name={name} value={value ?? ''} />
</div>
