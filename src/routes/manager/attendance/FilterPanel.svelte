<script lang="ts">
	import Input from '$lib/components/ui/input.svelte';
	import Button from '$lib/components/ui/button.svelte';
	import { createEventDispatcher } from 'svelte';
	import { RotateCcw, Filter, FileDown } from 'lucide-svelte';

	const dispatch = createEventDispatcher();

	let month = new Date().getMonth() + 1;
	let year = new Date().getFullYear();
	let employeeQuery = '';

	function applyFilters() {
		dispatch('apply', { month, year, employeeQuery });
	}

	function resetFilters() {
		month = new Date().getMonth() + 1;
		year = new Date().getFullYear();
		employeeQuery = '';
		dispatch('apply', { month, year, employeeQuery });
	}

	function doExport() {
		dispatch('exportPDF', { month, year, employeeQuery });
	}

	function sendAlert(message: string, variant: 'success' | 'error' | 'info' = 'info') {
		dispatch('alert', { message, variant });
	}
</script>

<div class="flex gap-3 items-center flex-wrap p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">
		Month
		<select 
			bind:value={month} 
			class="ml-2 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
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
			class="ml-2 w-24 rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400"
		/>
	</label>

	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">
		Search Employee
		<Input 
			placeholder="Name or ID" 
			bind:value={employeeQuery} 
			class="ml-2 p-1 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600"
		/>
	</label>

	<div class="flex items-center gap-2">
		<Button variant="outline" on:click={resetFilters} title="Reset">
			<RotateCcw class="w-4 h-4" />
		</Button>
		<Button on:click={applyFilters} title="Apply">
			<Filter class="w-4 h-4" />
		</Button>
		<Button variant="outline" on:click={doExport} title="Export PDF">
			<FileDown class="w-4 h-4" />
		</Button>
	</div>
</div>