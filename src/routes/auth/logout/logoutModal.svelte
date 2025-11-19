<script>
    import Button from '$lib/components/ui/button.svelte';
    import { X } from 'lucide-svelte';

    /** @type {boolean} */
    export let open = false;
</script>

<!-- The Modal Backdrop -->
{#if open}
    <!-- Backdrop: fixed, dark overlay with blur -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        on:click|self={() => (open = false)}
        on:keydown|self={(e) => { if (e.key === 'Escape') open = false; }}
    >
        <!-- Modal Content Container -->
        <div
            class="w-full max-w-sm p-6 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl shadow-red-900/30 text-white transition-all duration-300 transform scale-100 opacity-100"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <!-- Header and Close Button -->
            <div class="flex justify-between items-center mb-4">
                <h3 id="modal-title" class="text-xl font-bold text-red-500">Confirm Logout</h3>
                <button
                    on:click={() => (open = false)}
                    class="text-zinc-500 hover:text-red-500 transition-colors rounded-full p-1"
                    aria-label="Close modal"
                >
                    <X size={20} />
                </button>
            </div>

            <!-- Logout Form -->
            <form method="post" action="/logout" class="space-y-6">
                <p class="text-zinc-300">
                    Are you sure you want to log out of your session? You will need to sign in again to access your account.
                </p>

                <!-- Action Buttons -->
                <div class="flex justify-end space-x-3">
                    <!-- Cancel Button -->
                    <Button
                        type="button"
                        on:click={() => (open = false)}
                        class="px-4 py-2 text-sm font-semibold bg-zinc-700 hover:bg-zinc-600 border border-zinc-600 transition duration-200"
                    >
                        Cancel
                    </Button>

                    <!-- Logout Button (Themed) -->
                    <Button
                        type="submit"
                        class="px-4 py-2 text-sm font-bold
                            bg-gradient-to-r from-red-600 to-red-700
                            hover:from-red-700 hover:to-red-800
                            text-white shadow-md shadow-red-500/20 transition-all duration-300
                            transform hover:scale-[1.01]"
                    >
                        Logout
                    </Button>
                </div>
            </form>
        </div>
    </div>
{/if}

<!--
    Note: The use of an action="/logout" will typically submit the form to a SvelteKit
    server endpoint which handles the session destruction.
-->
