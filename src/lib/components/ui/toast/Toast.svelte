<script lang="ts">
	import { toasts, type ToastOptions } from './use-toast';
	import { fly } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import { onDestroy } from 'svelte';

	let items: ToastOptions[] = [];

	const unsubscribe = toasts.subscribe((v) => (items = v));
	onDestroy(unsubscribe);

	function remove(id: number) {
		toasts.update((t) => t.filter((x) => x.id !== id));
	}

	// Helper function to get variant classes
	function getVariantClasses(variant: string) {
		const baseClasses = 'rounded-lg shadow-lg border p-4 w-80 flex justify-between items-start ';
		
		switch (variant) {
			case 'success':
				return baseClasses + 'bg-green-50 border-green-200 text-green-900 dark:bg-green-900/20 dark:border-green-800 dark:text-green-100';
			case 'destructive':
				return baseClasses + 'bg-red-50 border-red-200 text-red-900 dark:bg-red-900/20 dark:border-red-800 dark:text-red-100';
			case 'info':
				return baseClasses + 'bg-blue-50 border-blue-200 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-100';
			default:
				return baseClasses + 'bg-white border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-100';
		}
	}
</script>

<div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
	{#each items as t (t.id)}
		<div
			transition:fly="{{ x: 50, duration: 200 }}"
			class={getVariantClasses(t.variant || 'default')}
		>
			<div class="flex flex-col">
				<p class="font-semibold text-sm">{t.title}</p>
				{#if t.description}
					<p class="text-xs mt-1 opacity-80">{t.description}</p>
				{/if}
			</div>
			<button
				type="button"
				class="ml-3 opacity-60 hover:opacity-100"
				on:click={() => remove(t.id!)}
			>
				<X class="w-4 h-4" />
			</button>
		</div>
	{/each}
</div>