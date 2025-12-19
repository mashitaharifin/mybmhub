<script lang="ts">
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { createEventDispatcher } from 'svelte';
	import { RotateCcw, Printer } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	let month = new Date().getMonth() + 1;
	let year = new Date().getFullYear();
	let employeeQuery = '';
	
	// Track previous values to avoid unnecessary dispatches
	let prevMonth = month;
	let prevYear = year;
	let prevEmployeeQuery = employeeQuery;

	function applyFilters() {
		dispatch('apply', { month, year, employeeQuery });
	}

	function resetFilters() {
		month = new Date().getMonth() + 1;
		year = new Date().getFullYear();
		employeeQuery = '';
		applyFilters();
	}

	function doExport() {
		dispatch('exportPDF', { month, year, employeeQuery });
	}

	// Reactive updates - only dispatch when values actually change
	$: {
		if (month !== prevMonth || year !== prevYear || employeeQuery !== prevEmployeeQuery) {
			prevMonth = month;
			prevYear = year;
			prevEmployeeQuery = employeeQuery;
			applyFilters();
		}
	}
</script>

<!-- Rest of the template remains the same -->

<div class="flex gap-3 items-center flex-wrap p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">
		Month
		<select 
			bind:value={month} 
			class="ml-4 w-24 text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition"
		>
			{#each Array(12) as _, i}
				<option value={i + 1}>{i + 1}</option>
			{/each}
		</select>
	</label>

	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">
		Year
		<input
			type="number"
			bind:value={year}
			class="ml-4 w-24 text-sm rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition"
		/>
	</label>

	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">
		Search Employee
		<Input 
			placeholder="Name" 
			bind:value={employeeQuery} 
			class="ml-2 rounded-lg border border-gray-300 bg-white p-1 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 focus:ring-2 focus:ring-red-500 outline-none transition"
		/>
	</label>

	<div class="flex items-center gap-2">
		<Button variant="primary" on:click={resetFilters} title="Reset">
			<RotateCcw class="w-4 h-4" />
		</Button>

		<Button variant="primary" on:click={doExport} title="Export PDF">
			<Printer class="w-4 h-4" />
		</Button>
	</div>
</div>
