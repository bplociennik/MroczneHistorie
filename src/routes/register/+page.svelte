<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/toasts';

	let loading = $state(false);
</script>

<div class="hero min-h-[80vh]">
	<div class="hero-content flex-col w-full max-w-md">
		<div class="text-center">
			<h1 class="text-4xl font-bold">Stwórz konto</h1>
			<p class="py-4">Dołącz do MroczneHistorie już dziś!</p>
		</div>

		<div class="card bg-base-200 w-full shadow-2xl">
			<form
				method="POST"
				class="card-body space-y-4"
				use:enhance={() => {
					loading = true;
					return async ({ result, update }) => {
						loading = false;
						if (result.type === 'failure') {
							toastStore.addToast('Błąd rejestracji. Spróbuj ponownie.', 'error');
						} else if (result.type === 'success') {
							toastStore.addToast('Konto utworzone! Sprawdź email.', 'success');
						}
						await update();
					};
				}}
			>
				<!-- Email -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Email</legend>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="twoj@email.pl"
						class="input w-full px-4 py-3"
						required
						disabled={loading}
					/>
				</fieldset>

				<!-- Password -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Hasło</legend>
					<input
						id="password"
						name="password"
						type="password"
						placeholder="••••••••"
						class="input w-full px-4 py-3"
						required
						minlength="6"
						disabled={loading}
					/>
					<div class="label">Minimum 6 znaków</div>
				</fieldset>

				<!-- Confirm Password -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Potwierdź hasło</legend>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						placeholder="••••••••"
						class="input w-full px-4 py-3"
						required
						minlength="6"
						disabled={loading}
					/>
				</fieldset>

				<!-- Submit -->
				<button
					type="submit"
					class="btn btn-primary w-full !bg-primary !text-primary-content"
					disabled={loading}
				>
					{#if loading}
						<span class="loading loading-spinner loading-sm"></span>
						Tworzenie konta...
					{:else}
						Zarejestruj się
					{/if}
				</button>

				<!-- Login Link -->
				<div class="text-center mt-4">
					<p class="text-sm">
						Masz już konto?
						<a href="/login" class="link link-primary">Zaloguj się</a>
					</p>
				</div>
			</form>
		</div>
	</div>
</div>