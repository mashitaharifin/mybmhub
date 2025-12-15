<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { onDestroy } from 'svelte';

	export let notifications: Record<string, { email: boolean; inApp: boolean }> = {
		leaveEvents: { email: true, inApp: true },
		attendanceAlerts: { email: true, inApp: false },
		systemUpdates: { email: true, inApp: true },
		reminders: { email: false, inApp: true }
	};

	let isLoading = false;

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	onDestroy(() => {
		if (t) clearTimeout(t);
	});

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 10000);
	}

	async function saveNotifications() {
		isLoading = true;
		try {
			const formData = new FormData();
			formData.append('notifications', JSON.stringify(notifications));

			const response = await fetch('?/saveNotificationPreferences', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				showAlert('Notification preferences saved successfully!', 'success');
			} else {
				let errorMessage = 'Failed to save notification preferences.';
				try {
					const errorBody = await response.json();
					errorMessage =
						errorBody.data?.error ||
						errorBody.error ||
						errorMessage;
				} catch {
					// no-op
				}
				showAlert(errorMessage, 'error');
			}
		} catch (error) {
			console.error('Network or parsing error:', error);
			showAlert('A network or connection error occurred.', 'error');
		} finally {
			isLoading = false;
		}
	}

	function reset() {
		notifications = {
			leaveEvents: { email: false, inApp: false },
			attendanceAlerts: { email: false, inApp: false },
			systemUpdates: { email: false, inApp: false },
			reminders: { email: false, inApp: false }
		};
		showAlert('All preferences reset to default.', 'info');
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Notification Preferences</Card.Title>
			<Card.Description>
				Set company default notification channels (users can override these in their profile).
			</Card.Description>
		</div>
	</Card.Header>

	<Card.Content>
		<!-- Inline Alert -->
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success'
						? 'Success'
						: alertVariant === 'error'
						? 'Error'
						: 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="p-6 space-y-6">
			{#each Object.entries(notifications) as [key, value]}
				<div class="flex items-center justify-between">
					<div>
						<p class="font-medium">
							{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
						</p>
						<p class="text-sm text-muted-foreground">
							Company default for {key}.
						</p>
					</div>

					<div class="flex items-center gap-4">
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={notifications[key].email} />
							Email
						</label>
						<label class="flex items-center gap-2">
							<input type="checkbox" bind:checked={notifications[key].inApp} />
							In-app
						</label>
					</div>
				</div>
			{/each}

			<div class="flex justify-end gap-2">
				<Button variant="default" on:click={reset} disabled={isLoading}>Reset</Button>
				<Button on:click={saveNotifications} disabled={isLoading}>
					{isLoading ? 'Saving...' : 'Save'}
				</Button>
			</div>
		</div>
	</Card.Content>
</Card.Root>
