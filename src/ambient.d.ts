// src/ambient.d.ts
declare module 'svelte-apexcharts' {
	import type { SvelteComponentTyped } from 'svelte';

	interface ApexChartsProps {
		options: any;
		series: any[];
		type: string;
		width?: string | number;
		height?: string | number;
	}

	export default class ApexCharts extends SvelteComponentTyped<ApexChartsProps> {}
}
