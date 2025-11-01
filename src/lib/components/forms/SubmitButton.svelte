<script lang="ts">
	/**
	 * SubmitButton Component - Form Submit Button with Loading State
	 *
	 * @description Primary button for form submission with loading spinner
	 * @component SubmitButton
	 */

	interface Props {
		/** Whether form is currently submitting */
		loading?: boolean;
		/** Whether button is explicitly disabled */
		disabled?: boolean;
		/** Button text label */
		label?: string;
	}

	let { loading = false, disabled = false, label = 'Zapisz zmiany' }: Props = $props();

	// Button is disabled if explicitly disabled OR currently loading
	const isDisabled = $derived(disabled || loading);
</script>

<button
	type="submit"
	disabled={isDisabled}
	class="btn btn-primary w-full sm:w-auto min-w-[200px]"
	aria-busy={loading}
>
	{#if loading}
		<span class="loading loading-spinner loading-sm"></span>
		<span>Zapisywanie...</span>
	{:else}
		{label}
	{/if}
</button>

<style>
	/* Ensure button maintains size during loading state */
	button {
		transition: opacity 0.2s ease-in-out;
	}

	/* Enhanced disabled state */
	button:disabled {
		cursor: not-allowed;
	}

	/* Smooth spinner appearance */
	.loading {
		margin-right: 0.5rem;
	}
</style>