<script lang="ts">
	export let open = false;
	export let onOpenChange: (v: boolean) => void = () => {};
</script>

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
		on:click={() => onOpenChange(false)}
	>
		<slot />
	</div>
{/if}
