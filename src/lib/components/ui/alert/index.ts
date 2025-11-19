// src/lib/components/ui/alert/index.ts
import { tv } from 'tailwind-variants';

export { default as Root } from './alert.svelte';
export { default as Title } from './alert-title.svelte';
export { default as Description } from './alert-description.svelte';

export const alertVariants = tv({
	base: 'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
	variants: {
		variant: {
			default:
				'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200',
			success:
				'bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300',
			warning:
				'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 text-yellow-800 dark:text-yellow-300',
			error: 'bg-red-50 dark:bg-red-900/20 border-red-600 text-red-700 dark:text-red-300',
			info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-300'
		}
	},
	defaultVariants: {
		variant: 'default'
	}
});
