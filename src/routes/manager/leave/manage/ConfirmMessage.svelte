<script lang="ts">
	import Button from '$lib/components/ui/button.svelte';
	import { X } from 'lucide-svelte';

	export let config: {
		type: 'approve' | 'cancel' | 'reject';
		title: string;
		message: string;
		targetId: number;
		requiresInput?: boolean;
	};

	export let onConfirm: (action: string, id: number, reason?: string) => void;
	export let onCancel: () => void;

	let rejectReason = '';

	function handleConfirm() {
		if (config.type === 'reject' && config.requiresInput) {
			onConfirm(config.type, config.targetId, rejectReason);
		} else {
			onConfirm(config.type, config.targetId);
		}
	}
</script>

<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
	<div class="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
		<!-- Header -->
		<div class="flex justify-between items-start mb-4">
			<h3 class="text-lg font-semibold text-gray-800 dark:text-gray-200">{config.title}</h3>
			<button
				on:click={onCancel}
				class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
			>
				<X class="w-5 h-5" />
			</button>
		</div>

		<div class="space-y-4">
			<!-- Message -->
			<p class="text-gray-600 dark:text-gray-300">{config.message}</p>

			<!-- Input for reject reason -->
			{#if config.type === 'reject' && config.requiresInput}
				<div>
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						Reason for rejection
					</label>
					<textarea
						bind:value={rejectReason}
						class="w-full border border-gray-300 dark:border-gray-600 rounded p-3 text-sm dark:bg-gray-700 dark:text-gray-100"
						rows="4"
						placeholder="Enter reason for rejection..."
					></textarea>
				</div>
			{/if}

			<!-- Buttons -->
			<div class="flex justify-end space-x-3">
				<Button variant="outline" on:click={onCancel}>
					Cancel
				</Button>
				<Button
					variant={config.type === 'reject' ? 'destructive' : 'default'}
					on:click={handleConfirm}
					disabled={config.type === 'reject' && config.requiresInput && !rejectReason.trim()}
				>
					{config.type === 'approve' ? 'Approve' : 
					 config.type === 'cancel' ? 'Cancel' : 'Reject'}
				</Button>
			</div>
		</div>
	</div>
</div>