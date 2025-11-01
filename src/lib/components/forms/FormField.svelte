<script lang="ts">
	/**
	 * FormField Component - Reusable Textarea Field
	 *
	 * @description Multi-line text input with label, placeholder, and error display
	 * @component FormField
	 */

	interface Props {
		/** HTML input name attribute */
		name: string;
		/** Field label text */
		label: string;
		/** Initial/current value */
		value: string;
		/** Placeholder text */
		placeholder?: string;
		/** Number of textarea rows */
		rows?: number;
		/** Error message to display */
		error?: string;
		/** Whether field is required */
		required?: boolean;
	}

	let { name, label, value, placeholder = '', rows = 6, error, required = false }: Props = $props();
</script>

<div class="form-control w-full">
	<label for={name} class="label">
		<span class="label-text text-base font-medium">
			{label}
			{#if required}
				<span class="text-error">*</span>
			{/if}
		</span>
	</label>

	<textarea
		id={name}
		{name}
		{rows}
		{placeholder}
		{required}
		class="textarea textarea-bordered w-full bg-base-200 focus:textarea-primary transition-colors"
		class:textarea-error={error}
		aria-invalid={error ? 'true' : 'false'}
		aria-describedby={error ? `${name}-error` : undefined}
	>{value}</textarea>

	{#if error}
		<label for={name} class="label">
			<span id="{name}-error" class="label-text-alt text-error">
				{error}
			</span>
		</label>
	{/if}
</div>

<style>
	/* Ensure textarea resizes properly */
	textarea {
		resize: vertical;
		min-height: 6rem;
	}

	/* Dark mode focus enhancement */
	textarea:focus {
		outline: none;
	}
</style>