<script lang="ts">
	export let className: string = '';
	export let hoverEffect: boolean = true;
	export let padding: boolean = true;
</script>

<div class="relative bg-white/60 dark:bg-black/[0.01] z-10
    backdrop-blur-lg border border-white/60 dark:border-white/10
    rounded-2xl shadow-sm transition-all duration-300
    {hoverEffect ? 'hover:bg-gray-300/20 dark:hover:bg-white/[0.10] hover:scale-[1.01]' : ''}
    {padding ? 'p-5 lg:p-2' : ''}
    {className}"
>
	<!-- svelte-ignore element_invalid_self_closing_tag -->
	<div
		class="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none"
	/>
	<slot />
</div>