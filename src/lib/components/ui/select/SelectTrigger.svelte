<script lang="ts">
	// svelte-ignore export_let_unused
	export let open = false;
	export let toggle: () => void;
	export let label: string = 'Select';
	export let placeholder: string = 'Select option';
</script>

<button
	type="button"
	on:click={toggle}
	class="flex justify-between items-center w-full px-3 py-2 text-sm rounded-lg border
		bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100
		border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600
		focus:ring-2 focus:ring-primary-500 outline-none transition"
>
	<span>{label || placeholder}</span>
	<svg
		class="w-4 h-4 ml-2 opacity-70"
		fill="none"
		stroke="currentColor"
		viewBox="0 0 24 24"
	>
		<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
	</svg>
</button>
