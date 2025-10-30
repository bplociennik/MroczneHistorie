<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastStore } from '$lib/stores/toasts';

	let loading = $state(false);
</script>

<div class="hero min-h-[80vh]">
	<div class="hero-content flex-col w-full max-w-md">
		<div class="text-center">
			<h1 class="text-4xl font-bold">Zaloguj się</h1>
			<p class="py-4">Witaj ponownie w MroczneHistorie!</p>
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
							toastStore.addToast('Błąd logowania. Sprawdź dane.', 'error');
						} else if (result.type === 'success') {
							toastStore.addToast('Zalogowano pomyślnie!', 'success');
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
						Logowanie...
					{:else}
						Zaloguj się
					{/if}
				</button>

				<!-- Register Link -->
				<div class="text-center mt-4">
					<p class="text-sm">
						Nie masz konta?
						<a href="/register" class="link link-primary">Zarejestruj się</a>
					</p>
				</div>
			</form>
		</div>
	</div>
</div>