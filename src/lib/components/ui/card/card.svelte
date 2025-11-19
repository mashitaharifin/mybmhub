<script lang="ts">
    // NOTE: If you use the `cn` utility, you should import it here
    // import { cn } from '$lib/utils'; 

    export let className: string = '';
    
    // If you were using the cn utility, your export would look like this:
    // export { className as class };
    // let className: $$Props['class'] = undefined;
</script>

<div 
    class={`rounded-2xl p-5 border shadow-sm transition-colors 
    bg-card text-text border-border 
    dark:bg-card-dark dark:text-text-dark dark:border-border-dark ${className}`} 
    {...$$restProps}
>
    <slot />
</div>