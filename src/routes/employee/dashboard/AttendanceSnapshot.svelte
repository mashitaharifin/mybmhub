<script lang="ts">
	import { onMount } from 'svelte';
	import { getEmpAttendanceSnapshot } from './services/dashboardAPI';
	import type { AttendanceSnapshot, AttendanceDay } from '$lib/types/empDashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	// --- reactive state ---
	let data: AttendanceSnapshot = {
		totalDaysInWindow: 0,
		totalWorkedHours: 0,
		averageWorkedHours: 0,
		chart: []
	};

	let weekdays: AttendanceDay[] = [];
	let averageHours = 0;
	let loading = true;
	let error: string | null = null;

	const maxHours = 10;
	let chartHeight = 180;
	let barWidth = 24;
	let gap = 12;

	function updateChartSize() {
		if (window.innerWidth >= 1024) {
			// Desktop
			chartHeight = 260;
			barWidth = 32;
			gap = 16;
		} else {
			// Mobile / tablet
			chartHeight = 180;
			barWidth = 24;
			gap = 12;
		}
	}

	function getBarHeight(hours: number) {
		return (hours / maxHours) * chartHeight;
	}

	function getBarX(index: number) {
		return index * (barWidth + gap);
	}

	function getBarY(hours: number) {
		return chartHeight - getBarHeight(hours);
	}

	onMount(async () => {
		try {
			const snapshot = await getEmpAttendanceSnapshot();
			data = snapshot;

			// Filter weekdays (Mon–Fri)
			weekdays = data.chart.filter((d) => {
				if (!d.date) return false;
				const day = new Date(d.date).getDay();
				return day !== 0 && day !== 6; // exclude Sunday(0) & Saturday(6)
			});

			// Calculate average hours
			averageHours = weekdays.length
				? weekdays.reduce((acc, item) => acc + item.workedHours, 0) / weekdays.length
				: 0;
		} catch (err) {
			console.error(err);
			error = 'Failed to load attendance snapshot';
		} finally {
			loading = false;
		}
	});

	let isDark = false;

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');

		const observer = new MutationObserver(() => {
			isDark = document.documentElement.classList.contains('dark');
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['class']
		});

		return () => observer.disconnect();
	});

	onMount(() => {
		updateChartSize();
		window.addEventListener('resize', updateChartSize);

		return () => window.removeEventListener('resize', updateChartSize);
	});
</script>

<GlassCard className="w-ful lg:py-6">
	<!-- Header -->
	<div class="mb-3 lg:mb-2">
		<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200">Attendance Snapshot</h2>
	</div>

	<!-- Content -->
	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400 py-12 text-center">
			Loading attendance snapshot...
		</div>
	{:else if error}
		<div class="text-sm text-red-500 py-12 text-center">
			{error}
		</div>
	{:else}
		<div class="relative w-full min-h-[180px]">
			<!-- Compact chart with less padding -->
			<div class="flex justify-center px-2">
				<svg
					width={weekdays.length * (barWidth + gap)}
					height={chartHeight + (window.innerWidth >= 1024 ? 40 : 30)}
					class="overflow-visible"
				>
					<!-- Y-axis label - removed for more space -->

					<!-- Grid lines - simplified -->
					{#each [0, 3, 6, 9] as tick}
						<line
							x1="0"
							y1={chartHeight - (tick / maxHours) * chartHeight}
							x2={weekdays.length * (barWidth + gap) - gap}
							y2={chartHeight - (tick / maxHours) * chartHeight}
							stroke="#e5e7eb"
							stroke-dasharray="3"
						/>
						<text
							x="-6"
							y={chartHeight - (tick / maxHours) * chartHeight + 3}
							text-anchor="end"
							class="text-xs fill-gray-500 dark:fill-gray-400"
						>
							{tick}
						</text>
					{/each}

					<defs>
						<!-- Light mode bar gradient -->
						<linearGradient id="barGradientLight" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#f9a8d4" />
							<!-- pink-300 -->
							<stop offset="50%" stop-color="#fca5a5" />
							<!-- red-300 -->
							<stop offset="100%" stop-color="#f87171" />
							<!-- red-400 -->
						</linearGradient>

						<!-- Dark mode bar gradient -->
						<linearGradient id="barGradientDark" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stop-color="#2a0f1f" />
							<!-- orange -->
							<stop offset="50%" stop-color="#3b164a" />
							<!-- purple -->
							<stop offset="100%" stop-color="#7a1f3d" />
							<!-- deep red -->
						</linearGradient>
					</defs>

					<!-- Bars -->
					{#each weekdays as item, index}
						<g class="group cursor-pointer">
							<rect
								x={getBarX(index)}
								y={getBarY(item.workedHours)}
								width={barWidth}
								height={getBarHeight(item.workedHours)}
								rx="6"
								fill={isDark ? 'url(#barGradientDark)' : 'url(#barGradientLight)'}
								class="transition-opacity duration-200 group-hover:opacity-70"
							/>

							<title>{item.workedHours} hours</title>

							{#if item.workedHours > 0}
								<text
									x={getBarX(index) + barWidth / 2}
									y={getBarY(item.workedHours) - 6}
									text-anchor="middle"
									class="text-xs lg:text-sm fill-gray-800 dark:fill-gray-200"
								>
									{item.workedHours}h
								</text>
							{/if}

							<text
								x={getBarX(index) + barWidth / 2}
								y={chartHeight + 12}
								text-anchor="middle"
								class="text-xs fill-gray-600 dark:fill-gray-300"
							>
								{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short' })}
							</text>
						</g>
					{/each}

					<!-- X-axis label - removed for more space -->
				</svg>
			</div>

			<!-- Average - Compact -->
			<div class="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
				Average Hours Worked:
				<span class="font-semibold text-gray-800 dark:text-gray-200 ml-1">
					{averageHours.toFixed(1)}h
				</span>
			</div>
		</div>
	{/if}
</GlassCard>
