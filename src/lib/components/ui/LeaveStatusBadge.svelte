<script lang="ts">
	export let status: string;

	const classes: Record<string, string> = {
		Pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
		Approved: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200',
		Rejected: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
		Cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700/50 dark:text-gray-200'
	};
</script>

<span class={`px-3 py-1 rounded-full text-xs font-medium ${classes[status] ?? classes['Pending']}`}>
	{status}
</span>
