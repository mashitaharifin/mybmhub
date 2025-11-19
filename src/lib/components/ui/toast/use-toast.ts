// src/lib/components/ui/use-toast.ts
import { writable } from 'svelte/store';

export interface ToastOptions {
	id?: number;
	title: string;
	description?: string;
	variant?: 'default' | 'destructive' | 'success' | 'info';
	duration?: number; // ms
}

export const toasts = writable<ToastOptions[]>([]);

export function toast(options: ToastOptions) {
	const id = Date.now();
	const defaults: ToastOptions = {
        variant: 'default',
        duration: 3000,
        title: ''
    };

	const newToast = { ...defaults, ...options, id };
	toasts.update((t) => [...t, newToast]);

	// Auto remove after duration
	setTimeout(() => {
		toasts.update((t) => t.filter((x) => x.id !== id));
	}, newToast.duration);
}
