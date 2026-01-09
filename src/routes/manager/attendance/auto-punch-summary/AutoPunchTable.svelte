<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import Button from '$lib/components/ui/button.svelte';
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import { Eye, EyeOff } from 'lucide-svelte';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	const dispatch = createEventDispatcher();

	export let filters: { month: number; year: number; employeeQuery: string } = {
		month: new Date().getMonth() + 1,
		year: new Date().getFullYear(),
		employeeQuery: ''
	};

	let records: any[] = [];
	let loading = true;
	let expanded = new Set<number>();
	let emptyReason: 'period' | 'employee' | null = null;

	onMount(loadData);

	// 🔥 This is the key fix
	$: loadDataWhenFiltersChange(filters);

	let lastFilters = '';

	function loadDataWhenFiltersChange(f: typeof filters) {
		const serialized = JSON.stringify(f);
		if (serialized !== lastFilters) {
			lastFilters = serialized;
			loadData();
			emptyReason = null;
		}
	}

	async function loadData() {
		try {
			loading = true;
			// Build query string
			const params = new URLSearchParams();
			params.append('month', filters.month.toString());
			params.append('year', filters.year.toString());
			if (filters.employeeQuery) {
				params.append('search', filters.employeeQuery);
			}

			const res = await fetch(`/manager/attendance/auto-punch-summary?${params}`);
			const json = await res.json();
			if (!json.success) throw new Error(json.error);
			records = json.data || [];
			emptyReason = json.emptyReason ?? null;
		} catch (e) {
			console.error('Failed to load data:', e);
			dispatch('alert', { message: 'Failed to load auto punch-out data', variant: 'error' });
			records = [];
		} finally {
			loading = false;
		}
	}

	function toggle(id: number) {
		const next = new Set(expanded);

		if (next.has(id)) {
			next.delete(id);
		} else {
			next.add(id);
		}

		expanded = next;
	}

	function exportPDF() {
		// Dispatch export event to parent
		dispatch('exportPDF');
	}
</script>

<div id="auto-punch-table">
	<div class="mb-4 flex justify-between items-center">
		<div class="text-sm text-gray-600 dark:text-gray-300">
			<span class="font-medium">Total Flagged:</span>
			{records.length} employees
			<span class="mx-3">|</span>
			<span class="font-medium">Threshold:</span> ≥ 3 times
			<span class="mx-3">|</span>
			<span class="font-medium">Period:</span>
			{filters.month}/{filters.year}
		</div>
	</div>

	{#if loading}
		<div class="flex justify-center items-center py-12">
			<div class="text-center">
				<div
					class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-gray-100 mx-auto mb-2"
				></div>
				<p class="text-sm text-gray-500 dark:text-gray-400">Loading records...</p>
			</div>
		</div>
	{:else if records.length === 0}
		<GlassCard className="rounded-xl">
			<div class="py-12 text-center">
				{#if emptyReason === 'employee'}
					<p class="text-gray-500 dark:text-gray-400 text-sm">
						No auto punch-out records found for this employee.
					</p>
				{:else}
					<p class="text-gray-500 dark:text-gray-400 text-sm">
						No auto punch-out records found for the selected period.
					</p>
				{/if}
			</div>
		</GlassCard>
	{:else}
		<div class="space-y-3">
			{#each records as r}
				<GlassCard className="rounded-xl">
					<div class="p-4">
						<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div class="flex-1 min-w-0">
								<p class="font-medium text-gray-900 dark:text-gray-100 truncate">
									{r.employeeName}
								</p>
								<div class="flex items-center gap-4 mt-1 text-sm text-gray-500 dark:text-gray-400">
									<span>Employee ID: {r.employeeId}</span>
									<span>|</span>
									<span>Last occurrence: {r.records?.at(-1)?.date || 'N/A'}</span>
								</div>
							</div>

							<div class="flex items-center gap-4 flex-shrink-0">
								<span
									class="px-3 py-1 rounded-full text-xs font-medium
									bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300
									border border-red-200 dark:border-red-800"
								>
									{r.autoPunchCount || 0} auto punches
								</span>

								<Button
									variant="default"
									size="sm"
									on:click={() => toggle(r.employeeId)}
									class="whitespace-nowrap"
									title={expanded.has(r.employeeId) ? 'Hide details' : 'Show details'}
								>
									{#if expanded.has(r.employeeId)}
										<EyeOff class="w-4 h-4" />
									{:else}
										<Eye class="w-4 h-4" />
									{/if}
								</Button>
							</div>
						</div>

						{#if expanded.has(r.employeeId)}
							<div class="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
								<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
									Auto Punch Details
								</h4>
								<div class="overflow-x-auto">
									<table class="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead class="bg-gray-50 dark:bg-gray-800/50">
											<tr>
												<th
													class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
												>
													Date
												</th>
												<th
													class="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
												>
													Reason
												</th>
											</tr>
										</thead>
										<tbody class="divide-y divide-gray-200 dark:divide-gray-700">
											{#each r.records as rec}
												<tr class="hover:bg-gray-50 dark:hover:bg-gray-800/30">
													<td class="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
														{rec.date}
													</td>
													<td class="px-4 py-2 text-sm text-gray-600 dark:text-gray-300">
														{rec.reason || 'No reason provided'}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>
								</div>
							</div>
						{/if}
					</div>
				</GlassCard>
			{/each}
		</div>
	{/if}
</div>
