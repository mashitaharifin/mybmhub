// src/lib/stores/theme.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

const defaultTheme = 'light';

// Only read from localStorage in the browser
const initialTheme = browser
	? localStorage.getItem('mybm-hub-theme') || defaultTheme
	: defaultTheme;

// Create the theme store
export const theme = writable(initialTheme);

// Create the toggle function
export const toggleTheme = () => {
	theme.update((current) => (current === 'light' ? 'dark' : 'light'));
};

// Keep localStorage and document <html> class in sync
if (browser) {
	theme.subscribe((value) => {
		localStorage.setItem('mybm-hub-theme', value);
		document.documentElement.classList.toggle('dark', value === 'dark');
	});
}
