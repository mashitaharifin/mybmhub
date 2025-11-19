<script lang="ts">
  export let type: string = 'text';
  export let value: string | number | undefined = undefined;
  export let placeholder: string = '';
  export let className: string = '';
  export let id: string | undefined = undefined;
  export let name: string | undefined = undefined;
</script>

<input
  {type}
  {placeholder}
  {id}
  {name}
  class={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white
    dark:border-gray-600 focus:border-red-600 focus:ring-1 focus:ring-red-600
    placeholder-gray-400 outline-none transition-colors ${className}`}
  {value}
  on:input={(e) => value = e.currentTarget.value}
  {...$$restProps}
/>