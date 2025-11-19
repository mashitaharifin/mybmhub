<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let title: string = '';
	export let maxWidth = 'max-w-lg';
	const dispatch = createEventDispatcher();
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	on:click|stopPropagation
	class={`relative w-full ${maxWidth} mx-4 p-6 rounded-xl shadow-lg border bg-white dark:bg-gray-900
		text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 transition`}
>
	<slot name="header">
		<div class="flex justify-between items-center mb-3">
			<h3 class="text-lg font-semibold">{title}</h3>
			<button
				type="button"
				on:click={() => dispatch('close')}
				class="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
			>
				✕
			</button>
		</div>
	</slot>

	<slot />
</div>
