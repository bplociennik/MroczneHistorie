<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	// Use $props() for Svelte 5 runes mode
	let { form }: { form: ActionData } = $props();

	// Loading state
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Logowanie - MroczneHistorie</title>
	<meta name="description" content="Zaloguj się do swojego konta MroczneHistorie" />
</svelte:head>

<div class="hero min-h-[80vh]">
	<div class="hero-content flex-col w-full max-w-md">
		<div class="text-center">
			<h1 class="text-4xl font-bold">Zaloguj się</h1>
			<p class="py-4">Witaj ponownie w MroczneHistorie!</p>
		</div>

		<div class="card bg-base-200 w-full shadow-2xl">
			<form
				method="POST"
				action="?/login"
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
						value={form?.email || ''}
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
						autocomplete="current-password"
						disabled={isSubmitting}
					/>
					{#if form?.errors?.password}
						<div class="label">
							<span class="label-text-alt text-error">{form.errors.password}</span>
						</div>
					{/if}
				</fieldset>

				<!-- Submit -->
				<button
					type="submit"
					class="btn btn-primary w-full !bg-primary !text-primary-content"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
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
						<a href={resolve('/register')} class="link link-primary">Zarejestruj się</a>
					</p>
				</div>
			</form>
		</div>
	</div>
</div>
