<script lang="ts">
  export let value: string = '';
  export let placeholder: string = 'Select option';
  export let options: Array<{ value: string; label: string }> = [];
  export let name: string = '';
  export let disabled: boolean = false;
  
  $: selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;
</script>

<div class="relative">
  <select
    {value}
    {name}
    {disabled}
    on:change
    class="w-full px-3 py-2 text-sm rounded-lg border
           bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100
           border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600
           focus:ring-2 focus:ring-primary-500 outline-none transition
           appearance-none pr-8"
  >
    {#each options as option}
      <option value={option.value}>{option.label}</option>
    {/each}
  </select>
  <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-gray-300">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </div>
</div>