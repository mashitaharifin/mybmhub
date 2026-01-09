<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import {
		Breadcrumb,
		BreadcrumbList,
		BreadcrumbItem,
		BreadcrumbLink,
		BreadcrumbSeparator,
		BreadcrumbPage
	} from '$lib/components/ui/breadcrumb';
	import { Camera, UserCircle2, Lock, BriefcaseBusiness } from 'lucide-svelte';
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	// --- Load server data ---
	export let data: {
		 dashboardPath: string | undefined; profile: any 
};

	let profileData = data.profile || {
		name: 'Mashitah Arifin',
		email: 'mashitaharifin@gmail.com',
		phone: '012-3456789',
		address: '123 Main St',
		jobTitle: 'Software Engineer',
		department: 'IT',
		employmentType: 'Intern',
		joinDate: '2025-08-04',
		avatarUrl: '',
	};

	let activeTab = 'profile';
	let isEditing = false;

	let name = profileData.name || '';
	let email = profileData.email || '';
	let phone = profileData.phone || '';
	let address = profileData.address || '';
	let avatarUrl = profileData.avatarUrl || '';
	let departments: { id: number; deptName: string }[] = [];
	let departmentName = '';

	let currentPassword = '';
	let newPassword = '';
	let confirmPassword = '';

	let errors = {
		newPassword: '',
		confirmPassword: ''
	};

	// Email validation
	$: emailError =
		email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Please enter a valid email address.' : '';

	// Password strength
	function getPasswordStrength(pwd: string) {
		if (pwd.length < 6) return { label: 'Weak', score: 1, color: 'bg-red-500' };
		if (pwd.length < 10) return { label: 'Medium', score: 2, color: 'bg-yellow-500' };
		if (pwd.match(/[A-Z]/) && pwd.match(/[0-9]/) && pwd.match(/[^A-Za-z0-9]/))
			return { label: 'Strong', score: 3, color: 'bg-green-500' };
		return { label: 'Good', score: 2, color: 'bg-yellow-500' };
	}

	$: passwordStrength = getPasswordStrength(newPassword);

	// Password match
	$: passwordMatchError =
		newPassword && confirmPassword && newPassword !== confirmPassword
			? 'Passwords do not match.'
			: '';

	// --- Password Validation ---
	function validateNewPassword() {
		if (!newPassword) {
			errors.newPassword = 'Password is required';
		} else if (newPassword.length < 8) {
			errors.newPassword = 'Password must be at least 8 characters';
		} else if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
			errors.newPassword = 'Include at least one uppercase letter and number';
		} else {
			errors.newPassword = '';
		}
	}

	function validateConfirmPassword() {
		if (!confirmPassword) {
			errors.confirmPassword = 'Please confirm your password';
		} else if (confirmPassword !== newPassword) {
			errors.confirmPassword = 'Passwords do not match';
		} else {
			errors.confirmPassword = '';
		}
	}

	$: validateNewPassword();
	$: validateConfirmPassword();

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 8000);
	}

	// --- Save profile info ---
	async function saveProfile() {
		const res = await fetch('/profile/api/update', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, email, phone, address })
		});

		const data = await res.json();
		if (res.ok && data.success) {
			showAlert(data.message || 'Profile updated successfully.', 'success');
			await invalidateAll();
			isEditing = false;
		} else {
			showAlert(data.message || 'Failed to update profile.', 'error');
		}
	}

	// --- Change password ---
	async function changePassword() {
		validateNewPassword();
		validateConfirmPassword();

		if (errors.newPassword || errors.confirmPassword) {
			showAlert('Please fix all validation errors first.', 'error');
			return;
		}

		const res = await fetch('/profile/api/password', {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
		});

		const data = await res.json();
		if (res.ok) {
			showAlert('Password updated successfully.', 'success');
			currentPassword = newPassword = confirmPassword = '';
		} else {
			showAlert(data.message || 'Failed to update password.', 'error');
		}
	}

	// --- Handle avatar upload ---
	async function handleImageUpload(e: Event) {
		const target = e.target as HTMLInputElement;
		if (!target.files?.length) return;

		const file = target.files[0];
		const formData = new FormData();
		formData.append('avatar', file);

		const res = await fetch('/profile/api/upload', {
			method: 'POST',
			body: formData
		});

		const json = await res.json();
		if (res.ok && json.success) {
			avatarUrl = json.data.url;
			showAlert(json.message || 'Profile picture updated successfully.', 'success');
		} else {
			showAlert(json.message || 'Failed to upload picture.', 'error');
		}
	}

	$: breadcrumbPage =
		activeTab === 'password'
			? 'Change Password'
			: activeTab === 'company'
				? 'Company Information'
				: 'My Profile';

	onMount(async () => {
		try {
			const res = await fetch('/profile/api/departments');
			const json = await res.json();

			if (res.ok && json.success) {
				departments = json.data;

				// Find department name by ID
				const dept = departments.find((d) => d.id === profileData.department);
				departmentName = dept ? dept.deptName : '-';
			}
		} catch (err) {
			console.error('Failed to fetch department name:', err);
			departmentName = '-';
		}
	});
</script>

<svelte:head>
	<title>My Profile – MyBM Hub</title>
	<meta name="description" content="Manage your account details and password in MyBM Hub." />
</svelte:head>

<Card.Root class="w-full p-6 space-y-4">
	<Card.Header>
		<div class="flex flex-col">
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href={data.dashboardPath}>Dashboard</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbPage>My Profile</BreadcrumbPage>
					</BreadcrumbItem>
					{#if activeTab !== 'profile'}
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>{breadcrumbPage}</BreadcrumbPage>
						</BreadcrumbItem>
					{/if}
				</BreadcrumbList>
			</Breadcrumb>

			<br />
			<div>
				<Card.Title>My Profile</Card.Title>
				<Card.Description class="text-gray-500 dark:text-gray-400">
					Manage your personal details and keep your account secure.
				</Card.Description>
			</div>
		</div>
	</Card.Header>
</Card.Root>

<div class="space-y-6 pt-1 pb-6 px-4 sm:px-6">
	<!-- Main Content Card -->
	<Card.Root class="w-full">
		<Card.Content class="p-5">
			{#if alertMessage}
				<div class="mb-6">
					<Alert.Root variant={alertVariant}>
						<Alert.Title>
							{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
						</Alert.Title>
						<Alert.Description>{alertMessage}</Alert.Description>
					</Alert.Root>
				</div>
			{/if}

			<Tabs.Root value={activeTab} onValueChange={(v) => (activeTab = v)}>
				<Tabs.List class="mb-1 border-b pb-1 -mt-1 flex overflow-x-auto whitespace-nowrap scrollbar-hide">
					<Tabs.Trigger value="profile" class="px-4 py-2 flex items-center gap-2 shrink-0">
						<UserCircle2 class="w-4 h-4 mr-2" />My Profile
					</Tabs.Trigger>
					<Tabs.Trigger value="company" class="px-4 py-2 flex items-center gap-2 shrink-0">
						<BriefcaseBusiness class="w-4 h-4 mr-2" />Company Info
					</Tabs.Trigger>
					<Tabs.Trigger value="password" class="px-4 py-2 flex items-center gap-2 shrink-0">
						<Lock class="w-4 h-4 mr-2" />Change Password
					</Tabs.Trigger>
				</Tabs.List>

				<!-- 🧍 Profile Tab -->
				<Tabs.Content value="profile" class="pt-4">
					<GlassCard className="space-y-8 p-4 sm:p-6" hoverEffect={false}>
						<!-- Avatar Section -->
						<div class="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-4 sm:p-6 rounded-lg text-center sm:text-left">
							<div class="relative w-28 h-28">
								<!-- svelte-ignore a11y_img_redundant_alt -->
								<div
									class="w-32 h-32 p-1 rounded-full bg-gradient-to-br from-pink-300 via-red-300 to-red-300 dark:from-[#2a0f1f] dark:via-[#3b164a] dark:to-[#7a1f3d] flex items-center justify-center"
								>
									{#if avatarUrl}
										<img
											src={avatarUrl}
											alt="Profile picture"
											class="rounded-full object-cover w-28 h-28"
										/>
									{:else}
										<div
											class="w-28 h-28 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-3xl font-semibold text-pink-600 dark:text-purple-400"
										>
											{name ? name.charAt(0).toUpperCase() : 'U'}
										</div>
									{/if}
								</div>

								<label
									for="avatar-upload"
									class="absolute bottom-1 right-1 bg-orange-600 text-white p-2 rounded-full cursor-pointer hover:bg-gray-400 shadow-lg transition-colors"
									title="Change Picture"
								>
									<Camera class="w-4 h-4" />
								</label>
								<input
									id="avatar-upload"
									type="file"
									accept="image/*"
									class="hidden"
									on:change={handleImageUpload}
								/>
							</div>

							<div class="space-y-2 max-w-xs">
								<p class="font-semibold text-xl text-gray-900 dark:text-white">{name}</p>
								<p class="text-gray-600 dark:text-gray-300 text-base">{email}</p>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									Click the camera icon to change your profile picture
								</p>
							</div>
						</div>

						<!-- Info Fields -->
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-2">
							<div class="space-y-2 max-w-xs">
								<!-- svelte-ignore a11y_label_has_associated_control -->
								<label class="text-sm font-semibold text-gray-700 dark:text-gray-300"> Name </label>
								<input
									class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
									bind:value={name}
									disabled={!isEditing}
								/>
							</div>

							<!-- svelte-ignore a11y_label_has_associated_control -->
							<div class="space-y-2 max-w-xs">
								<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
									Email
								</label>
								<input
									class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
									type="email"
									bind:value={email}
									disabled={!isEditing}
								/>
								{#if emailError}
									<p class="text-sm text-red-500 mt-1">{emailError}</p>
								{/if}
							</div>

							<div class="space-y-2 max-w-xs">
								<!-- svelte-ignore a11y_label_has_associated_control -->
								<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
									Phone
								</label>
								<input
									class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
									bind:value={phone}
									disabled={!isEditing}
								/>
							</div>

							<div class="space-y-2 max-w-xs">
								<!-- svelte-ignore a11y_label_has_associated_control -->
								<label class="text-sm font-semibold text-gray-700 dark:text-gray-300">
									Address
								</label>
								<input
									class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
									bind:value={address}
									disabled={!isEditing}
								/>
							</div>
						</div>

						<!-- Buttons -->
						<div class="relative pt-6 border-t border-gray-200 dark:border-gray-600">
							{#if !isEditing}
								<div class="flex justify-end">
									<Button
										variant="primary"
										on:click={() => (isEditing = true)}
										class="flex items-center gap-2"
									>
										Edit Profile
									</Button>
								</div>
							{:else}
								<div class="flex flex-col sm:flex-row sm:justify-end gap-3">
									<Button variant="secondary" on:click={() => (isEditing = false)}>Cancel</Button>
									<Button on:click={saveProfile}>Save Changes</Button>
								</div>
							{/if}
						</div>
					</GlassCard>
				</Tabs.Content>

				<!-- 🏢 Company Information Tab -->
				<Tabs.Content value="company" class="pt-4">
					<GlassCard hoverEffect={false}>
						{#if profileData}
							<div class="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
								<div>
									<p class="font-semibold text-sm text-gray-700 dark:text-gray-300">Job Title</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{profileData.jobTitle || '-'}
									</p>
								</div>

								<div>
									<p class="font-semibold text-sm text-gray-700 dark:text-gray-300">Department</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">{departmentName || '-'}</p>
								</div>

								<div>
									<p class="font-semibold text-sm text-gray-700 dark:text-gray-300">
										Employment Type
									</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{profileData.employmentType || '-'}
									</p>
								</div>

								<div>
									<p class="font-semibold text-sm text-gray-700 dark:text-gray-300">Join Date</p>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										{profileData.joinDate || '-'}
									</p>
								</div>
							</div>
						{:else}
							<p class="text-gray-500">Loading company information...</p>
						{/if}
					</GlassCard>
				</Tabs.Content>

				<!-- 🔒 Password Tab -->
				<Tabs.Content value="password" class="pt-4">
					<GlassCard hoverEffect={false}>
						<div class="space-y-6 w-full max-w-md mx-auto p-4 sm:p-6">
							<div class="space-y-4">
								<!-- Current password -->
								<div class="space-y-2 max-w-xs">
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Current Password</label
									>
									<input
										class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
										type="password"
										bind:value={currentPassword}
									/>
								</div>

								<!-- New password with strength -->
								<div class="space-y-2 max-w-xs">
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="text-sm font-semibold text-gray-700 dark:text-gray-300"
										>New Password</label
									>
									<input
										class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-oeange-500 focus:ring-1 focus:ring-orange-500"
										type="password"
										bind:value={newPassword}
									/>
									{#if newPassword}
										<div class="flex items-center justify-between mt-1">
											<p class="text-sm text-gray-500">Strength: {passwordStrength.label}</p>
											<div class="w-1/2 h-1 rounded-full bg-gray-300 dark:bg-gray-700">
												<div
													class={`h-1 rounded-full ${passwordStrength.color}`}
													style="width: {passwordStrength.score * 33}%"
												></div>
											</div>
										</div>
									{/if}
								</div>

								<!-- Confirm password -->
								<div class="space-y-2 max-w-xs">
									<!-- svelte-ignore a11y_label_has_associated_control -->
									<label class="text-sm font-semibold text-gray-700 dark:text-gray-300"
										>Confirm Password</label
									>
									<input
										class="input w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
										type="password"
										bind:value={confirmPassword}
									/>
									{#if passwordMatchError}
										<p class="text-sm text-red-500 mt-1">{passwordMatchError}</p>
									{/if}
								</div>
							</div>

							<!-- Buttons -->
							<div class="flex flex-col sm:flex-row sm:justify-end gap-3">
								<Button
									variant="secondary"
									on:click={() => {
										currentPassword = '';
										newPassword = '';
										confirmPassword = '';
									}}
								>
									Cancel
								</Button>

								<Button
									on:click={() => {
										if (passwordMatchError || passwordStrength.score < 2) {
											showAlert('Please fix password issues before saving.', 'error');
											return;
										}
										changePassword();
									}}
								>
									Save Changes
								</Button>
							</div>
						</div>
					</GlassCard>
				</Tabs.Content>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>
</div>
