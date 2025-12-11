<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
    import { Filter } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	const dispatch = createEventDispatcher();

	let startDate: string;
	let endDate: string;
	let data: any = null;
	let loading = false;

	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

	startDate = firstDay.toISOString().split('T')[0];
	endDate = lastDay.toISOString().split('T')[0];

	onMount(async () => {
		await fetchData();
	});

	async function fetchData() {
		loading = true;

		try {
			const res = await fetch(`/manager/reports/leave?start=${startDate}&end=${endDate}`);

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			data = await res.json();
			// Dispatch success alert
			dispatch('alert', {
				message: `Leave data loaded for ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
				variant: 'success'
			});
		} catch (err) {
			console.error('Error fetching leave data:', err);
			data = null;

			// Dispatch error alert
			dispatch('alert', {
				message: 'Failed to load leave data. Please try again.',
				variant: 'error'
			});
		} finally {
			loading = false;
		}
	}
</script>

<div class="space-y-6">
	<!-- Date Picker with Gradient Header -->
	<div
		class="bg-gradient-to-r from-white to-red-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-red-500 dark:border-red-600 rounded-xl shadow-lg overflow-hidden"
	>
		<div class="p-6">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				<div class="text-white">
					<h3 class="text-lg font-bold text-gray-900 dark:text-white">Leave Management Dashboard</h3>
					<p class="text-gray-600 dark:text-gray-300 text-sm mt-1">
						{new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Approval
						analytics
					</p>
				</div>
				<div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
					<div class="flex items-center gap-2">
						<div class="relative">
							<input
								type="date"
								bind:value={startDate}
								class="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
						<span class="text-white">to</span>
						<div class="relative">
							<input
								type="date"
								bind:value={endDate}
								class="pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-red-300 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
							/>
						</div>
					</div>
					<Button on:click={fetchData} title="Apply Filters">
						<Filter class="w-4 h-4" />
					</Button>
				</div>
			</div>
		</div>
	</div>

	{#if loading}
		<div class="flex items-center justify-center p-12">
			<div class="text-center">
				<div
					class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"
				></div>
				<p class="mt-3 text-gray-600 dark:text-gray-300">Loading leave analytics...</p>
			</div>
		</div>
	{:else if data}
		<!-- KPI Cards Grid -->
		<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Total Applications</h4>
					<div class="p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-gray-900 dark:text-white">
					{data.summary?.totalApplications || 0}
				</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Approval Rate</h4>
					<div class="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-emerald-600 dark:text-emerald-400">
					{data.summary?.approvalRate ?? 0}%
				</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Pending</h4>
					<div class="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-amber-600 dark:text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-amber-600 dark:text-amber-400">
					{data.summary?.pending || 0}
				</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Approved</h4>
					<div class="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M5 13l4 4L19 7"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-green-600 dark:text-green-400">
					{data.summary?.approved || 0}
				</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Rejected</h4>
					<div class="p-1.5 bg-red-100 dark:bg-red-900/30 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-red-600 dark:text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-red-600 dark:text-red-400">
					{data.summary?.rejected || 0}
				</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-2">
					<h4 class="text-xs font-medium text-gray-500 dark:text-gray-400">Cancelled</h4>
					<div class="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
						<svg
							class="w-3.5 h-3.5 text-purple-600 dark:text-purple-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
				<p class="text-xl font-bold text-purple-600 dark:text-purple-400">
					{data.summary?.cancelled || 0}
				</p>
			</div>
		</div>

		<!-- Leave Type Summary Table -->
		{#if data.typeBreakdown && data.typeBreakdown.filter((r: any) => Number(r.count) > 0).length > 0}
			<div
				class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden"
			>
				<div class="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
					<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Leave Type Breakdown</h4>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Distribution of leave applications by type
					</p>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead>
							<tr class="bg-gray-50 dark:bg-gray-700/50">
								<th
									class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
								>
									Leave Type
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
								>
									Applications
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
								>
									Percentage
								</th>
								<th
									class="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
								>
									Status Trend
								</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100 dark:divide-gray-700">
							{#each data.typeBreakdown.filter((r: any) => Number(r.count) > 0) as item, index}
								<tr class="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<div
												class={`p-2 rounded-lg mr-3 ${
													[
														'bg-blue-100 dark:bg-blue-900/30',
														'bg-emerald-100 dark:bg-emerald-900/30',
														'bg-amber-100 dark:bg-amber-900/30',
														'bg-purple-100 dark:bg-purple-900/30',
														'bg-pink-100 dark:bg-pink-900/30'
													][index % 5]
												}`}
											>
												<svg
													class={`w-4 h-4 ${
														[
															'text-blue-600 dark:text-blue-400',
															'text-emerald-600 dark:text-emerald-400',
															'text-amber-600 dark:text-amber-400',
															'text-purple-600 dark:text-purple-400',
															'text-pink-600 dark:text-pink-400'
														][index % 5]
													}`}
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
													/>
												</svg>
											</div>
											<span class="font-medium text-gray-900 dark:text-white">{item.typeName}</span>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<span class="text-gray-900 dark:text-white font-medium">{item.count}</span>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										<div class="flex items-center">
											<div class="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-3">
												<div
													class="h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
													style={`width: ${data.summary?.totalApplications > 0 ? (item.count / data.summary.totalApplications) * 100 : 0}%`}
												></div>
											</div>
											<span class="text-gray-600 dark:text-gray-400 font-medium">
												{data.summary?.totalApplications > 0
													? ((item.count / data.summary.totalApplications) * 100).toFixed(1)
													: '0.0'}%
											</span>
										</div>
									</td>
									<td class="px-6 py-4 whitespace-nowrap">
										{#if item.trend === 'up'}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300"
											>
												<svg
													class="w-4 h-4 mr-1"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M5 10l7-7m0 0l7 7m-7-7v18"
													/>
												</svg>
												Increasing
											</span>
										{:else if item.trend === 'down'}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
											>
												<svg
													class="w-4 h-4 mr-1"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M19 14l-7 7m0 0l-7-7m7 7V3"
													/>
												</svg>
												Decreasing
											</span>
										{:else}
											<span
												class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
											>
												<svg
													class="w-4 h-4 mr-1"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														stroke-width="2"
														d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
													/>
												</svg>
												Stable
											</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else}
			<div
				class="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700"
			>
				<div class="inline-block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl mb-4">
					<svg
						class="w-12 h-12 text-blue-400 dark:text-blue-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						></path>
					</svg>
				</div>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Leave Type Data</h3>
				<p class="text-gray-600 dark:text-gray-400">
					No leave type breakdown available for the selected period.
				</p>
			</div>
		{/if}
	{:else}
		<div class="text-center py-16">
			<div class="inline-block p-6 bg-gray-100 dark:bg-gray-800 rounded-2xl mb-6">
				<svg
					class="w-16 h-16 text-gray-400 dark:text-gray-600"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
			</div>
			<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">
				No Leave Data Available
			</h3>
			<p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
				No leave records found for the selected period. Try adjusting the date range.
			</p>
			<button
				on:click={fetchData}
				class="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-gray-700 transition-opacity flex items-center gap-2 mx-auto"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh Data
			</button>
		</div>
	{/if}
</div>
