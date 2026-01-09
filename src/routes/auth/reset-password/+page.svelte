<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock, ArrowLeft, Flower, Eye, EyeOff } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Input from '$lib/components/ui/input.svelte';

	export let form: { message?: string; success?: boolean };

	let newPassword = '';
	let confirmPassword = '';
	let showNewPassword = false;
	let showConfirmPassword = false;
	let passwordErrors: string[] = [];
	let isPasswordValid = false;
	let passwordsMatch = false;

	$: {
		// Reset errors
		passwordErrors = [];
		isPasswordValid = false;

		// Validate new password
		if (newPassword.length > 0) {
			if (newPassword.length < 8) {
				passwordErrors.push('Must be at least 8 characters long');
			}
			if (!/[A-Z]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 uppercase letter');
			}
			if (!/[a-z]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 lowercase letter');
			}
			if (!/\d/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 number');
			}
			if (!/[^a-zA-Z0-9\s]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 special character');
			}
		}

		// Check if password is valid
		if (passwordErrors.length === 0 && newPassword.length >= 8) {
			isPasswordValid = true;
		}

		// Check if passwords match
		passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;
	}

	// Determine if form can be submitted
	$: canSubmit = isPasswordValid && passwordsMatch;
</script>

<svelte:head>
	<title>Reset Password – MyBM Hub</title>
	<meta
		name="description"
		content="Reset your MyBM Hub account password securely and regain access to your personalized features."
	/>
</svelte:head>

<div
	class="flex items-center justify-center min-h-screen
	       bg-gradient-to-br from-red-50 via-orange-50 to-pink-50"
>
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

		<!-- Reset Password Card -->
		<Card
			class="w-full p-8 
			       bg-white/95 backdrop-blur-sm 
			       border border-white/50 
			       shadow-xl shadow-red-300/20 
			       rounded-2xl"
		>
			<CardHeader class="pb-6">
				<CardTitle class="text-center text-2xl font-bold text-gray-800 mb-2">
					Reset Password
				</CardTitle>
				<p class="text-center text-gray-500">Set your new, secure password</p>
			</CardHeader>

			<CardContent>
				<form method="POST" use:enhance class="space-y-5">
					<!-- New Password Field -->
					<div>
						<label for="newPassword" class="text-sm font-medium text-gray-700 block mb-2">
							New Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Lock class="h-5 w-5 text-red-400" />
							</div>
							<Input
								id="newPassword"
								name="newPassword"
								type={showNewPassword ? 'text' : 'password'}
								placeholder="Enter new password"
								className="w-full pl-10 pr-10
								          bg-white border-gray-300 
								          focus:border-red-400 focus:ring-2 focus:ring-red-200
								          placeholder:text-gray-400
								          transition duration-200"
								required={true}
								bind:value={newPassword}
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 pr-3 flex items-center
								       text-gray-400 hover:text-red-500 transition-colors"
								on:click={() => (showNewPassword = !showNewPassword)}
								title={showNewPassword ? 'Hide password' : 'Show password'}
							>
								{#if showNewPassword}
									<EyeOff class="h-5 w-5" />
								{:else}
									<Eye class="h-5 w-5" />
								{/if}
							</button>
						</div>

						<!-- Password Validation Feedback -->
						{#if newPassword.length > 0}
							<div class="mt-2 space-y-1">
								{#each passwordErrors as error}
									<div class="flex items-center text-xs text-red-600">
										<div class="w-4 h-4 flex items-center justify-center mr-1.5">
											❌
										</div>
										<span>{error}</span>
									</div>
								{/each}
								{#if isPasswordValid}
									<div class="flex items-center text-xs text-emerald-600">
										<div class="w-4 h-4 flex items-center justify-center mr-1.5">
											✅
										</div>
										<span>All password requirements met!</span>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Confirm Password Field -->
					<div>
						<label for="confirmPassword" class="text-sm font-medium text-gray-700 block mb-2">
							Confirm Password
						</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<Lock class="h-5 w-5 text-red-400" />
							</div>
							<Input
								id="confirmPassword"
								name="confirmPassword"
								type={showConfirmPassword ? 'text' : 'password'}
								placeholder="Confirm new password"
								className="w-full pl-10 pr-10
								          bg-white border-gray-300 
								          focus:border-red-400 focus:ring-2 focus:ring-red-200
								          placeholder:text-gray-400
								          transition duration-200"
								required={true}
								bind:value={confirmPassword}
							/>
							<button
								type="button"
								class="absolute inset-y-0 right-0 pr-3 flex items-center
								       text-gray-400 hover:text-red-500 transition-colors"
								on:click={() => (showConfirmPassword = !showConfirmPassword)}
								title={showConfirmPassword ? 'Hide password' : 'Show password'}
							>
								{#if showConfirmPassword}
									<EyeOff class="h-5 w-5" />
								{:else}
									<Eye class="h-5 w-5" />
								{/if}
							</button>
						</div>

						<!-- Password Match Feedback -->
						{#if confirmPassword.length > 0}
							<div class="mt-2">
								<div class="flex items-center text-xs" 
								     class:text-emerald-600={passwordsMatch}
								     class:text-red-600={!passwordsMatch}>
									<div class="w-4 h-4 flex items-center justify-center mr-1.5">
										{#if passwordsMatch}✅{:else}❌{/if}
									</div>
									<span>
										{#if passwordsMatch}
											Passwords match
										{:else}
											Passwords do not match
										{/if}
									</span>
								</div>
							</div>
						{/if}
					</div>

					<!-- Submit Button -->
					<button
						type="submit"
						disabled={!canSubmit}
						class="w-full py-3 px-4 text-base font-semibold
	       			bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-600/40 hover:to-orange-500/40 text-white
	       			shadow-lg shadow-pink-400/30 transition-all duration-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2
	       			active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-pink-600 disabled:hover:to-orange-500"
					>
						Reset Password
					</button>

					<!-- Server Feedback -->
					{#if form?.message}
						<div class="mt-4 p-3 rounded-lg border" 
						     class:bg-emerald-50={form.success}
						     class:bg-red-50={!form.success}
						     class:border-emerald-200={form.success}
						     class:border-red-200={!form.success}>
							<p class="text-sm text-center font-medium" 
							   class:text-emerald-700={form.success}
							   class:text-red-700={!form.success}>
								{#if form.success}
									✅
								{:else}
									⚠️
								{/if}
								{form.message}
							</p>
						</div>
					{/if}

					<!-- Back to Login Link -->
					<div class="mt-6 pt-6 border-t border-gray-100">
						<a
							href="/auth/login"
							class="flex items-center justify-center text-sm text-red-600 hover:text-red-700 hover:underline transition-colors font-medium"
						>
							<ArrowLeft class="w-4 h-4 mr-2" />
							Back to Login
						</a>
					</div>
				</form>
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