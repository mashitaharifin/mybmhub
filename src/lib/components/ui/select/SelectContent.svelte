<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	export let items: { label: string; value: string }[] = [];
	export let value: string | null = null;
	export let onSelect: (v: string) => void;
	const dispatch = createEventDispatcher();
</script>

<ul
	class="absolute z-50 mt-1 w-full max-h-48 overflow-auto rounded-md border bg-white dark:bg-gray-900
		text-gray-800 dark:text-gray-100 border-gray-200 dark:border-gray-700 shadow-lg"
>
	{#each items as item}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<li
			class="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800
				{item.value === value ? 'font-medium bg-gray-100 dark:bg-gray-800' : ''}"
			on:click={() => {
				onSelect(item.value);
				dispatch('select', item);
			}}
		>
			{item.label}
		</li>
	{/each}
</ul>
