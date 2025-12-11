<script lang="ts">
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { Filter } from 'lucide-svelte';
	import Button from '$lib/components/ui/button.svelte';

	const dispatch = createEventDispatcher();

	let ApexCharts: any = null;
	let chartsLoaded = false;
	let startDate: string;
	let endDate: string;
	let data: any = null;
	let loading = false;

	// Chart data
	let attendanceChartOptions: any = null;
	let attendanceChartSeries: number[] = [];
	let geofenceSeries: any[] = [];

	const today = new Date();
	const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
	const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

	startDate = firstDay.toISOString().split('T')[0];
	endDate = lastDay.toISOString().split('T')[0];

	onMount(async () => {
		try {
			const module = await import('svelte-apexcharts');
			ApexCharts = module.default;
			chartsLoaded = true;

			await fetchData();
		} catch (err) {
			console.error('Error loading chart library:', err);
		}
	});

	async function fetchData() {
		loading = true;

		try {
			const res = await fetch(`/manager/reports/attendance?start=${startDate}&end=${endDate}`);

			if (!res.ok) {
				throw new Error(`HTTP error! status: ${res.status}`);
			}

			data = await res.json();
			updateChartData();
			// Dispatch success alert
			dispatch('alert', {
				message: `Attendance data loaded for ${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`,
				variant: 'success'
			});
		} catch (err) {
			console.error('Error fetching attendance data:', err);
			data = null;

			// Dispatch error alert
			dispatch('alert', {
				message: 'Failed to load attendance data. Please try again.',
				variant: 'error'
			});
		} finally {
			loading = false;
		}
	}

	function updateChartData() {
		// Donut chart for attendance
		attendanceChartOptions = {
			chart: {
				type: 'donut',
				height: 300,
				fontFamily: 'Inter, sans-serif',
				foreColor: '#6b7280',
				background: 'transparent'
			},
			labels: ['Present', 'Absent', 'Late', 'Half Day'],
			colors: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6'],
			legend: {
				show: true,
				position: 'bottom',
				labels: {
					colors: '#6b7280',
					useSeriesColors: false
				}
			},
			plotOptions: {
				pie: {
					donut: {
						size: '55%',
						labels: {
							show: true,
							total: {
								show: true,
								label: 'Total',
								color: '#111827',
								formatter: function (w: any) {
									return w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
								}
							}
						}
					}
				}
			},
			dataLabels: {
				enabled: false
			},
			stroke: {
				width: 0
			},
			theme: {
				mode: 'light'
			}
		};

		attendanceChartSeries = data
			? [
					Number(data.present) || 0,
					Number(data.absent) || 0,
					Number(data.late) || 0,
					Number(data.halfDay) || 0
				]
			: [0, 0, 0, 0];

		// Bar chart for geofence
		geofenceSeries = data
			? [
					{ name: 'Inside Geofence', data: [Number(data.geofence?.inside) || 0] },
					{ name: 'Outside Geofence', data: [Number(data.geofence?.outside) || 0] }
				]
			: [
					{ name: 'Inside Geofence', data: [0] },
					{ name: 'Outside Geofence', data: [0] }
				];
	}

	$: if (data) updateChartData();
</script>

<div class="space-y-6">
	<!-- Date Picker with Gradient Header -->
	<div
		class="bg-gradient-to-r from-white to-red-50 dark:from-gray-900 dark:to-gray-800 border-l-4 border-red-500 dark:border-red-600 rounded-xl shadow-lg overflow-hidden"
	>
		<div class="p-6">
			<div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
				<div >
					<h3 class="text-lg font-bold text-gray-900 dark:text-white">Attendance Analytics Dashboard</h3>
					<p class="text-gray-600 dark:text-gray-300 text-sm mt-1">
						{new Date(startDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} • Real-time
						monitoring
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
					class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"
				></div>
				<p class="mt-3 text-gray-600 dark:text-gray-300">Loading attendance data...</p>
			</div>
		</div>
	{:else if data}
		<!-- KPI Cards Grid -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Working Days</h4>
					<div class="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
						<svg
							class="w-4 h-4 text-gray-600 dark:text-gray-300"
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
				</div>
				<p class="text-2xl font-bold text-gray-900 dark:text-white">{data.totalWorkingDays || 0}</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Perfect Attendance</h4>
					<div class="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
						<svg
							class="w-4 h-4 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
					</div>
				</div>
				<p class="text-2xl font-bold text-green-600 dark:text-green-400">
					{data.perfectAttendanceEmployees || 0}
				</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Employees with full attendance</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Attendance Issues</h4>
					<div class="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
						<svg
							class="w-4 h-4 text-amber-600 dark:text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z"
							/>
						</svg>
					</div>
				</div>
				<p class="text-2xl font-bold text-amber-600 dark:text-amber-400">
					{data.employeesWithIssues || 0}
				</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Needs attention</p>
			</div>

			<div
				class="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-shadow"
			>
				<div class="flex items-center justify-between mb-3">
					<h4 class="text-sm font-medium text-gray-500 dark:text-gray-400">Missing Punches</h4>
					<div class="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
						<svg
							class="w-4 h-4 text-red-600 dark:text-red-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
							/>
						</svg>
					</div>
				</div>
				<p class="text-2xl font-bold text-red-600 dark:text-red-400">{data.missingPunches || 0}</p>
				<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">Incomplete records</p>
			</div>
		</div>

		<!-- Charts Grid -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Attendance Overview Chart -->
			<div
				class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
			>
				<div class="flex items-center justify-between mb-6">
					<div>
						<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Attendance Overview</h4>
						<p class="text-sm text-gray-500 dark:text-gray-400">Distribution across categories</p>
					</div>
				</div>

				{#if ApexCharts && chartsLoaded}
					<ApexCharts
						options={attendanceChartOptions}
						series={attendanceChartSeries}
						type="donut"
						height={300}
					/>
				{/if}

				<div class="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
					<div class="text-center p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
						<div class="text-xl font-bold text-emerald-700 dark:text-emerald-400">
							{data.present || 0}
						</div>
						<div class="text-sm text-emerald-600 dark:text-emerald-300">Present</div>
					</div>
					<div class="text-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
						<div class="text-xl font-bold text-red-700 dark:text-red-400">{data.absent || 0}</div>
						<div class="text-sm text-red-600 dark:text-red-300">Absent</div>
					</div>
					<div class="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
						<div class="text-xl font-bold text-amber-700 dark:text-amber-400">{data.late || 0}</div>
						<div class="text-sm text-amber-600 dark:text-amber-300">Late</div>
					</div>
					<div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
						<div class="text-xl font-bold text-purple-700 dark:text-purple-400">
							{data.halfDay || 0}
						</div>
						<div class="text-sm text-purple-600 dark:text-purple-300">Half Day</div>
					</div>
				</div>
			</div>

			<!-- Geofence Compliance Chart -->
			<div
				class="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6"
			>
				<div class="flex items-center justify-between mb-6">
					<div>
						<h4 class="text-lg font-semibold text-gray-900 dark:text-white">Geofence Compliance</h4>
						<p class="text-sm text-gray-500 dark:text-gray-400">Check-in location analysis</p>
					</div>
					
				</div>

				{#if ApexCharts && chartsLoaded}
					<ApexCharts
						options={{
							chart: {
								type: 'bar',
								height: 300,
								toolbar: { show: false },
								fontFamily: 'Inter, sans-serif',
								background: 'transparent'
							},
							plotOptions: {
								bar: {
									horizontal: false,
									columnWidth: '45%',
									borderRadius: 8,
									borderRadiusApplication: 'end',
									distributed: false
								}
							},
							colors: ['#10b981', '#ef4444'],
							xaxis: {
								categories: ['Compliance Analysis'],
								labels: {
									style: {
										fontSize: '12px',
										colors: '#6b7280'
									}
								}
							},
							yaxis: {
								title: {
									text: 'Number of Check-ins',
									style: {
										fontSize: '12px',
										color: '#6b7280'
									}
								},
								labels: {
									style: {
										fontSize: '12px',
										colors: '#6b7280'
									}
								}
							},
							dataLabels: {
								enabled: true,
								formatter: function (val: number) {
									return val;
								},
								offsetY: -20,
								style: {
									fontSize: '12px',
									colors: ['#111827']
								}
							},
							tooltip: {
								enabled: true,
								theme: 'dark'
							},
							grid: {
								borderColor: '#f3f4f6',
								strokeDashArray: 4
							}
						}}
						series={geofenceSeries}
						type="bar"
						height={300}
					/>
				{/if}

				<div class="mt-6 grid grid-cols-2 gap-4">
					<div
						class="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg"
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
									{data.geofence?.inside || 0}
								</div>
								<div class="text-sm text-emerald-600 dark:text-emerald-300">Inside Geofence</div>
							</div>
							<div class="text-emerald-500">
								<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
					</div>
					<div
						class="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg"
					>
						<div class="flex items-center justify-between">
							<div>
								<div class="text-2xl font-bold text-red-700 dark:text-red-400">
									{data.geofence?.outside || 0}
								</div>
								<div class="text-sm text-red-600 dark:text-red-300">Outside Geofence</div>
							</div>
							<div class="text-red-500">
								<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
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
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					></path>
				</svg>
			</div>
			<h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Attendance Data</h3>
			<p class="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
				No attendance records found for the selected period. Try adjusting the date range.
			</p>
			<button
				on:click={fetchData}
				class="px-6 py-3 bg-gradient-to-r from-gray-900 to-red-800 dark:from-gray-800 dark:to-red-900 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 mx-auto"
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
