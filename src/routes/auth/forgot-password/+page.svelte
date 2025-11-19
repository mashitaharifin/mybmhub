<script>
    import { enhance } from '$app/forms';
    import { Mail, User, ArrowLeft } from 'lucide-svelte';
    import Card from '$lib/components/ui/card/card.svelte';
    import CardHeader from '$lib/components/ui/card/card-header.svelte';
    import CardTitle from '$lib/components/ui/card/card-title.svelte';
    import CardContent from '$lib/components/ui/card/card-content.svelte';
    import Input from '$lib/components/ui/input.svelte';
    import Button from '$lib/components/ui/button.svelte';

    // Reroll to plain JS to avoid compiler conflicts
    export let form; 
	let username = '';
	let email = '';

    // Helper function to dynamically calculate the message block background
    /**
	 * @param {boolean | undefined} isSuccess
	 */
    function getMessageClasses(isSuccess) {
        const BASE_CLASSES = 'text-sm text-center mt-3 p-2 border rounded-md transition-all duration-300';
        const dynamicClasses = isSuccess 
            ? 'text-emerald-400 bg-emerald-900/10 border-emerald-900'
            : 'text-red-400 bg-red-900/10 border-red-900';

        return `${BASE_CLASSES} ${dynamicClasses}`;
    }

</script>

<svelte:head>
	<title>Forgot Password – MyBM Hub</title>
	<meta
		name="description"
		content="Forgot your password? Reset it here by providing your username and email to receive a reset link."
	/>
</svelte:head>

<!-- Using Option 1: The Subtle Inferno Radial Gradient -->
<div class="flex items-center justify-center min-h-screen text-white bg-zinc-950 [background-image:radial-gradient(at_center,_#8B000022_0%,_#0a0a0a_70%)]">
    
    <Card class="w-[400px] p-6 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 shadow-2xl shadow-red-900/20 rounded-xl">
        <CardHeader>
            <CardTitle class="text-center text-4xl font-bold text-red-500 mb-1">
                Forgot Password
            </CardTitle>
            <p class="text-center text-md text-zinc-300">Enter your details to reset your access.</p>
        </CardHeader>

        <CardContent class="pt-4">
            <form method="POST" use:enhance class="space-y-6">
                <!-- Username Input Group -->
                <div>
                    <label for="username" class="text-sm font-semibold text-zinc-200 block mb-1">Username</label>
                    <div class="relative flex items-center">
                        <User class="absolute left-3 text-red-500/70" size="18" />
                        <Input
                            id="username"
                            name="username"
                            type="text"
                            placeholder="Enter your username"
                            className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 pr-12 transition duration-300"
                            required={true}
							bind:value={username}
                        />
                    </div>
                </div>

                <!-- Email Input Group -->
                <div>
                    <label for="email" class="text-sm font-semibold text-zinc-200 block mb-1">Email</label>
                    <div class="relative flex items-center">
                        <Mail class="absolute left-3 text-red-500/70" size="18" />
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="Enter your email"
                            className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 pr-12 transition duration-300"
                            required={true}
							bind:value={email}
                        />
                    </div>
                </div>

                <!-- Submit Button - gradient for a modern, impactful look -->
                <Button
                    type="submit"
                    class="w-full mt-4 py-2 text-lg font-bold
						bg-gradient-to-r from-red-600 to-red-700
						hover:from-red-700 hover:to-red-800
						text-white shadow-lg shadow-red-500/30 transition-all duration-300
						transform hover:scale-[1.005]"
                >
                    Request Reset Link
                </Button>

                <!-- Error or message feedback -->
                {#if form?.message}
                    <p class={getMessageClasses(form.success)}>
                        {#if form.success}
                            ✅
                        {:else}
                            ⚠️
                        {/if}
                        {form.message}
                    </p>
                {/if}

                <!-- Back to Login Link -->
                <p class="text-center text-sm pt-4">
                    <a href="/auth/login" class="text-zinc-400 hover:text-red-400 hover:underline transition-colors flex items-center justify-center">
                        <ArrowLeft size="16" class="mr-1" />
                        Back to Login
                    </a>
                </p>

            </form>
        </CardContent>
    </Card>
</div>