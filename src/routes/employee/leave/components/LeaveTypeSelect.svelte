<!-- A dropdown that fetches all leave types from /api/leave/types. -->
<script lang="ts">
	export let leaveTypes: any[] = [];
	export let selectedLeaveType: any = null;
</script>

<div class="flex flex-col">
	<!-- svelte-ignore a11y_label_has_associated_control -->
	<label class="text-sm font-medium text-gray-700 dark:text-gray-300">Leave Type</label>
	<select
		bind:value={selectedLeaveType}
		class="rounded text-sm border-gray-300 dark:border-gray-600 p-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
	>
		<option value={null} disabled>Select Leave Type</option>
		{#each leaveTypes as type}
			<option value={type}>{type.name}</option>
		{/each}
	</select>
</div>

