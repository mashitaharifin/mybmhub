<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Textarea from '$lib/components/ui/textarea.svelte';
	import LeaveTypeSelect from './LeaveTypeSelect.svelte';
	import ConfirmDialog from './ConfirmDialog.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	let leaveTypes: any[] = [];
	let leaveBalances: Record<number, number> = {};

	let selectedLeaveType: any = null;
	let startDate: string = '';
	let endDate: string = '';
	let halfDay: boolean = false;
	let halfDaySession: 'Morning' | 'Afternoon' | null = null;
	let reason: string = '';
	let attachment: File | null = null;
	let totalDays = 0;
	let showConfirm = false;
	let loading = false;

	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';

	let textareaRows: number = 4;
	let holidayDates: string[] = [];

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		setTimeout(() => (alertMessage = null), 9000);
	}

	// Fetch leave types, balances & holidays
	onMount(async () => {
		try {
			// Fetch leave types
			const resTypes = await fetch('/api/leave/types');
			const dataTypes = await resTypes.json();
			if (dataTypes.success) {
				leaveTypes = dataTypes.data.map((t: any) => ({
					id: t.id,
					name: t.typeName,
					requiresDocument: t.requiresDoc,
					isUnlimited: t.isUnlimited || false
				}));
			} else {
				showAlert('Failed to load leave types', 'error');
			}

			// Fetch leave balances
			const resBalances = await fetch('/api/leave/my-balance');
			const dataBalances = await resBalances.json();
			if (dataBalances.success) {
				leaveBalances = dataBalances.data.reduce((acc: any, cur: any) => {
					acc[cur.leaveTypeID] = cur.remainingBalance;
					return acc;
				}, {});
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to fetch leave types or balances', 'error');
		}

		// Fetch holidays for date restriction
		try {
			const res = await fetch('/api/leave/holidays');
			const data = await res.json();
			if (data.success && Array.isArray(data.data)) {
				holidayDates = data.data.flatMap((h: any) => {
					if (typeof h === 'string') return [h];
					if (h.startDate && h.endDate) {
						const start = new Date(h.startDate);
						const end = new Date(h.endDate);
						const list: string[] = [];
						let cur = new Date(start);
						while (cur <= end) {
							list.push(cur.toISOString().split('T')[0]);
							cur.setDate(cur.getDate() + 1);
						}
						return list;
					}
					if (h.startDate) return [h.startDate.split('T')[0]];
					return [];
				});
			}
		} catch (err) {
			console.error('Failed to load holidays', err);
		}
	});

	// file handling (5MB limit) and preview
	function handleFileChange(e: Event) {
		const files = (e.target as HTMLInputElement).files;
		if (!files || !files[0]) return;

		const file = files[0];

		// 5MB size limit
		if (file.size > 5 * 1024 * 1024) {
			showAlert('File too large. Maximum is 5MB.', 'error');
			attachment = null;
			return;
		}

		attachment = file;
	}

	function isDisabledDate(dateStr: string) {
		if (!dateStr) return false;

		const d = new Date(dateStr);
		const day = d.getDay();

		// weekend check (Saturday = 6, Sunday = 0)
		if (day === 0 || day === 6) return true;

		// holiday check (compare ISO strings)
		if (holidayDates.includes(dateStr)) return true;

		return false;
	}

	function computeDaysLocal() {
		// Validate before computing
		if (!startDate || !endDate) {
			totalDays = 0;
			return;
		}

		// Quick validation - dates should already be validated by watchers
		if (isDisabledDate(startDate) || isDisabledDate(endDate)) {
			totalDays = 0;
			return;
		}

		const start = new Date(startDate);
		const end = new Date(endDate);
		
		if (end < start) {
			totalDays = 0;
			return;
		}

		let count = 0;
		let cur = new Date(start);

		while (cur <= end) {
			const dow = cur.getDay();
			const iso = cur.toISOString().split('T')[0];

			// skip weekend and holidays
			if (dow !== 0 && dow !== 6 && !holidayDates.includes(iso)) {
				count++;
			}

			cur.setDate(cur.getDate() + 1);
		}

		if (halfDay) count -= 0.5;

		if (count < 0) count = 0;

		totalDays = Number(count.toFixed(1));
	}

	// VALIDATION WATCHERS - Run first to validate dates
	$: if (startDate && isDisabledDate(startDate)) {
		showAlert('Selected start date is a weekend or a holiday.', 'error');
		startDate = '';
		endDate = '';
		totalDays = 0;
	}

	$: if (endDate && isDisabledDate(endDate)) {
		showAlert('Selected end date is a weekend or a holiday.', 'error');
		endDate = '';
		totalDays = 0;
	}

	$: if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
		showAlert('End date must be the same or after start date', 'error');
		endDate = '';
		totalDays = 0;
	}

	// DAYS COMPUTATION WATCHER - Run after validations
	$: if (startDate || endDate || halfDay) {
		computeDaysLocal();
	}

	function validateForm() {
		if (!selectedLeaveType) {
			showAlert('Please select a leave type', 'error');
			return false;
		}
		if (!startDate || !endDate) {
			showAlert('Start and end dates are required', 'error');
			return false;
		}
		if (new Date(endDate) < new Date(startDate)) {
			showAlert('End date must be equal or after start date', 'error');
			return false;
		}
		if (halfDay && !halfDaySession) {
			showAlert('Please select Morning/Afternoon for half-day', 'error');
			return false;
		}
		// Reason required only for Emergency Leave
		if (selectedLeaveType?.name === 'Emergency Leave') {
			if (!reason || reason.length < 10) {
				showAlert('Reason is required for Emergency Leave (min 10 characters)', 'error');
				return false;
			}
		}
		// Document required
		if (selectedLeaveType.requiresDocument && !attachment) {
			showAlert('Attachment is required for this leave type', 'error');
			return false;
		}
		// Check balance only if not unlimited
		if (!selectedLeaveType.isUnlimited && (leaveBalances[selectedLeaveType.id] ?? 0) < totalDays) {
			showAlert('Insufficient leave balance', 'error');
			return false;
		}
		// Annual leave rule: must apply 5 days before
		if (selectedLeaveType.name === 'Annual Leave') {
			const today = new Date();
			const start = new Date(startDate);

			const diff = (start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

			if (diff < 5) {
				showAlert('Annual Leave must be applied at least 5 days in advance', 'info');
				return false;
			}
		}

		return true;
	}

	async function submitLeave() {
		if (!validateForm()) return;
		showConfirm = true;
	}

	async function confirmSubmit() {
		showConfirm = false;
		loading = true;

		const formData = new FormData();
		formData.append('leaveTypeID', selectedLeaveType.id);
		formData.append('startDate', startDate);
		formData.append('endDate', endDate);
		formData.append('halfDay', halfDay ? 'true' : 'false');
		if (halfDay && halfDaySession) formData.append('halfDaySession', halfDaySession);
		formData.append('reason', reason);
		if (attachment) formData.append('docImg', attachment);

		try {
			const res = await fetch('/api/leave/apply', { method: 'POST', body: formData });
			const data = await res.json();
			if (data.success) {
				showAlert('Leave application submitted successfully!', 'success');
				dispatch('submitted');
				totalDays = data.data.duration;
			} else {
				showAlert(data.error || 'Failed to submit leave', 'error');
			}
		} catch (err) {
			console.error(err);
			showAlert('Failed to submit leave', 'error');
		} finally {
			loading = false;
		}
	}

	function closeForm() {
		dispatch('close');
	}
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/50">
	<div
		class="bg-white dark:bg-gray-900 w-full max-w-lg rounded-lg shadow-lg p-6 space-y-4 relative"
	>
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Apply Leave</h2>
		<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">Fill in your leave details below.</p>

		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title
					>{alertVariant === 'success'
						? 'Success'
						: alertVariant === 'error'
							? 'Error'
							: 'Info'}</Alert.Title
				>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<div class="space-y-3">
			<!-- Leave Type -->
			<LeaveTypeSelect bind:selectedLeaveType {leaveTypes} />

			<!-- Start Date -->
			<div class="flex flex-col">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300 ">Start Date</label>
				<Input
					type="date"
					min={new Date().toISOString().split('T')[0]}
					bind:value={startDate}
					class="text-sm dark:bg-gray-800 dark:text-white"
				/>
			</div>

			<!-- End Date -->
			<div class="flex flex-col">
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<label class="text-sm font-medium text-gray-700 dark:text-gray-300">End Date</label>
				<Input
					type="date"
					min={startDate || new Date().toISOString().split('T')[0]}
					bind:value={endDate}
					class="text-sm dark:bg-gray-800 dark:text-white"
				/>
			</div>

			<!-- Half Day (only for AL, UL, and EL)-->
			{#if selectedLeaveType?.name === 'Annual Leave' || selectedLeaveType?.name === 'Unpaid Leave' || selectedLeaveType?.name === 'Emergency Leave'}
				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="halfDay"
						bind:checked={halfDay}
						class="rounded border-gray-300 dark:border-gray-600"
					/>
					<label for="halfDay" class="text-sm text-gray-700 dark:text-gray-300">Half Day</label>
				</div>
			{/if}

			{#if halfDay}
				<div class="flex gap-2 items-center">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm text-gray-700 dark:text-gray-300">Session:</label>
					<select
						bind:value={halfDaySession}
						class="rounded text-sm border-gray-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
					>
						<option value="" disabled>Select Session</option>
						<option value="Morning">Morning</option>
						<option value="Afternoon">Afternoon</option>
					</select>
				</div>
			{/if}

			<!-- Reason (only for EL)-->
			{#if selectedLeaveType?.name === 'Emergency Leave'}
				<!-- svelte-ignore a11y_label_has_associated_control -->
				<div class="flex flex-col">
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Reason</label>
					<Textarea bind:value={reason} rows={textareaRows} placeholder="Minimum 10 characters" />
				</div>
			{/if}

			<!-- Attachment (only for leave type that requires doc)-->
			{#if selectedLeaveType?.requiresDocument}
				<div class="flex flex-col">
					<!-- svelte-ignore a11y_label_has_associated_control -->
					<label class="text-sm font-medium text-gray-700 dark:text-gray-300"
						>Supporting Document</label
					>
					<input
						type="file"
						accept=".pdf,.png,.jpg,.jpeg"
						on:change={handleFileChange}
						class="text-sm text-gray-700 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
					/>
					{#if attachment}
						<p class="text-xs text-gray-600 dark:text-gray-400 mt-1">
							Selected file: <span class="font-semibold">{attachment.name}</span>
						</p>
					{/if}
				</div>
			{/if}

			<!-- Total Days -->
			<p class="text-sm text-gray-700 dark:text-gray-300">Total Days: {totalDays}</p>

			<!-- Available Balance -->
			{#if selectedLeaveType}
				<p
					class="text-sm font-semibold"
					class:text-green-600={selectedLeaveType.isUnlimited ||
						(leaveBalances[selectedLeaveType.id] ?? 0) > 0}
					class:text-red-600={!selectedLeaveType.isUnlimited &&
						(leaveBalances[selectedLeaveType.id] ?? 0) === 0}
				>
					Available Balance:
					{selectedLeaveType?.isUnlimited
						? 'Unlimited'
						: Number(leaveBalances[selectedLeaveType.id] ?? 0).toFixed(1)} days
				</p>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex justify-end gap-2 mt-4">
			<Button variant="secondary" on:click={closeForm}>Cancel</Button>
			<Button on:click={submitLeave} disabled={loading}>
				{loading ? 'Submitting...' : 'Submit'}
			</Button>
		</div>
	</div>

	<!-- Confirm Dialog -->
	{#if showConfirm}
		<ConfirmDialog
			title="Confirm Leave Application"
			message={`You are about to apply for ${totalDays} day(s) of leave. Proceed?`}
			on:confirm={confirmSubmit}
			on:cancel={() => (showConfirm = false)}
		/>
	{/if}
</div>
