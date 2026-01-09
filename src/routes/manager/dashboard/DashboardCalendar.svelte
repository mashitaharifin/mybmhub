<script lang="ts">
	import { ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { getCalendarData } from './services/dashboardAPI';
	import type { CalendarEvent } from '$lib/types/dashboard';
	import GlassCard from '$lib/components/ui/GlassCard.svelte';

	let currentDate = new Date();
	let currentMonth: number;
	let currentYear: number;
	let daysInMonth: number[] = [];
	let startDay: number;

	let allEvents: CalendarEvent[] = [];
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
		updateCalendar();
		await loadCalendarEvents();
	});

	async function loadCalendarEvents() {
		try {
			allEvents = await getCalendarData();
			console.log('Loaded events:', allEvents); // Debug log
		} catch (err) {
			console.error('Failed to fetch calendar data:', err);
			error = 'Unable to fetch calendar events';
		} finally {
			loading = false;
		}
	}

	function updateCalendar() {
		currentMonth = currentDate.getMonth();
		currentYear = currentDate.getFullYear();

		const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
		daysInMonth = Array.from({ length: totalDays }, (_, i) => i + 1);

		startDay = new Date(currentYear, currentMonth, 1).getDay();
	}

	function prevMonth() {
		currentDate = new Date(currentYear, currentMonth - 1, 1);
		updateCalendar();
	}

	function nextMonth() {
		currentDate = new Date(currentYear, currentMonth + 1, 1);
		updateCalendar();
	}

	function formatDate(day: number) {
		return `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
	}

	// FIX: Improved today detection
	function isToday(day: number) {
		const today = new Date();
		return (
			day === today.getDate() &&
			currentMonth === today.getMonth() &&
			currentYear === today.getFullYear()
		);
	}

	function getHolidayEvents(day: number) {
		const dateStr = formatDate(day);
		return allEvents.filter((e) => e.type === 'holiday' && e.date === dateStr);
	}

	function getLeaveEvents(day: number) {
		const dateStr = formatDate(day);
		return allEvents.filter((e) => e.type === 'leave' && e.date === dateStr);
	}

	// Helper to get tooltip text for a day
	function getTooltipText(day: number) {
		const dateStr = formatDate(day);
		const dayEvents = allEvents.filter((e) => e.date === dateStr);

		if (dayEvents.length === 0) return '';

		return dayEvents.map((e) => e.title).join('\n');
	}
</script>

<GlassCard>
	<h2 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3 lg:mb-2">Calendar</h2>

	<!-- Month Navigation -->
	<div class="flex items-center justify-center mb-3">
		<button
			on:click={prevMonth}
			class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
		>
			<ChevronLeft class="w-4 h-4 text-gray-700 dark:text-gray-200" />
		</button>
		<span class="mx-3 font-medium text-sm text-gray-800 dark:text-gray-200">
			{new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(currentDate)}
		</span>
		<button
			on:click={nextMonth}
			class="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition"
		>
			<ChevronRight class="w-4 h-4 text-gray-700 dark:text-gray-200" />
		</button>
	</div>

	<!-- Events Counter -->
	<div class="text-xs text-gray-500 dark:text-gray-400 text-center mb-2">
		{allEvents.filter((e) =>
			e.date.startsWith(`${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`)
		).length}
		events this month
	</div>

	{#if loading}
		<div class="text-sm text-gray-500 dark:text-gray-400 text-center my-5">Loading calendar...</div>
	{:else if error}
		<div class="text-sm text-red-500 text-center my-5">{error}</div>
	{:else}
		<!-- Day names -->
		<div
			class="grid grid-cols-7 text-center text-xs font-medium text-gray-500 dark:text-gray-400 mb-2"
		>
			<span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span
				>Fri</span
			><span>Sat</span>
		</div>

		<!-- Calendar grid -->
		<div class="grid grid-cols-7 text-center gap-y-2 text-sm">
			{#each Array(startDay) as _}<span></span>{/each}

			{#each daysInMonth as day}
				<div
					class="relative w-8 h-8 flex items-center justify-center rounded-full cursor-pointer transition
                 hover:bg-gray-200 dark:hover:bg-gray-800 mx-auto"
					class:is-today={isToday(day)}
					title={getTooltipText(day)}
				>
					<span
						class="z-10 {isToday(day)
							? 'font-semibold text-red-600 dark:text-red-400'
							: 'text-gray-800 dark:text-gray-200'}"
					>
						{day}
					</span>

					{#if isToday(day)}
						<div class="absolute inset-0 border-2 border-red-500 rounded-full"></div>
					{/if}

					<!-- Event dots -->
					<div class="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-0.5">
						{#each getHolidayEvents(day) as _}
							<div class="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
						{/each}
						{#each getLeaveEvents(day) as _}
							<div class="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div
			class="flex items-center justify-center gap-3 mt-3 text-xs text-gray-500 dark:text-gray-400"
		>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 bg-orange-500 rounded-full"></span> Leave
			</div>
			<div class="flex items-center gap-1">
				<span class="w-2 h-2 bg-red-500 rounded-full"></span> Holiday
			</div>
		</div>
	{/if}
</GlassCard>

<style>
	.is-today {
		position: relative;
	}
</style>
