<script lang="ts">
	export let open = false;
	export let onSubmit: (reason: string) => void;
	export let onCancel: () => void;

	let reason = '';
</script>

{#if open}
	<div class="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
		<div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg w-[90%] max-w-md p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
				Reject Leave Application
			</h2>

			<!-- svelte-ignore a11y_label_has_associated_control -->
			<label class="text-sm text-gray-700 dark:text-gray-300">Reason</label>
			<!-- svelte-ignore element_invalid_self_closing_tag -->
			<textarea
				bind:value={reason}
				class="w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600
			       bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 text-sm"
				rows="4"
				placeholder="Enter rejection reason..."
			/>

			<div class="mt-5 flex justify-end gap-3">
				<button
					on:click={onCancel}
					class="px-4 py-2 rounded-md bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
				>
					Cancel
				</button>

				<button
					on:click={() => onSubmit(reason)}
					class="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
				>
					Reject
				</button>
			</div>
		</div>
	</div>
{/if}

<!-- where do we use this??  -->