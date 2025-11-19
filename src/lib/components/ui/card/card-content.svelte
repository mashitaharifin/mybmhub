<script lang="ts">
	// import { cn } from '$lib/utils';
	export let className = '';

	// CardContent wraps the main body of the card, often used for forms or detail text.
	// The 'pt-0' ensures it flows well immediately after CardHeader.
</script>

<div class={`p-6 pt-0 ${className}`} {...$$restProps}>
	<slot />
</div>
