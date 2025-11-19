<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';

	let inputIdCounter = 0;
	function generateId() {
		return `input-${inputIdCounter++}`;
	}

	export let patterns: any[] = [];
	const dispatch = createEventDispatcher();

	let showPatternForm = false;
	let patternForm: any = {
		id: undefined,
		jobTitle: '',
		weekPattern: '',
		workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
		startTime: '09:00',
		endTime: '17:00',
		effectiveFrom: '',
		effectiveTo: ''
	};

	// Alert system
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

	function addPattern() {
		patternForm = {
			id: undefined,
			jobTitle: '',
			weekPattern: '',
			workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
			startTime: '09:00',
			endTime: '17:00',
			effectiveFrom: '',
			effectiveTo: ''
		};
		showPatternForm = true;
	}

	function editPattern(id: number) {
		const p = patterns.find((x) => x.id === id);
		if (p) patternForm = { ...p };
		showPatternForm = true;
	}

	function cancelForm() {
		showPatternForm = false;
	}

	function handleFormEnhance() {
		return async ({ result }: any) => {
			if (result?.type === 'success') {
				showAlert(result.data?.message || 'Working pattern saved successfully.', 'success');
				await invalidateAll();
				showPatternForm = false;
			} else {
				showAlert(result.data?.error || 'Failed to save working pattern.', 'error');
			}
		};
	}

	async function deletePattern(id: number) {
		if (!confirm('Delete this working pattern?')) return;

		const formData = new FormData();
		formData.append('id', id.toString());

		const res = await fetch('?/deleteWorkingPattern', { method: 'POST', body: formData });

		if (res.ok) {
			await invalidateAll();
			showAlert('Working pattern deleted successfully.', 'success');
		} else {
			showAlert('Failed to delete working pattern.', 'error');
		}
	}

	function formatWorkDays(rawDays: string[] | string | null | undefined): string {
		if (!rawDays) return '-';
		let days: string[] = [];
		if (Array.isArray(rawDays)) {
			days = rawDays;
		} else if (typeof rawDays === 'string') {
			try {
				const parsed = JSON.parse(rawDays);
				if (Array.isArray(parsed)) days = parsed;
			} catch {
				days = rawDays.split(',').map((d) => d.trim());
			}
		}
		return days.join(', ');
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Working Pattern</Card.Title>
			<Card.Description>Define working hours and weekly patterns per job title.</Card.Description>
			<br />
		</div>
		<Button on:click={addPattern}><Plus class="w-4 h-4" /></Button>
	</Card.Header>

	<Card.Content>
		<!-- ✅ Inline Alert -->
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Form -->
		{#if showPatternForm}
			<form
				method="POST"
				action={patternForm.id ? '?/updateWorkingPattern' : '?/createWorkingPattern'}
				use:enhance={handleFormEnhance}
				class="mb-5 rounded-md border p-4"
			>
				{#if patternForm.id}
					<input type="hidden" name="id" value={patternForm.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{patternForm.id ? 'Edit Pattern' : 'Add New Pattern'}
				</h3>

				<div class="grid sm:grid-cols-2 gap-4">
					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Job Title</label>
						<Input
							name="jobTitle"
							placeholder="e.g., Admin"
							bind:value={patternForm.jobTitle}
							id={generateId()}
							required
						/>
					</div>

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Week Pattern</label>
						<Input
							name="weekPattern"
							placeholder="e.g., Week 1, 3, 5"
							bind:value={patternForm.weekPattern}
							id={generateId()}
						/>
					</div>

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-2">Work Days</label>
						<input
							type="hidden"
							name="workDays"
							value={JSON.stringify(patternForm.workDays || [])}
						/>
						<div class="flex flex-wrap gap-3">
							{#each ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as day}
								<label class="flex items-center gap-1 text-sm">
									<input
										type="checkbox"
										value={day}
										checked={patternForm.workDays?.includes(day)}
										on:change={(e) => {
											const checked = e.currentTarget.checked;
											if (checked) {
												patternForm.workDays = [...(patternForm.workDays || []), day];
											} else {
												patternForm.workDays = patternForm.workDays.filter(
													(d: string) => d !== day
												);
											}
										}}
										class="rounded border-gray-300"
									/>
									{day}
								</label>
							{/each}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-2">
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium mb-1">Start Time</label>
							<Input type="time" name="startTime" bind:value={patternForm.startTime} required />
						</div>
						<div>
							<!-- svelte-ignore a11y_label_has_associated_control -->
							<label class="block text-sm font-medium mb-1">End Time</label>
							<Input type="time" name="endTime" bind:value={patternForm.endTime} required />
						</div>
					</div>

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Effective From</label>
						<input
							type="date"
							name="effectiveFrom"
							bind:value={patternForm.effectiveFrom}
							class="w-full rounded border px-2 py-1"
							required
						/>
					</div>

					<div>
						<!-- svelte-ignore a11y_label_has_associated_control -->
						<label class="block text-sm font-medium mb-1">Effective To</label>
						<input
							type="date"
							name="effectiveTo"
							bind:value={patternForm.effectiveTo}
							class="w-full rounded border px-2 py-1"
						/>
					</div>
				</div>

				<div class="flex justify-end gap-2 mt-4">
					<Button type="button" variant="outline" on:click={cancelForm}>Cancel</Button>
					<Button type="submit">{patternForm.id ? 'Update' : 'Save'}</Button>
				</div>
			</form>
		{/if}

		<!-- Table -->
		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Job Title</Table.Head>
						<Table.Head>Week Pattern</Table.Head>
						<Table.Head>Work Days</Table.Head>
						<Table.Head>Hours</Table.Head>
						<Table.Head>Effective Period</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each patterns as p, idx (p.id)}
						<Table.Row>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>{p.jobTitle}</Table.Cell>
							<Table.Cell>{p.weekPattern || '-'}</Table.Cell>
							<Table.Cell>{formatWorkDays(p.workDays)}</Table.Cell>
							<Table.Cell>{p.startTime} – {p.endTime}</Table.Cell>
							<Table.Cell>{p.effectiveFrom || '-'} until {p.effectiveTo || '-'}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editPattern(p.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>
								<button
									on:click={() => deletePattern(p.id)}
									class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
								>
									<Trash2 class="w-4 h-4" />
								</button>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="7" class="text-center text-muted-foreground h-16">
								No working patterns defined.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>
