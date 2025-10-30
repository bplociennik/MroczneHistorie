<script lang="ts">
	import { enhance } from '$app/forms';
	import { loadingStore } from '$lib/stores/loading';
	import { toastStore } from '$lib/stores/toasts';

	let loading = $state(false);
</script>

<div class="max-w-2xl mx-auto">
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
			class="card-body space-y-4"
			use:enhance={() => {
				loading = true;
				loadingStore.start('Tworzymy Twoją mroczną historię...');

				// Timeout after 45 seconds
				const timeoutId = setTimeout(() => {
					loadingStore.stop();
					loading = false;
					toastStore.addToast(
						'Generowanie przekroczyło limit czasu (45s). Spróbuj ponownie.',
						'error'
					);
				}, 45000);

				return async ({ result, update }) => {
					clearTimeout(timeoutId);
					loadingStore.stop();
					loading = false;

					if (result.type === 'failure') {
						toastStore.addToast('Błąd podczas generowania historii', 'error');
					} else if (result.type === 'success') {
						toastStore.addToast('Historia wygenerowana pomyślnie!', 'success');
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
					placeholder="Np. Kobieta w czarnej sukni stoi na moście o północy..."
					required
					minlength="1"
					maxlength="150"
					disabled={loading}
				></textarea>
				<div class="label">Maksymalnie 150 znaków</div>
			</fieldset>

			<!-- Difficulty -->
			<fieldset class="fieldset !gap-4">
				<legend class="fieldset-legend text-base mb-2">Poziom trudności</legend>
				<select
					id="difficulty"
					name="difficulty"
					class="select w-full px-4 py-3"
					required
					disabled={loading}
				>
					<option value="1">Łatwy - proste, oczywiste tropy</option>
					<option value="2" selected>Średni - wymaga kilku pytań, zawiera fałszywe tropy</option>
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
					disabled={loading}
				>
					<option value="1">Tajemnica - atmosferyczna, bez przemocy</option>
					<option value="2" selected>Niepokojąca - sugerowana przemoc, niepokojący ton</option>
					<option value="3">Brutalna - jawna przemoc, gore, silny przekaz</option>
				</select>
				<div class="label">Określ jak mroczna ma być historia</div>
			</fieldset>

			<!-- Submit -->
			<button
				type="submit"
				class="btn btn-primary w-full !bg-primary !text-primary-content"
				disabled={loading}
			>
				{#if loading}
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
</div>