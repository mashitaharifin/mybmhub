<script lang="ts">
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let className = '';
</script>

<button
  {type}
  disabled={disabled}
  {...$$restProps}
  on:click
  on:focus
  on:blur
  class={`rounded-3xl px-4 py-2 font-medium transition-colors 
    bg-red-600 text-white hover:bg-zinc-700 
    dark:bg-red-600 hover:dark:bg-zinc-700 dark:text-white dark:hover:text-red-500
    disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
>
  <slot />
</button>
