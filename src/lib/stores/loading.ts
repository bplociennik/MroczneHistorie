import { writable } from 'svelte/store';

/**
 * Global loader state
 */
interface LoadingState {
	/** Whether an operation is executing */
	isLoading: boolean;

	/** Optional message to display */
	message?: string;
}

/**
 * Global store for managing loading state
 *
 * Used primarily to display full-screen loader during:
 * - AI story generation (timeout: 45s)
 * - Other long-running async operations
 *
 * @example
 * ```typescript
 * // Start loading
 * loadingStore.start('Tworzymy Twoją mroczną historię...');
 *
 * // Stop loading
 * loadingStore.stop();
 * ```
 */
function createLoadingStore() {
	const { subscribe, set } = writable<LoadingState>({
		isLoading: false,
		message: undefined
	});

	return {
		subscribe,

		/**
		 * Starts loading with optional message
		 * @param message - Text to display in the loader
		 */
		start: (message?: string) => {
			set({ isLoading: true, message });
		},

		/**
		 * Stops loading and clears message
		 */
		stop: () => {
			set({ isLoading: false, message: undefined });
		},

		/**
		 * Reset to initial state (alias for stop)
		 */
		reset: () => {
			set({ isLoading: false, message: undefined });
		}
	};
}

export const loadingStore = createLoadingStore();