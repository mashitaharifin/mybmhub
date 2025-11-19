/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,js,svelte,ts}' // covers all SvelteKit files
	],
	darkMode: 'class', //  for theme switching
	theme: {
		extend: {
			colors: {
				background: {
					DEFAULT: '#f9fafb', // light background
					dark: '#070720' // dark background
				},
				card: {
					DEFAULT: '#ffffff',
					dark: '#111827'
				},
				border: {
					DEFAULT: '#e5e7eb',
					dark: '#3f3f46'
				},
				text: {
					DEFAULT: '#18181b',
					dark: '#f4f4f5'
				}
			}
		}
	},
	plugins: []
};
