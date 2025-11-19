<script lang="ts">
	// import { cn } from '$lib/utils';
	export let className = '';

	// CardTitle is the main heading element for the card
</script>

<h3
  class={`text-2xl font-semibold leading-none tracking-tight text-text dark:text-text-dark ${className}`}
  {...$$restProps}
>
  <slot />
</h3>

