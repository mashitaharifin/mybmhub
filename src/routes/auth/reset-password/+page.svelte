<script>
	// @ts-nocheck

	import { enhance } from '$app/forms';
	import { Lock, ArrowLeft } from 'lucide-svelte';
	import Card from '$lib/components/ui/card/card.svelte';
	import CardHeader from '$lib/components/ui/card/card-header.svelte';
	import CardTitle from '$lib/components/ui/card/card-title.svelte';
	import CardContent from '$lib/components/ui/card/card-content.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';

	// This form prop handles the server response (message, success status)
	export let form;

	let newPassword = '';
	let confirmPassword = '';

	// Frontend validation messages
	/**
	 * @type {any[] | null | undefined}
	 */
	let passwordErrors = []; // Removed JSDoc type annotation to fix the compilation error
	let isPasswordValid = false;

	// Regex for required password complexity (Updated to use new RegExp constructor)
	const PASSWORD_REGEX = new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^a-zA-Z0-9\\s]).{8,}$');

	// Function to handle client-side validation as the user types
	$: {
		passwordErrors = [];
		isPasswordValid = false;

		if (newPassword.length > 0) {
			if (newPassword.length < 8) {
				passwordErrors.push('Must be at least 8 characters long.');
			}
			if (!/[A-Z]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 uppercase letter.');
			}
			if (!/[a-z]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 lowercase letter.');
			}
			if (!/\d/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 number.');
			}
			// Check for special character (anything that isn't a letter, number, or space)
			if (!/[^a-zA-Z0-9\s]/.test(newPassword)) {
				passwordErrors.push('Must include at least 1 special character.');
			}
		}

		if (passwordErrors.length === 0 && newPassword.length >= 8) {
			isPasswordValid = true;
		}
	}

	// Function to check if confirm password matches and is not empty
	$: passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword;

	// Helper function for message classes
	/**
	 * @param {boolean | undefined} isSuccess
	 */
	function getMessageClasses(isSuccess) {
		const BASE_CLASSES =
			'text-sm text-center mt-3 p-2 border rounded-md transition-all duration-300';
		const dynamicClasses = isSuccess
			? 'text-emerald-400 bg-emerald-900/10 border-emerald-900'
			: 'text-red-400 bg-red-900/10 border-red-900';

		return `${BASE_CLASSES} ${dynamicClasses}`;
	}

	// Determine if the form can be submitted
	$: canSubmit = isPasswordValid && passwordsMatch;
</script>

<svelte:head>
	<title>Reset Password – MyBM Hub</title>
	<meta
		name="description"
		content="Reset your MyBM Hub account password securely and regain access to your personalized features."
	/>
</svelte:head>

<!-- Consistent Design: Option 1 (The Subtle Inferno Radial Gradient) -->
<div
	class="flex items-center justify-center min-h-screen text-white bg-zinc-950 [background-image:radial-gradient(at_center,_#8B000022_0%,_#0a0a0a_70%)]"
>
	<Card
		class="w-[400px] p-6 bg-zinc-900/95 backdrop-blur-sm border border-zinc-700/50 shadow-2xl shadow-red-900/20 rounded-xl"
	>
		<CardHeader>
			<CardTitle class="text-center text-4xl font-bold text-red-500 mb-1">Reset Password</CardTitle>
			<p class="text-center text-md text-zinc-300">Set your new, secure password.</p>
		</CardHeader>

		<CardContent class="pt-4">
			<!-- Note: The form action would implicitly handle the token from the URL -->
			<form method="POST" use:enhance class="space-y-6">
				<!-- New Password Input Group -->
				<div>
					<label for="newPassword" class="text-sm font-semibold text-zinc-200 block mb-1"
						>New Password</label
					>
					<div class="relative flex items-center">
						<Lock class="absolute left-3 text-red-500/70" size="18" />
						<Input
							id="newPassword"
							name="newPassword"
							type="password"
							placeholder="••••••••"
							className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 pr-12 transition duration-300"
							required={true}
							bind:value={newPassword}
						/>
					</div>

					<!-- Password Validation Feedback -->
					{#if newPassword.length > 0}
						<ul class="mt-2 text-xs space-y-1 pl-1">
							{#each passwordErrors as error}
								<li class="text-red-400 flex items-center">
									<span class="mr-1 text-base leading-none">❌</span>
									{error}
								</li>
							{/each}
							{#if passwordErrors.length === 0 && newPassword.length >= 8}
								<li class="text-emerald-400 flex items-center">
									<span class="mr-1 text-base leading-none">✅</span> All requirements met!
								</li>
							{/if}
						</ul>
					{/if}
				</div>

				<!-- Confirm Password Input Group -->
				<div>
					<label for="confirmPassword" class="text-sm font-semibold text-zinc-200 block mb-1"
						>Confirm Password</label
					>
					<div class="relative flex items-center">
						<Lock class="absolute left-3 text-red-500/70" size="18" />
						<Input
							id="confirmPassword"
							name="confirmPassword"
							type="password"
							placeholder="••••••••"
							className="bg-zinc-800 text-white border-zinc-700/60 focus:border-red-500 pl-10 pr-12 transition duration-300"
							required={true}
							bind:value={confirmPassword}
						/>
					</div>

					<!-- Confirmation Match Feedback -->
					{#if confirmPassword.length > 0 && newPassword.length > 0}
						<p
							class="mt-2 text-xs pl-1 flex items-center"
							class:text-emerald-400={passwordsMatch}
							class:text-red-400={!passwordsMatch}
						>
							{#if passwordsMatch}
								<span class="mr-1 text-base leading-none">✅</span> Passwords match.
							{:else}
								<span class="mr-1 text-base leading-none">❌</span> Passwords do not match.
							{/if}
						</p>
					{/if}
				</div>

				<!-- Submit Button - disabled until requirements are met -->
				<Button
					type="submit"
					disabled={!canSubmit}
					class="w-full mt-4 py-2 text-lg font-bold
						bg-gradient-to-r from-red-600 to-red-700
						hover:from-red-700 hover:to-red-800
						text-white shadow-lg shadow-red-500/30 transition-all duration-300
						transform hover:scale-[1.005] disabled:opacity-50 disabled:shadow-none disabled:transform-none"
				>
					Reset Password
				</Button>

				<!-- Server Feedback -->
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
					<a
						href="/auth/login"
						class="text-zinc-400 hover:text-red-400 hover:underline transition-colors flex items-center justify-center"
					>
						<ArrowLeft size="16" class="mr-1" />
						Back to Login
					</a>
				</p>
			</form>
		</CardContent>
	</Card>
</div>
