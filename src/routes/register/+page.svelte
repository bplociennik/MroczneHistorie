<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Use $props() for Svelte 5 runes mode
	let { form }: { form: ActionData } = $props();

	// Local state for form fields and submission
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	// Derived state: inline validation for password match (US 1.3)
	let passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);

	let passwordMismatchError = $derived(
		confirmPassword.length > 0 && !passwordsMatch ? 'Hasła nie pasują' : null
	);

	// Can submit? Check all fields filled and passwords match
	let canSubmit = $derived(
		email.length > 0 &&
			password.length > 0 &&
			confirmPassword.length > 0 &&
			passwordsMatch &&
			!isSubmitting
	);
</script>

<svelte:head>
	<title>Rejestracja - MroczneHistorie</title>
	<meta name="description" content="Załóż konto w MroczneHistorie" />
</svelte:head>

<div class="hero min-h-[80vh]">
	<div class="hero-content flex-col w-full max-w-md">
		<div class="text-center">
			<h1 class="text-4xl font-bold">Zarejestruj się</h1>
			<p class="py-4">Dołącz do MroczneHistorie!</p>
		</div>

		<div class="card bg-base-200 w-full shadow-2xl">
			<form
				method="POST"
				class="card-body space-y-4"
				use:enhance={() => {
					isSubmitting = true;

					return async ({ result, update }) => {
						isSubmitting = false;

						if (result.type === 'redirect') {
							await goto(resolve(result.location));
						}

						await update();
					};
				}}
			>
				<!-- General Error Alert -->
				{#if form?.error}
					<div class="alert alert-error">
						<svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<span>{form.error}</span>
					</div>
				{/if}

				<!-- Email -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Email</legend>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="twoj@email.pl"
						class="input w-full px-4 py-3"
						class:input-error={form?.errors?.email}
						required
						autocomplete="email"
						disabled={isSubmitting}
						bind:value={email}
					/>
					{#if form?.errors?.email}
						<div class="label">
							<span class="label-text-alt text-error">{form.errors.email}</span>
						</div>
					{/if}
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
						class:input-error={form?.errors?.password}
						required
						minlength="8"
						autocomplete="new-password"
						disabled={isSubmitting}
						bind:value={password}
					/>
					<div class="label">
						<span class="label-text-alt">Minimum 8 znaków</span>
					</div>
					{#if form?.errors?.password}
						<div class="label">
							<span class="label-text-alt text-error">{form.errors.password}</span>
						</div>
					{/if}
				</fieldset>

				<!-- Confirm Password with inline validation (US 1.3) -->
				<fieldset class="fieldset !gap-4">
					<legend class="fieldset-legend text-base mb-2">Powtórz hasło</legend>
					<input
						id="confirmPassword"
						name="confirmPassword"
						type="password"
						placeholder="••••••••"
						class="input w-full px-4 py-3"
						class:input-error={passwordMismatchError}
						required
						minlength="8"
						autocomplete="new-password"
						disabled={isSubmitting}
						bind:value={confirmPassword}
					/>

					<!-- Inline validation error (US 1.3: "Walidacja błędów odbywa się inline") -->
					{#if passwordMismatchError}
						<div class="label">
							<span class="label-text-alt text-error">{passwordMismatchError}</span>
						</div>
					{/if}
				</fieldset>

				<!-- Submit -->
				<button
					type="submit"
					class="btn btn-primary w-full !bg-primary !text-primary-content"
					disabled={!canSubmit}
				>
					{#if isSubmitting}
						<span class="loading loading-spinner loading-sm"></span>
						Rejestracja...
					{:else}
						Zarejestruj się
					{/if}
				</button>

				<!-- Login Link (US 1.7: "Możliwość przełączenia między logowaniem a rejestracją") -->
				<div class="text-center mt-4">
					<p class="text-sm">
						Masz już konto?
						<a href={resolve('/login')} class="link link-primary">Zaloguj się</a>
					</p>
				</div>
			</form>
		</div>
	</div>
</div>
