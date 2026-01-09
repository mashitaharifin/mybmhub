<script lang="ts">
  export let type: 'button' | 'submit' | 'reset' = 'button';
  export let disabled = false;
  export let className = '';
  export let variant: 'primary' | 'secondary' | 'default' | 'destructive' = 'primary';
</script>

<button
  {type}
  disabled={disabled}
  {...$$restProps}
  on:click
  on:focus
  on:blur
  class={`rounded-3xl px-4 py-2 font-medium transition-colors 
    ${
      variant === 'primary'
        ? 'bg-red-500 text-white hover:bg-gray-400 dark:bg-purple-800 dark:hover:bg-gray-700 dark:text-white'
        : variant === 'secondary'
        ? 'bg-gray-500 text-white hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
        : variant === 'destructive'
        ? 'bg-red-500 text-white hover:bg-red-600 dark:bg-red-700 dark:hover:bg-red-600'
        : 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
    }
    disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
>
  <slot />
</button>
