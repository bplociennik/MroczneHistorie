<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { loadingStore } from '$lib/stores/loading';
	import { toastStore } from '$lib/stores/toasts';
	import { slide } from 'svelte/transition';
	import type { GeneratedStoryDTO } from '../../types';

	// Props
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state
	let showAnswer = $state(false);
	let isSubmitting = $state(false);

	// List of 50 random subjects for "Losuj" button
	const randomSubjects = [
		'Tajemnicza latarnia morska',
		'Znikający autostopowicz',
		'Opuszczony psychiatryk',
		'Stary zegarmistrz',
		'Mroczny las',
		'Dziwny gość w hotelu',
		'Niezwykły obrazek',
		'Zagubiona lalka',
		'Cicha biblioteka',
		'Stary zegar',
		'Pusta karuzela',
		'Zimny poranek',
		'Czarna róża',
		'Samotny dom na wzgórzu',
		'Dziwny list',
		'Nocny telefon',
		'Zaginiony passagier',
		'Stare lustro',
		'Pusty pokój',
		'Tajemniczy dźwięk',
		'Opuszczona stacja',
		'Straszny sen',
		'Zimne ręce',
		'Stara fotografia',
		'Dziwny zapach',
		'Nocny spacer',
		'Puste buty',
		'Złamana zabawka',
		'Ciemny korytarz',
		'Stary klucz',
		'Zimna woda',
		'Zamknięte drzwi',
		'Stare nagranie',
		'Pusta kołyska',
		'Dziwne światło',
		'Nocny krzyk',
		'Zaginione dziecko',
		'Stara szafa',
		'Pusty grób',
		'Zimny dotyk',
		'Tajemniczy cień',
		'Stare radio',
		'Puste kino',
		'Dziwna cisza',
		'Nocny gość',
		'Zimne spojrzenie',
		'Stara studnia',
		'Puste łóżko',
		'Tajemnicze ślady',
		'Nocny deszcz'
	];

	// Helper functions
	function randomizeSubject() {
		const input = document.getElementById('subject') as HTMLInputElement;
		if (input) {
			const randomIndex = Math.floor(Math.random() * randomSubjects.length);
			input.value = randomSubjects[randomIndex];
			input.focus();
		}
	}

	function toggleAnswer() {
		showAnswer = !showAnswer;
	}

	// Reactive derived values using $derived
	let story = $derived(form?.generatedStory as GeneratedStoryDTO | undefined);
	let derivedFormData = $derived(
		form?.formData
			? {
					difficulty: String(form.formData.difficulty),
					darkness: String(form.formData.darkness),
					subject: form.formData.subject
				}
			: { difficulty: '1', darkness: '1', subject: '' }
	);
</script>

<svelte:head>
	<title>Generuj Historię - MroczneHistorie</title>
</svelte:head>

<div class="max-w-2xl mx-auto">
	{#if !story}
		<!-- State 1: Generation Form -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-4">Generuj Mroczną Historię</h1>
			<p class="text-lg opacity-80">
				Opisz temat zagadki, a AI stworzy dla Ciebie unikalną czarną historię
			</p>
		</div>

		<!-- Info -->
		<div class="alert alert-info mb-6">
			<span class="text-2xl font-bold shrink-0">ⓘ</span>
			<span class="text-sm">
				Generowanie historii może potrwać do 45 sekund. Nie odświeżaj strony podczas generowania.
			</span>
		</div>

		<div class="card bg-base-200 shadow-2xl">
			<form
				method="POST"
				action="?/generate"
				class="card-body space-y-4"
				use:enhance={() => {
					isSubmitting = true;
					loadingStore.start('Tworzymy Twoją mroczną historię...');

					return async ({ result, update }) => {
						loadingStore.stop();
						isSubmitting = false;

						if (result.type === 'failure') {
							const errorMessage =
								(result.data as any)?.error || 'Nie udało się wygenerować historii';
							toastStore.addToast(errorMessage, 'error');
						}

						if (result.type === 'success') {
							// Reset answer visibility on new generation
							showAnswer = false;
						}

						await update();
					};
				}}
			>
				<!-- Subject -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Temat historii *</legend>
					<textarea
						id="subject"
						name="subject"
						class="textarea w-full h-24 px-4 py-3"
						class:input-error={form?.errors?.subject}
						placeholder="Np. Kobieta w czarnej sukni stoi na moście o północy..."
						required
						minlength="1"
						maxlength="150"
						disabled={isSubmitting}
						value={derivedFormData.subject}
					></textarea>
					{#if form?.errors?.subject}
						<div class="label">
							<span class="label-text-alt text-error">{form.errors.subject}</span>
						</div>
					{/if}
					<div class="label flex justify-between items-center">
						<span>Maksymalnie 150 znaków</span>
						<a
							href="#"
							class="btn btn-sm btn-soft btn-primary gap-1"
							onclick={(e) => {
								e.preventDefault();
								randomizeSubject();
							}}
						>
							🎲 Losuj temat
						</a>
					</div>
				</fieldset>

				<!-- Difficulty -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Poziom trudności</legend>
					<select
						id="difficulty"
						name="difficulty"
						class="select w-full px-4 py-3"
						required
						disabled={isSubmitting}
						value={derivedFormData.difficulty}
					>
						<option value="1" selected>Łatwy - proste, oczywiste tropy</option>
						<option value="2">Średni - wymaga kilku pytań, zawiera fałszywe tropy</option>
						<option value="3">Trudny - nieoczywisty, wielowątkowy, wymaga kreatywności</option>
					</select>
					<div class="label">Wybierz jak skomplikowana ma być zagadka</div>
				</fieldset>

				<!-- Darkness -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Poziom mroczności</legend>
					<select
						id="darkness"
						name="darkness"
						class="select w-full px-4 py-3"
						required
						disabled={isSubmitting}
						value={derivedFormData.darkness}
					>
						<option value="1">Tajemnica - atmosferyczna, bez przemocy</option>
						<option value="2">Niepokojąca - sugerowana przemoc, niepokojący ton</option>
						<option value="3">Brutalna - jawna przemoc, gore, silny przekaz</option>
					</select>
					<div class="label">Określ jak mroczna ma być historia</div>
				</fieldset>

				<!-- Submit -->
				<button
					type="submit"
					class="btn btn-primary w-full !bg-primary !text-primary-content"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Generowanie...
					{:else}
						✨ Generuj Historię
					{/if}
				</button>
			</form>
		</div>

		<!-- Back -->
		<div class="text-center mt-8">
			<a href="/" class="btn btn-ghost">← Powrót do strony głównej</a>
		</div>
	{:else}
		<!-- State 2: Preview -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-4">Twoja Nowa Historia</h1>
			<p class="text-lg opacity-80">
				Przejrzyj wygenerowaną zagadkę i zdecyduj, czy chcesz ją zapisać
			</p>
		</div>

		<div class="card bg-base-200 shadow-2xl">
			<div class="card-body space-y-6">
				<!-- Question -->
				<div>
					<h2 class="text-2xl font-bold mb-3 flex items-center gap-2">
						<span>❓</span>
						Pytanie:
					</h2>
					<p class="text-lg leading-relaxed whitespace-pre-wrap bg-base-300 p-4 rounded-lg">
						{story.question}
					</p>
				</div>

				<!-- Toggle answer button -->
				<a
					href="#"
					class="btn btn-secondary btn-lg w-full"
					onclick={(e) => {
						e.preventDefault();
						toggleAnswer();
					}}
				>
					{#if showAnswer}
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
							/>
						</svg>
						Ukryj odpowiedź
					{:else}
						<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
							/>
						</svg>
						Odkryj odpowiedź
					{/if}
				</a>

				<!-- Answer (conditional) -->
				{#if showAnswer}
					<div transition:slide>
						<h2 class="text-2xl font-bold mb-3 flex items-center gap-2">
							<span>💡</span>
							Odpowiedź:
						</h2>
						<p class="text-lg leading-relaxed whitespace-pre-wrap bg-base-300 p-4 rounded-lg">
							{story.answer}
						</p>
					</div>
				{/if}

				<!-- Metadata -->
				<div class="divider"></div>

				<div class="flex flex-wrap gap-2">
					<div class="badge badge-lg badge-outline">Temat: {derivedFormData.subject}</div>
					<div class="badge badge-lg badge-outline">Trudność: {derivedFormData.difficulty}</div>
					<div class="badge badge-lg badge-outline">Mroczność: {derivedFormData.darkness}</div>
				</div>

				<!-- Actions -->
				<div class="flex flex-col sm:flex-row gap-3 mt-6">
					<!-- Save button -->
					<form
						id="save-form"
						method="POST"
						action="?/save"
						class="flex-1"
						use:enhance={() => {
							loadingStore.start('Zapisuję historię...');

							return async ({ result, update }) => {
								loadingStore.stop();

								if (result.type === 'redirect') {
									toastStore.addToast('Historia została zapisana!', 'success');
									await goto(result.location);
								}

								if (result.type === 'failure') {
									const errorMessage =
										(result.data as any)?.error || 'Nie udało się zapisać historii';
									toastStore.addToast(errorMessage, 'error');
								}

								await update();
							};
						}}
					>
						<input type="hidden" name="subject" value={derivedFormData.subject} />
						<input type="hidden" name="difficulty" value={derivedFormData.difficulty} />
						<input type="hidden" name="darkness" value={derivedFormData.darkness} />
						<input type="hidden" name="question" value={story.question} />
						<input type="hidden" name="answer" value={story.answer} />

						<a
							href="#"
							class="btn btn-primary btn-lg w-full"
							onclick={(e) => {
								e.preventDefault();
								document.getElementById('save-form')?.requestSubmit();
							}}
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M5 13l4 4L19 7"
								/>
							</svg>
							Zapisz na mojej liście
						</a>
					</form>

					<!-- Regenerate button -->
					<form
						id="regenerate-form"
						method="POST"
						action="?/generate"
						class="flex-1"
						use:enhance={() => {
							loadingStore.start('Tworzymy nową historię...');
							showAnswer = false;

							return async ({ result, update }) => {
								loadingStore.stop();

								if (result.type === 'failure') {
									const errorMessage =
										(result.data as any)?.error || 'Nie udało się wygenerować historii';
									toastStore.addToast(errorMessage, 'error');
								}

								await update();
							};
						}}
					>
						<input type="hidden" name="subject" value={derivedFormData.subject} />
						<input type="hidden" name="difficulty" value={derivedFormData.difficulty} />
						<input type="hidden" name="darkness" value={derivedFormData.darkness} />

						<a
							href="#"
							class="btn btn-outline btn-lg w-full"
							onclick={(e) => {
								e.preventDefault();
								document.getElementById('regenerate-form')?.requestSubmit();
							}}
						>
							<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							Wygeneruj ponownie
						</a>
					</form>
				</div>
			</div>
		</div>

		<!-- Back -->
		<div class="text-center mt-8">
			<a href="/" class="btn btn-ghost">← Powrót do strony głównej</a>
		</div>
	{/if}
</div>
