<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { DIFFICULTY_LABELS, DARKNESS_LABELS } from '$lib/constants/forms';
	import type { SelectOption } from '$lib/types/viewModels';

	interface Props {
		data: PageData;
		form: ActionData | null;
	}

	let { data, form }: Props = $props();

	// Local state for form submission
	let isSubmitting = $state(false);

	// Prepare options for select fields
	const difficultyOptions: SelectOption[] = [
		{ value: 1, label: DIFFICULTY_LABELS[1] },
		{ value: 2, label: DIFFICULTY_LABELS[2] },
		{ value: 3, label: DIFFICULTY_LABELS[3] }
	];

	const darknessOptions: SelectOption[] = [
		{ value: 1, label: DARKNESS_LABELS[1] },
		{ value: 2, label: DARKNESS_LABELS[2] },
		{ value: 3, label: DARKNESS_LABELS[3] }
	];

	// Helper to get field-specific error
	function getFieldError(fieldName: string): string | undefined {
		if (form && !form.success && form.error.field === fieldName) {
			return form.error.message;
		}
		return undefined;
	}

	// Helper to get global error (not field-specific)
	function getGlobalError(): string | undefined {
		if (form && !form.success && !form.error.field) {
			return form.error.message;
		}
		return undefined;
	}
</script>

<div class="max-w-2xl mx-auto">
	<!-- Page Header -->
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4">Edytuj Historię</h1>
		<p class="text-lg opacity-80">
			Możesz poprawić pytanie i odpowiedź swojej zagadki
		</p>
	</div>

	<!-- Info Alert -->
	<div class="alert alert-info mb-6">
		<span class="text-2xl font-bold shrink-0">ⓘ</span>
		<span class="text-sm">
			Temat, poziom trudności i mroczności nie mogą być edytowane po wygenerowaniu historii.
		</span>
	</div>

	<div class="card bg-base-200 shadow-2xl">
		<form
			method="POST"
			class="card-body space-y-4"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
				};
			}}
		>
			<!-- Global Error Alert -->
			{#if getGlobalError()}
				<div class="alert alert-error">
					<svg
						class="w-6 h-6 shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{getGlobalError()}</span>
				</div>
			{/if}

			<!-- Question -->
			<fieldset class="fieldset !gap-4">
				<legend class="fieldset-legend text-base mb-2">Pytanie *</legend>
				<textarea
					id="question"
					name="question"
					class="textarea w-full px-4 py-3"
					class:textarea-error={getFieldError('question')}
					placeholder="Wpisz pytanie historii..."
					rows="6"
					disabled={isSubmitting}
				>{data.story.question}</textarea>
				{#if getFieldError('question')}
					<div class="label">
						<span class="label-text-alt text-error">{getFieldError('question')}</span>
					</div>
				{/if}
			</fieldset>

			<!-- Answer -->
			<fieldset class="fieldset !gap-4">
				<legend class="fieldset-legend text-base mb-2">Odpowiedź *</legend>
				<textarea
					id="answer"
					name="answer"
					class="textarea w-full px-4 py-3"
					class:textarea-error={getFieldError('answer')}
					placeholder="Wpisz odpowiedź historii..."
					rows="8"
					disabled={isSubmitting}
				>{data.story.answer}</textarea>
				{#if getFieldError('answer')}
					<div class="label">
						<span class="label-text-alt text-error">{getFieldError('answer')}</span>
					</div>
				{/if}
			</fieldset>

			<!-- Subject (Read-Only) -->
			<fieldset class="fieldset !gap-4">
				<legend class="fieldset-legend text-base mb-2">Temat historii</legend>
				<div class="input w-full px-4 py-3 bg-base-300 opacity-60 cursor-not-allowed">
					{data.story.subject}
				</div>
			</fieldset>

			<!-- Difficulty and Darkness (Read-Only) -->
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<!-- Difficulty -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Poziom trudności</legend>
					<select
						class="select w-full px-4 py-3 bg-base-300 opacity-60 cursor-not-allowed"
						disabled
					>
						{#each difficultyOptions as option}
							<option value={option.value} selected={option.value === data.story.difficulty}>
								{option.label}
							</option>
						{/each}
					</select>
				</fieldset>

				<!-- Darkness -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Poziom mroczności</legend>
					<select
						class="select w-full px-4 py-3 bg-base-300 opacity-60 cursor-not-allowed"
						disabled
					>
						{#each darknessOptions as option}
							<option value={option.value} selected={option.value === data.story.darkness}>
								{option.label}
							</option>
						{/each}
					</select>
				</fieldset>
			</div>

			<!-- Submit Button -->
			<button
				type="submit"
				class="btn btn-primary w-full !bg-primary !text-primary-content"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<span class="loading loading-spinner loading-sm"></span>
					Zapisywanie...
				{:else}
					💾 Zapisz zmiany
				{/if}
			</button>
		</form>
	</div>

	<!-- Back Link -->
	<div class="text-center mt-8">
		<a href="/" class="btn btn-ghost">← Powrót do moich historii</a>
	</div>
</div>