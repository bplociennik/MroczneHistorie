<script lang="ts">
	/**
	 * ReadOnlyField Component - Disabled Select Display
	 *
	 * @description Read-only select field for displaying Difficulty or Darkness levels
	 * @component ReadOnlyField
	 */

	import type { SelectOption } from '$lib/types/viewModels';

	interface Props {
		/** Field label (e.g., "Trudność" or "Mroczność") */
		label: string;
		/** Selected value (1, 2, or 3) */
		value: 1 | 2 | 3;
		/** Array of options to display */
		options: SelectOption[];
	}

	let { label, value, options }: Props = $props();
</script>

<div class="form-control w-full">
	<label class="label">
		<span class="label-text text-base font-medium">{label}</span>
	</label>

	<select
		disabled
		class="select select-bordered w-full bg-base-200 cursor-not-allowed opacity-60"
		aria-label={label}
		aria-readonly="true"
	>
		{#each options as option (option.value)}
			<option value={option.value} selected={option.value === value}>
				{option.label}
			</option>
		{/each}
	</select>

	<div class="label">
		<span class="label-text-alt text-base-content/60"> To pole jest tylko do odczytu </span>
	</div>
</div>

<style>
	/* Enhanced disabled state styling */
	select:disabled {
		cursor: not-allowed;
		user-select: none;
	}

	/* Prevent hover effects on disabled select */
	select:disabled:hover {
		border-color: inherit;
	}
</style>
