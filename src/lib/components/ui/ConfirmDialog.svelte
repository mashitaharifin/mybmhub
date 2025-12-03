<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	export let title = '';
	export let message = '';
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50">
	<div class="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 max-w-md w-full space-y-4">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
		<p class="text-gray-700 dark:text-gray-300">{message}</p>

		<div class="flex justify-end gap-2 mt-4">
			<Button variant="outline" class="bg-gray-300 dark:bg-gray-700 text-gray-900 dark:text-gray-100" on:click={() => dispatch('cancel')}>No</Button>
			<Button class="bg-red-600 dark:bg-red-500 text-white" on:click={() => dispatch('confirm')}>Yes, I'am sure</Button>
		</div>
	</div>
</div>
