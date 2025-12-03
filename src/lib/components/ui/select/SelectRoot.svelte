<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let value: string | null = null;
	export let name: string = '';
	export let open = false;
	
	// Add these props for two-way binding
	export { value as bindValue };
	export { open as bindOpen };
	
	const dispatch = createEventDispatcher();

	function toggle() {
		open = !open;
		dispatch('toggle', { open });
	}
	
	// Handle value changes
	$: if (value !== undefined) {
		dispatch('change', { value });
	}
</script>

<div class="relative inline-block w-full">
	<slot name="trigger" {open} {toggle} value={value}></slot>
	{#if open}
		<slot name="content" {value}></slot>
	{/if}
	<input type="hidden" name={name} value={value ?? ''} />
</div>