<script lang="ts">
	export let value: string;
	export let label: string;
	export let selected = false;
	export let onSelect: (v: string) => void;
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 dark:hover:bg-gray-800
		{selected ? 'font-medium bg-gray-50 dark:bg-gray-800' : ''}"
	on:click={() => onSelect(value)}
>
	{label}
</div>
