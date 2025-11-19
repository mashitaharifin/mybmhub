<script lang="ts">
	import { enhance } from '$app/forms';
	import { Eye, EyeOff, User, LockKeyhole } from 'lucide-svelte'; // Added User and LockKeyhole icons for input polish
	import Card from '$lib/components/ui/card/card.svelte';
	// Note: Importing CardHeader, CardTitle, and CardContent separately like this is often redundant
	// if they are just being used as aliases for the same component in your $lib/components/ui/card.svelte
	// Assuming they are distinct styled components from a library like shadcn/svelte:
	import CardHeader from '$lib/components/ui/card/card-header.svelte'; 
	import CardTitle from '$lib/components/ui/card/card-title.svelte'; 
	import CardContent from '$lib/components/ui/card/card-content.svelte'; 
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let showPassword = false;
	let username = '';
	let password = '';
	console.log('✅ Loaded login page from routes/auth/login');
	export let form: { message?: string };
</script>

<svelte:head>
	<title>Login – MyBM Hub</title>
	<meta
		name="description"
		content="Login to your MyBM Hub account to access personalized features and manage your settings."
	/>
</svelte:head>

<div
	class="flex items-center justify-center min-h-screen bg-zinc-950 text-white [background-image:radial-gradient(at_center,_#8B000022_0%,_#0a0a0a_70%)]"
>
	<Card
		class="w-[400px] p-6 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 shadow-2xl shadow-red-900/20 rounded-xl"
	>
		<CardHeader>
			<CardTitle class="text-center text-4xl font-bold text-red-500 mb-1">
				Welcome Back
			</CardTitle>
			<p class="text-center text-md text-zinc-300">Please sign in to your account </p>
		</CardHeader>

		<CardContent class="pt-4">
			<form method="POST" use:enhance class="space-y-6">
				<div>
					<label for="username" class="text-sm font-semibold text-zinc-200 block mb-1"
						>Username</label
					>
					<div class="relative flex items-center">
						<User class="absolute left-3 text-red-500/70" size="18" />
						<Input
							id="username"
							name="username"
							type="text"
							placeholder="Enter your username"
							className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 transition duration-300"
							required={true}
							bind:value={username}
						/>
					</div>
				</div>

				<div class="relative">
					<label for="password" class="text-sm font-semibold text-zinc-200 block mb-1"
						>Password</label
					>
					<div class="relative flex items-center">
						<LockKeyhole class="absolute left-3 text-red-500/70" size="18" />
						<Input
							id="password"
							name="password"
							type={showPassword ? 'text' : 'password'}
							placeholder="••••••••"
							className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 pr-12 transition duration-300"
							required={true}
							bind:value={password}
						/>
						<button
							type="button"
							class="absolute right-3 text-zinc-400 hover:text-red-500 transition-colors"
							on:click={() => (showPassword = !showPassword)}
						>
							{#if showPassword}
								<EyeOff size="18" />
							{:else}
								<Eye size="18" />
							{/if}
						</button>
					</div>
				</div>

				<p class="text-right text-sm pt-1">
					<a
						href="/auth/forgot-password"
						class="text-red-400 hover:text-red-300 hover:underline transition-colors"
					>
						Forgot password?
					</a>
				</p>

				<Button
					type="submit"
					class="w-full mt-4 py-2 text-lg font-bold
						bg-gradient-to-r from-red-600 to-red-700
						hover:from-red-700 hover:to-red-800
						text-white shadow-lg shadow-red-500/30 transition-all duration-300
						transform hover:scale-[1.005]"
				>
					Login
				</Button>

				{#if form?.message}
					<p
						class="text-red-400 text-sm text-center mt-3 p-2 bg-red-900/10 border border-red-900 rounded-md"
					>
						⚠️ {form.message}
					</p>
				{/if}
			</form>
		</CardContent>
	</Card>
</div>
