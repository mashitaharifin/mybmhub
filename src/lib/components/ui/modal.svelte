<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  const dispatch = createEventDispatcher();

  export let title: string;
  export let size: 'sm' | 'md' | 'lg' = 'md';

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      dispatch('close');
    }
  }

  function handleKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      dispatch('close');
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKey);
  });

  onDestroy(() => {
    document.removeEventListener('keydown', handleKey);
  });
</script>

<!-- Overlay -->
<!-- svelte-ignore a11y_interactive_supports_focus -->
<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
  role="dialog"
  on:click={handleBackdropClick}
>
  <!-- Modal panel -->
  <div
    class={`relative bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full ${
      size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl'
    } mx-4`}
  >
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <button
        class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        on:click={() => dispatch('close')}
      >
        ✕
      </button>
    </div>

    <!-- Body -->
    <div class="p-6 overflow-y-auto max-h-[80vh]">
      <slot />
    </div>
  </div>
</div>

<style>
  /* Ensures modal overlay always sits above shadcn/bits UI layers */
  :global(body) {
    overflow: hidden; /* Prevent background scroll */
  }
</style>
