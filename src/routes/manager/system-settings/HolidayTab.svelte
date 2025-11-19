<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { Plus, Pencil, Trash2 } from 'lucide-svelte';
	import { createEventDispatcher, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import * as Alert from '$lib/components/ui/alert';
	import type { ActionResult } from '@sveltejs/kit';

	export let holidays: any[] = [];
	const dispatch = createEventDispatcher();

	let showHolidayForm = false;
	let holidayForm: any = {
		id: undefined,
		holidayName: '',
		startDate: '',
		endDate: '',
		type: 'National'
	};
	let errors = { name: '', date: '', overlap: '' };

	// Alert state
	let alertMessage: string | null = null;
	let alertVariant: 'success' | 'error' | 'info' = 'info';
	let t: NodeJS.Timeout | null = null;

	// Auto clear timeout when component is destroyed
	onDestroy(() => {
		if (t) clearTimeout(t);
	});

	function showAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		alertMessage = message;
		alertVariant = variant;
		if (t) clearTimeout(t);
		t = setTimeout(() => (alertMessage = null), 10000);
	}

	function resetErrors() {
		errors = { name: '', date: '', overlap: '' };
	}

	function addHoliday() {
		resetErrors();
		holidayForm = { id: undefined, holidayName: '', startDate: '', endDate: '', type: 'National' };
		showHolidayForm = true;
	}

	function editHoliday(id: number) {
		resetErrors();
		const h = holidays.find((x) => x.id === id);
		if (h) holidayForm = { ...h };
		showHolidayForm = true;
	}

	function validateForm() {
		resetErrors();
		const name = (holidayForm.holidayName || '').trim();
		const start = holidayForm.startDate ? new Date(holidayForm.startDate) : null;
		const end = holidayForm.endDate ? new Date(holidayForm.endDate) : start;

		if (!name) errors.name = 'Holiday name is required.';
		if (!start) errors.date = 'Start date is required.';
		if (start && end && start > end) errors.date = 'Start date cannot be later than end date.';

		return !errors.name && !errors.date;
	}

	function handleSubmit(event: SubmitEvent) {
		if (!validateForm()) {
			event.preventDefault();
		}
	}

	/**
	 * Combined enhancement handler for all form submissions (Create, Update, Delete).
	 * @param contextMessage A brief action name to use in the default success/error message.
	 */
	function handleFormEnhance(contextMessage: 'saved' | 'deleted') {
		return async ({ result }: { result: ActionResult }) => {
			if (result?.type === 'success') {
				showAlert(
					result.data?.message || `Holiday ${contextMessage} successfully!`,
					'success'
				);
				
				if (contextMessage === 'saved') {
					showHolidayForm = false;
					dispatch('save');
				} else if (contextMessage === 'deleted') {
					dispatch('save');
				}
			} else if (result?.type === 'error') {
				showAlert(
					result.error?.message || `Failed to ${contextMessage} holiday.`,
					'error'
				);
			}
		};
	}
</script>

<Card.Root>
	<Card.Header class="flex items-center justify-between">
		<div>
			<Card.Title>Public Holidays</Card.Title>
			<Card.Description>
				Add national or state holidays to exclude from leave calculations.
			</Card.Description>
			<br />
		</div>
		<Button on:click={addHoliday}><Plus class="w-4 h-4" /></Button>
	</Card.Header>

	<Card.Content>
		{#if alertMessage}
			<Alert.Root variant={alertVariant}>
				<Alert.Title>
					{alertVariant === 'success' ? 'Success' : alertVariant === 'error' ? 'Error' : 'Info'}
				</Alert.Title>
				<Alert.Description>{alertMessage}</Alert.Description>
			</Alert.Root>
		{/if}

		{#if showHolidayForm}
			<form
				method="POST"
				action={holidayForm.id ? '?/updateHoliday' : '?/createHoliday'}
				use:enhance={() => handleFormEnhance('saved')}
				class="mb-4 rounded-md border p-4"
				on:submit|preventDefault={handleSubmit}
			>
				{#if holidayForm.id}
					<input type="hidden" name="id" value={holidayForm.id} />
				{/if}

				<h3 class="font-semibold mb-3">
					{holidayForm.id ? 'Edit Public Holiday' : 'Add New Public Holiday'}
				</h3>

				<div class="grid sm:grid-cols-2 gap-3">
					<div>
						<label for="holidayName" class="block text-sm font-medium mb-1">Holiday Name</label>
						<Input
							id="holidayName"
							name="holidayName"
							placeholder="e.g., Hari Merdeka"
							bind:value={holidayForm.holidayName}
						/>
						{#if errors.name}
							<p class="text-red-600 text-xs mt-1">{errors.name}</p>
						{/if}
					</div>
					<div>
						<label for="holidayType" class="block text-sm font-medium mb-1">Type</label>
						<select
							id="holidayType"
							name="type"
							bind:value={holidayForm.type}
							class="w-full rounded border px-2 py-1"
						>
							<option value="National">National</option>
							<option value="State">State</option>
						</select>
					</div>
				</div>

				<div class="grid sm:grid-cols-2 gap-3 mt-3">
					<div>
						<label for="startDate" class="block text-sm font-medium mb-1">Start Date</label>
						<input
							id="startDate"
							name="startDate"
							type="date"
							bind:value={holidayForm.startDate}
							class="w-full rounded border px-2 py-1"
						/>
					</div>
					<div>
						<label for="endDate" class="block text-sm font-medium mb-1">End Date (optional)</label>
						<input
							id="endDate"
							name="endDate"
							type="date"
							bind:value={holidayForm.endDate}
							class="w-full rounded border px-2 py-1"
						/>
					</div>
				</div>

				{#if errors.date}
					<p class="text-red-600 text-xs mt-1">{errors.date}</p>
				{/if}

				<div class="flex justify-end gap-2 mt-4">
					<Button type="button" variant="outline" on:click={() => (showHolidayForm = false)}>
						Cancel
					</Button>
					<Button type="submit">Save</Button>
				</div>
			</form>
		{/if}

		<div class="overflow-x-auto">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>#</Table.Head>
						<Table.Head>Name</Table.Head>
						<Table.Head>Date</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>

				<Table.Body>
					{#each holidays as h, idx (h.id)}
						<Table.Row>
							<Table.Cell>{idx + 1}</Table.Cell>
							<Table.Cell>{h.holidayName}</Table.Cell>
							<Table.Cell>
								{h.startDate}
								{h.endDate && h.endDate !== h.startDate ? ` until ${h.endDate}` : ''}
							</Table.Cell>
							<Table.Cell>{h.type}</Table.Cell>
							<Table.Cell class="text-right space-x-2">
								<button
									on:click={() => editHoliday(h.id)}
									class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
								>
									<Pencil class="w-4 h-4" />
								</button>

								<form
									method="POST"
									action="?/deleteHoliday"
									use:enhance={() => handleFormEnhance('deleted')}
									style="display:inline"
								>
									<input type="hidden" name="id" value={h.id} />
									<button
										type="submit"
										class="p-1 rounded text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
									>
										<Trash2 class="w-4 h-4" />
									</button>
								</form>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan="5" class="text-center text-muted-foreground h-16">
								No holidays found.
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	</Card.Content>
</Card.Root>