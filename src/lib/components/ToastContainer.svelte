<script lang="ts">
	import { toastStore } from '$lib/stores/toasts';
	import { fly } from 'svelte/transition';

	/**
	 * Get alert classes based on toast type
	 */
	function getAlertClass(type: 'error' | 'success' | 'info' | 'warning'): string {
		const baseClasses = 'alert shadow-xl min-w-[320px] max-w-md p-4';
		const typeClasses = {
			error: 'alert-error bg-error text-error-content',
			success: 'alert-success bg-success text-success-content',
			info: 'alert-info bg-info text-info-content',
			warning: 'alert-warning bg-warning text-warning-content'
		};
		return `${baseClasses} ${typeClasses[type]}`;
	}

	/**
	 * Get icon for toast type
	 */
	function getIcon(type: 'error' | 'success' | 'info' | 'warning'): string {
		const icons = {
			error: '✕',
			success: '✓',
			info: 'ⓘ',
			warning: '⚠'
		};
		return icons[type];
	}
</script>

<div class="toast toast-top toast-end z-50">
	{#each $toastStore as toast (toast.id)}
		<div class={getAlertClass(toast.type)} transition:fly={{ y: -20, duration: 300 }} role="alert">
			<div class="flex items-center gap-3 w-full">
				<!-- Icon -->
				<span class="text-2xl font-bold shrink-0">
					{getIcon(toast.type)}
				</span>

				<!-- Message -->
				<span class="flex-1 text-base font-medium">{toast.message}</span>

				<!-- Close button -->
				<button
					class="btn btn-sm btn-ghost btn-circle shrink-0 hover:bg-base-content/20"
					onclick={() => toastStore.removeToast(toast.id)}
					aria-label="Zamknij powiadomienie"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>
		</div>
	{/each}
</div>
