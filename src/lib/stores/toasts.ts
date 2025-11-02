import { writable } from 'svelte/store';

/**
 * Toast notification type
 */
export interface Toast {
	/** Unique toast identifier */
	id: string;

	/** Message content (in Polish for MVP) */
	message: string;

	/** Toast type affecting visual style */
	type: 'error' | 'success' | 'info' | 'warning';

	/** Display duration in milliseconds (default: 5000) */
	duration?: number;
}

/**
 * Global store for managing toast notifications
 *
 * Toasts are displayed in the top-right corner and auto-dismiss after the specified duration.
 * Used for displaying errors, success messages, and other user feedback.
 *
 * @example
 * ```typescript
 * // Add error toast
 * toastStore.addToast('Wystąpił błąd podczas generowania historii', 'error');
 *
 * // Add success toast
 * toastStore.addToast('Historia została zapisana', 'success');
 *
 * // Manual removal
 * toastStore.removeToast(toastId);
 * ```
 */
function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	// Map of timeouts for automatic removal
	const timeouts = new Map<string, number>();

	return {
		subscribe,

		/**
		 * Adds a new toast notification
		 * @param message - Message to display
		 * @param type - Toast type (default: 'info')
		 * @param duration - Display duration in ms (default: 5000)
		 */
		addToast: (message: string, type: Toast['type'] = 'info', duration = 5000) => {
			const id = crypto.randomUUID();
			const toast: Toast = { id, message, type, duration };

			update((toasts) => [...toasts, toast]);

			// Auto-remove after duration
			const timeoutId = setTimeout(() => {
				removeToast(id);
			}, duration) as unknown as number;

			timeouts.set(id, timeoutId);
		},

		/**
		 * Removes a toast by ID
		 * @param id - Toast ID to remove
		 */
		removeToast: (id: string) => {
			// Clear timeout if exists
			const timeoutId = timeouts.get(id);
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeouts.delete(id);
			}

			// Remove toast from list
			update((toasts) => toasts.filter((t) => t.id !== id));
		}
	};
}

// Need to define removeToast at module level for use in addToast
const store = createToastStore();
const removeToast = store.removeToast;

export const toastStore = store;
