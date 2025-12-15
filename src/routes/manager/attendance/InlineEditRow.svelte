<script lang="ts">
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { createEventDispatcher, onMount } from 'svelte';

	export let r: any; // record
	const dispatch = createEventDispatcher();

	let form = {
		checkInTime: r.checkInTime ? formatDateTimeForInput(new Date(r.checkInTime)) : '',
		checkOutTime: r.checkOutTime ? formatDateTimeForInput(new Date(r.checkOutTime)) : '',
		checkInLat: r.checkInLat || '',
		checkInLng: r.checkInLng || '',
		checkOutLat: r.checkOutLat || '',
		checkOutLng: r.checkOutLng || '',
		reason: '' // Remove remarks, only use reason
	};

	let saving = false;

	// Determine if this record is auto-punched
	const isAutoPunched = r.isModified === 0;

	const reasons = [
		'Forgot to punch-out',
		'Device offline',
		'Worked outside office',
		'Emergency exit',
		'Other'
	];

	// Fix datetime-local format (converts to local timezone)
	function formatDateTimeForInput(date: Date): string {
		const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
		return localDate.toISOString().slice(0, 16);
	}

	// Auto-detect manager location if fields are empty
	onMount(() => {
		console.log('📍 InlineEditRow mounted - current locations:', {
			formCheckOutLat: form.checkOutLat,
			formCheckOutLng: form.checkOutLng,
			rCheckOutLat: r.checkOutLat,
			rCheckOutLng: r.checkOutLng
		});

		if ((!form.checkInLat || !form.checkInLng) && !r.checkInLat && !r.checkInLng) {
			console.log('📍 Getting current location for check-out...');

			navigator.geolocation.getCurrentPosition(
				(pos) => {
					form.checkInLat = pos.coords.latitude.toFixed(6);
					form.checkInLng = pos.coords.longitude.toFixed(6);
					console.log('📍 Got check-out location:', form.checkOutLat, form.checkOutLng);
				},
				(err) => console.warn('❌ Geolocation not available', err)
			);
		}
		if ((!form.checkOutLat || !form.checkOutLng) && !r.checkOutLat && !r.checkOutLng) {
			navigator.geolocation.getCurrentPosition(
				(pos) => {
					form.checkOutLat = pos.coords.latitude.toFixed(6);
					form.checkOutLng = pos.coords.longitude.toFixed(6);
				},
				(err) => console.warn('Geolocation not available', err)
			);
		}
	});

	function validate() {
		// Block auto-punched records unless it's incomplete
		if (isAutoPunched && r.status === 'Complete') {
			return 'This record was auto-punched and cannot be modified.';
		}

		if (!form.reason) return 'Please select a reason.';
		if (
			form.checkInTime &&
			form.checkOutTime &&
			new Date(form.checkInTime) >= new Date(form.checkOutTime)
		)
			return 'Check-In must be before Check-Out.';
		return null;
	}

	async function save() {
		const err = validate();
		if (err) {
			dispatch('alert', { message: err, variant: 'error' });
			return;
		}

		saving = true;
		try {
			const payload = {
				id: r.id,
				userID: r.userId,
				summaryDate: r.summaryDate,
				checkInTime: form.checkInTime ? new Date(form.checkInTime).toISOString() : r.checkInTime,
				checkOutTime: form.checkOutTime
					? new Date(form.checkOutTime).toISOString()
					: r.checkOutTime,
				// Preserve original coordinates if not modified
				checkInLat: form.checkInLat || r.checkInLat || null,
				checkInLng: form.checkInLng || r.checkInLng || null,
				checkOutLat: form.checkOutLat || r.checkOutLat || null,
				checkOutLng: form.checkOutLng || r.checkOutLng || null,
				notes: form.reason, // Save reason as notes in punch table
				isModified: 1
			};

			// DEBUG: Log what we're sending
			console.log('Sending to backend:', {
				checkOutTime: payload.checkOutTime,
				checkOutLat: payload.checkOutLat,
				checkOutLng: payload.checkOutLng,
				formCheckOutLat: form.checkOutLat,
				formCheckOutLng: form.checkOutLng,
				rCheckOutLat: r.checkOutLat,
				rCheckOutLng: r.checkOutLng
			});

			const res = await fetch('/api/attendance/update', {
				method: 'POST',
				body: JSON.stringify(payload),
				headers: { 'Content-Type': 'application/json' }
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'Update failed');
			}

			const result = await res.json();

			// Dispatch success with all updated data
			dispatch('updated', {
				id: r.id,
				checkInTime: payload.checkInTime,
				checkOutTime: payload.checkOutTime,
				checkInLat: payload.checkInLat,
				checkInLng: payload.checkInLng,
				checkOutLat: payload.checkOutLat,
				checkOutLng: payload.checkOutLng,
				reason: form.reason, // Frontend only
				isModified: 1
			});

			// Auto-close the form
			dispatch('cancel');
		} catch (err) {
			console.error('Update error:', err);

			let errorMessage = 'Failed to update record.';
			if (err instanceof Error) {
				errorMessage = err.message;
			} else if (typeof err === 'string') {
				errorMessage = err;
			}

			dispatch('alert', {
				message: errorMessage,
				variant: 'error'
			});
		} finally {
			saving = false;
		}
	}

	function cancel() {
		dispatch('cancel');
	}
</script>

<div class="grid grid-cols-1 gap-3">
	<!-- Status Warning -->
	{#if r.status === 'Complete'}
		<div
			class="bg-blue-100 border border-blue-400 text-blue-800 px-4 py-3 rounded-lg dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
		>
			<strong>Info:</strong>
			{#if isAutoPunched}
				This attendance record was auto-punched and does not require edits.
			{:else}
				This attendance record is already complete and cannot be modified.
			{/if}
		</div>
	{/if}

	<!-- Times -->
	<div class="grid sm:grid-cols-2 gap-3">
		<label class="block text-sm">
			Check-In Time
			<input
				type="datetime-local"
				bind:value={form.checkInTime}
				class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900"
				disabled={r.status === 'Complete' && isAutoPunched}
			/>
			{#if r.checkInTime}
				<p class="text-xs text-gray-500 mt-1">
					Original: {new Date(r.checkInTime).toLocaleString()}
				</p>
			{/if}
		</label>
		<label class="block text-sm">
			Check-Out Time
			<input
				type="datetime-local"
				bind:value={form.checkOutTime}
				class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900"
				disabled={r.status === 'Complete'}
			/>
			{#if r.checkOutTime}
				<p class="text-xs text-gray-500 mt-1">
					Original: {new Date(r.checkOutTime).toLocaleString()}
				</p>
			{/if}
		</label>
	</div>

	<!-- Location Information -->
	<div class="grid sm:grid-cols-2 gap-3">
		<div>
			<label class="block text-sm">
				Check-In Location
				<div class="flex gap-2">
					<Input placeholder="Latitude" bind:value={form.checkInLat} readonly class="flex-1" />
					<Input placeholder="Longitude" bind:value={form.checkInLng} readonly class="flex-1" />
				</div>
			</label>
			{#if r.checkInLocation?.locationName}
				<p class="text-xs text-gray-500 mt-1">Original: {r.checkInLocation.locationName}</p>
			{/if}
		</div>
		<div>
			<label class="block text-sm">
				Check-Out Location
				<div class="flex gap-2">
					<Input placeholder="Latitude" bind:value={form.checkOutLat} readonly class="flex-1" />
					<Input placeholder="Longitude" bind:value={form.checkOutLng} readonly class="flex-1" />
				</div>
			</label>
			{#if r.checkOutLocation?.locationName}
				<p class="text-xs text-gray-500 mt-1">Original: {r.checkOutLocation.locationName}</p>
			{/if}
		</div>
	</div>

	<!-- Reason Only (no remarks) -->
	<div class="grid sm:grid-cols-1 gap-3">
		<label class="block text-sm">
			Reason for modification
			<select
				bind:value={form.reason}
				class="w-full rounded border px-2 py-1 bg-white dark:bg-gray-900"
				disabled={r.status === 'Complete' && isAutoPunched}
			>
				<option value="">Select reason</option>
				{#each reasons as rs}
					<option value={rs}>{rs}</option>
				{/each}
			</select>
		</label>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-2">
		<Button variant="secondary" type="button" on:click={cancel}>Cancel</Button>
		<Button on:click={save} disabled={saving || r.status === 'Complete'}>
			{saving ? 'Saving...' : r.status === 'Complete' ? 'Cannot Modify Complete Record' : 'Save'}
		</Button>
	</div>
</div>
