<script lang="ts">
	import { enhance } from '$app/forms';
	import { Eye, EyeOff, User, LockKeyhole, Flower } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';

	let showPassword = false;
	let username = '';
	let password = '';

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
	class="flex items-center justify-center min-h-screen
	       bg-gradient-to-br from-red-50 via-orange-50 to-pink-50"
>
	<!-- Main Container -->
	<div class="w-full max-w-md p-6">
		<!-- Logo/Company Header -->
		<div class="text-center mb-8">
			<div class="inline-flex items-center justify-center mb-4">
				<div
					class="w-14 h-14 rounded-2xl
				           bg-gradient-to-br from-red-300 via-orange-300 to-pink-300
				           flex items-center justify-center
				           shadow-lg shadow-red-300/30"
				>
					<Flower class="w-7 h-7 text-white" />
				</div>
			</div>
			<h1 class="text-3xl font-bold text-gray-800 mb-2">
				MyBM <span class="text-red-600">Hub</span>
			</h1>
			<p class="text-gray-600 text-sm">Employee Leave & Attendance Management System</p>
		</div>

		<!-- Login Card -->
		<Card
			class="w-full p-8 
			       bg-white/95 backdrop-blur-sm 
			       border border-white/50 
			       shadow-xl shadow-red-300/20 
			       rounded-2xl"
		>
			<CardHeader class="pb-6">
				<CardTitle class="text-center text-2xl font-bold text-gray-800 mb-2">
					Welcome Back
				</CardTitle>
				<p class="text-center text-gray-500">Sign in to continue to your account</p>
			</CardHeader>

			<CardContent>
				<form method="POST" use:enhance class="space-y-5">
					<!-- Username Field -->
					<div>
						<label for="username" class="text-sm font-medium text-gray-700 block mb-2">
							Username
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<User class="h-5 w-5 text-red-400" />
							</div>
							<Input
								id="username"
								name="username"
								type="text"
								placeholder="Enter your username"
								className="w-full pl-10 
								          bg-white border-gray-300 
								          focus:border-red-400 focus:ring-2 focus:ring-red-200
								          placeholder:text-gray-400
								          transition duration-200"
								required={true}
								bind:value={username}
							/>
						</div>
					</div>

					<!-- Password Field -->
					<div>
						<label for="password" class="text-sm font-medium text-gray-700 block mb-2">
							Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<LockKeyhole class="h-5 w-5 text-red-400" />
							</div>
							<Input
								id="password"
								name="password"
								type={showPassword ? 'text' : 'password'}
								placeholder="Enter your password"
								className="w-full pl-10 pr-10
								          bg-white border-gray-300 
								          focus:border-red-400 focus:ring-2 focus:ring-red-200
								          placeholder:text-gray-400
								          transition duration-200"
								required={true}
								bind:value={password}
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 pr-3 flex items-center
								       text-gray-400 hover:text-red-500 transition-colors"
								on:click={() => (showPassword = !showPassword)}
								title={showPassword ? 'Hide password' : 'Show password'}
							>
								{#if showPassword}
									<EyeOff class="h-5 w-5" />
								{:else}
									<Eye class="h-5 w-5" />
								{/if}
							</button>
						</div>
					</div>

					<!-- Forgot Password Link -->
					<div class="flex justify-end">
						<a
							href="/auth/forgot-password"
							class="text-sm text-red-600 hover:text-red-700 hover:underline transition-colors font-medium"
						>
							Forgot password?
						</a>
					</div>

					<!-- Login Button -->
					<button
						type="submit"
						class="w-full py-3 px-4 text-base font-semibold
	       			bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-600/40 hover:to-orange-500/40 text-white
	       			shadow-lg shadow-pink-400/30 transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
	       			active:scale-[0.98]"
					>
						Sign In
					</button>

					<!-- Error Message -->
					{#if form?.message}
						<div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
							<p class="text-red-700 text-sm text-center font-medium">
								⚠️ {form.message}
							</p>
						</div>
					{/if}
				</form>

				<!-- Footer Text -->
				<div class="mt-6 pt-6 border-t border-gray-100">
					<p class="text-center text-sm text-gray-500">
						Need help? Contact your system administrator
					</p>
				</div>
			</CardContent>
		</Card>

		<!-- Version/Footer -->
		<div class="mt-6 text-center">
			<p class="text-xs text-gray-400">© 2026 MyBM Hub • v1.0.0</p>
		</div>
	</div>
</div>

<style>
	/* Custom focus styles */
	:global(input:focus) {
		outline: none;
		box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.1);
	}

	/* Smooth transitions */
	:global(*) {
		transition: all 0.2s ease-in-out;
	}
</style>
