# Plan implementacji widoku Rejestracja

## 1. Przegląd

Widok Rejestracja (`/register`) umożliwia nowym użytkownikom założenie konta w aplikacji MroczneHistorie poprzez podanie adresu email i hasła. Jest to prosty widok rejestracyjny z trzema polami, wykorzystującym Supabase Auth jako backend uwierzytelniania.

Kluczowe cechy:

- **Formularz rejestracji** - email + password + confirm password
- **Inline walidacja** - sprawdzanie zgodności haseł w czasie rzeczywistym (US 1.3)
- **Supabase Auth** - automatyczne logowanie po rejestracji
- **Progressive enhancement** - działa z i bez JavaScript
- **Redirect guard** - zalogowani użytkownicy są automatycznie przekierowywani na `/`
- **Automatyczne przekierowanie** - po sukcesie na `/` (US 1.5)
- **Error handling** - wyświetlanie błędów rejestracji
- **Link do logowania** - dla użytkowników z kontem
- **Mobile-first design** - responsywny layout z DaisyUI

Widok jest częścią Epic 1 (Uwierzytelnianie i Architektura Strony) i realizuje US 1.2, US 1.3 oraz US 1.7.

## 2. Routing widoku

**Ścieżka główna:** `/register`

**Pliki implementacji:**

- `src/routes/register/+page.svelte` - główny komponent widoku
- `src/routes/register/+page.server.ts` - server-side logic, action, redirect guard

**Ochrona dostępu:**

```typescript
// +page.server.ts - load function
export const load: PageServerLoad = async ({ locals }) => {
	// Guard: redirect zalogowanych na /
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};
```

**Form Action:**

- `?/register` (lub default) - rejestruje użytkownika przez Supabase Auth

**Nawigacja z tego widoku:**

- `/` - po udanej rejestracji (automatyczny redirect, US 1.5)
- `/login` - link dla użytkowników posiadających konto

**Nawigacja na ten widok:**

- Z landing page (`/`) - przycisk "Zarejestruj się"
- Z nawigacji (dla niezalogowanych)
- Z `/login` - link "Nie masz konta? Zarejestruj się"

## 3. Struktura komponentów

```
+page.svelte (główny kontener)
│
├── <svelte:head>
│   └── <title> Rejestracja - MroczneHistorie
│
├── <div class="container">
│   │
│   ├── <div class="page-header">
│   │   ├── <h1> Zarejestruj się
│   │   └── <p> Dołącz do MroczneHistorie!
│   │
│   └── <div class="auth-card">
│       │
│       └── <form method="POST" use:enhance>
│           │
│           ├── <div class="form-control">
│           │   ├── <label for="email"> Adres email
│           │   ├── <input
│           │   │       type="email"
│           │   │       name="email"
│           │   │       required
│           │   │       value={form?.email || ''}
│           │   │   />
│           │   └── {#if form?.errors?.email}
│           │       └── <span class="error"> {form.errors.email}
│           │
│           ├── <div class="form-control">
│           │   ├── <label for="password"> Hasło
│           │   ├── <input
│           │   │       type="password"
│           │   │       name="password"
│           │   │       required
│           │   │       minlength="8"
│           │   │   />
│           │   ├── <span class="hint"> Minimum 8 znaków
│           │   └── {#if form?.errors?.password}
│           │       └── <span class="error"> {form.errors.password}
│           │
│           ├── <div class="form-control">
│           │   ├── <label for="confirmPassword"> Powtórz hasło
│           │   ├── <input
│           │   │       type="password"
│           │   │       name="confirmPassword"
│           │   │       required
│           │   │       minlength="8"
│           │   │       class:input-error={passwordMismatchError}
│           │   │   />
│           │   └── {#if passwordMismatchError}
│           │       └── <span class="error inline"> Hasła nie pasują
│           │
│           ├── {#if form?.error}
│           │   └── <div class="alert alert-error">
│           │       └── {form.error}
│           │
│           ├── <button type="submit" class="btn btn-primary">
│           │   Zarejestruj się
│           │
│           └── <div class="text-center">
│               └── <p>
│                   Masz już konto?
│                   <a href="/login"> Zaloguj się
```

## 4. Szczegóły komponentów

### Komponent: `+page.svelte` (główny plik widoku)

**Opis komponentu:**
Główny widok rejestracji zawierający formularz z trzema polami: email, password i confirm password. Wykorzystuje SvelteKit Form Actions dla progressive enhancement. Kluczową cechą jest **inline walidacja** dla pola "Powtórz hasło" - użytkownik widzi komunikat "Hasła nie pasują" w czasie rzeczywistym, gdy tylko zacznie wpisywać różne hasło (US 1.3). Obsługuje wyświetlanie błędów walidacji oraz błędów rejestracji z Supabase Auth.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();

	// Local state for inline validation
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	// Derived state: inline validation for password match
	let passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);

	let passwordMismatchError = $derived(
		confirmPassword.length > 0 && !passwordsMatch ? 'Hasła nie pasują' : null
	);

	// Client-side validation before submit
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

<div class="min-h-screen flex items-center justify-center bg-base-300 px-4 py-8">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2">Zarejestruj się</h1>
			<p class="text-lg opacity-80">Dołącz do MroczneHistorie!</p>
		</div>

		<!-- Auth Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<form
					method="POST"
					use:enhance={() => {
						isSubmitting = true;

						return async ({ result, update }) => {
							isSubmitting = false;

							if (result.type === 'redirect') {
								await goto(result.location);
							}

							await update();
						};
					}}
				>
					<!-- Email Field -->
					<div class="form-control">
						<label for="email" class="label">
							<span class="label-text font-semibold">Adres email</span>
						</label>
						<input
							type="email"
							name="email"
							id="email"
							class="input input-bordered"
							class:input-error={form?.errors?.email}
							placeholder="twoj@email.pl"
							required
							autocomplete="email"
							bind:value={email}
							disabled={isSubmitting}
						/>
						{#if form?.errors?.email}
							<label class="label">
								<span class="label-text-alt text-error">{form.errors.email}</span>
							</label>
						{/if}
					</div>

					<!-- Password Field -->
					<div class="form-control mt-4">
						<label for="password" class="label">
							<span class="label-text font-semibold">Hasło</span>
						</label>
						<input
							type="password"
							name="password"
							id="password"
							class="input input-bordered"
							class:input-error={form?.errors?.password}
							placeholder="••••••••"
							required
							minlength="8"
							autocomplete="new-password"
							bind:value={password}
							disabled={isSubmitting}
						/>
						<label class="label">
							<span class="label-text-alt text-base-content/60">Minimum 8 znaków</span>
						</label>
						{#if form?.errors?.password}
							<label class="label">
								<span class="label-text-alt text-error">{form.errors.password}</span>
							</label>
						{/if}
					</div>

					<!-- Confirm Password Field with inline validation -->
					<div class="form-control mt-4">
						<label for="confirmPassword" class="label">
							<span class="label-text font-semibold">Powtórz hasło</span>
						</label>
						<input
							type="password"
							name="confirmPassword"
							id="confirmPassword"
							class="input input-bordered"
							class:input-error={passwordMismatchError}
							placeholder="••••••••"
							required
							minlength="8"
							autocomplete="new-password"
							bind:value={confirmPassword}
							disabled={isSubmitting}
						/>

						<!-- Inline validation error (US 1.3) -->
						{#if passwordMismatchError}
							<label class="label">
								<span class="label-text-alt text-error">{passwordMismatchError}</span>
							</label>
						{/if}
					</div>

					<!-- General Error -->
					{#if form?.error}
						<div class="alert alert-error mt-4">
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

					<!-- Submit Button -->
					<div class="form-control mt-6">
						<button type="submit" class="btn btn-primary btn-lg" disabled={!canSubmit}>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								Rejestracja...
							{:else}
								Zarejestruj się
							{/if}
						</button>
					</div>
				</form>

				<!-- Link to Login -->
				<div class="divider">LUB</div>

				<div class="text-center">
					<p class="text-sm">
						Masz już konto?
						<a href="/login" class="link link-primary font-semibold"> Zaloguj się </a>
					</p>
				</div>
			</div>
		</div>

		<!-- Back to Home -->
		<div class="text-center mt-4">
			<a href="/" class="link link-hover text-sm opacity-70"> ← Powrót do strony głównej </a>
		</div>
	</div>
</div>
```

**Obsługiwane zdarzenia:**

1. `submit` (formularz) - wywołuje default action lub `?/register`
2. `enhance` callback - loading state, redirect handling
3. `input` (confirm password) - inline validation

**Warunki walidacji:**

1. **Email:**
   - Required: pole musi być wypełnione
   - Type: email (HTML5 validation)
   - Format: valid email format

2. **Password:**
   - Required: pole musi być wypełnione
   - Min length: 8 znaków (HTML5 + backend)

3. **Confirm Password:**
   - Required: pole musi być wypełnione
   - Min length: 8 znaków
   - **Match: musi być identyczne z password (inline validation)**

**Typy wymagane przez komponent:**

```typescript
import type { PageData, ActionData } from './$types';

interface PageData {
	// Puste (tylko redirect guard w load)
}

interface ActionData {
	email?: string; // Zachowany email przy błędzie
	error?: string; // Ogólny błąd rejestracji
	errors?: {
		email?: string; // Błąd walidacji email
		password?: string; // Błąd walidacji password
	};
}
```

**Propsy:**

```typescript
interface Props {
	data: PageData;
	form?: ActionData;
}

let { data, form }: Props = $props();
```

---

### Plik: `+page.server.ts`

**Opis:**
Server-side logic zawierający load function (redirect guard dla zalogowanych) oraz Form Action która rejestruje użytkownika przez Supabase Auth. Po udanej rejestracji, Supabase automatycznie loguje użytkownika i następuje redirect na `/` (US 1.5). Obsługuje błędy rejestracji i walidację danych.

**Load function:**

```typescript
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard: zalogowani użytkownicy → redirect na /
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};
```

**Form Action:**

```typescript
export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email')?.toString();
			const password = formData.get('password')?.toString();
			const confirmPassword = formData.get('confirmPassword')?.toString();

			// 2. Server-side validation
			if (!email || !password || !confirmPassword) {
				return fail(400, {
					email,
					error: 'Wszystkie pola są wymagane'
				});
			}

			// Email format validation
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return fail(400, {
					email,
					errors: {
						email: 'Podaj prawidłowy adres email'
					}
				});
			}

			// Password length validation
			if (password.length < 8) {
				return fail(400, {
					email,
					errors: {
						password: 'Hasło musi mieć minimum 8 znaków'
					}
				});
			}

			// Password match validation
			if (password !== confirmPassword) {
				return fail(400, {
					email,
					error: 'Hasła nie pasują'
				});
			}

			// 3. Attempt registration with Supabase Auth
			const { data, error } = await locals.supabase.auth.signUp({
				email,
				password
			});

			// 4. Handle Supabase errors
			if (error) {
				console.error('[AUTH_ERROR] Registration failed', {
					code: error.status,
					message: error.message,
					email,
					timestamp: new Date().toISOString()
				});

				// Map Supabase errors to Polish messages
				let errorMessage = 'Nie udało się zarejestrować. Spróbuj ponownie później';

				if (
					error.message.includes('already registered') ||
					error.message.includes('already exists')
				) {
					errorMessage = 'Ten adres email jest już zarejestrowany';
				} else if (error.message.includes('Password should be')) {
					errorMessage = 'Hasło jest zbyt słabe. Użyj silniejszego hasła';
				} else if (error.status === 429) {
					errorMessage = 'Zbyt wiele prób rejestracji. Spróbuj ponownie za chwilę';
				}

				return fail(error.status || 400, {
					email,
					error: errorMessage
				});
			}

			// 5. Check if user was created
			if (!data.user) {
				console.error('[AUTH_ERROR] No user returned after signUp', {
					email,
					timestamp: new Date().toISOString()
				});

				return fail(500, {
					email,
					error: 'Nie udało się utworzyć konta. Spróbuj ponownie później'
				});
			}

			// 6. Success - user is automatically logged in by Supabase
			console.info('[SUCCESS] User registered and logged in', {
				userId: data.user.id,
				email: data.user.email,
				timestamp: new Date().toISOString()
			});

			// 7. Redirect to home page (US 1.5)
			throw redirect(303, '/');
		} catch (error: unknown) {
			// Handle redirect (rethrow)
			if (error instanceof Response && error.status === 303) {
				throw error;
			}

			// Handle unexpected errors
			console.error('[UNEXPECTED_ERROR] Registration process failed', {
				error: error instanceof Error ? error.message : 'Unknown error',
				stack: error instanceof Error ? error.stack : undefined,
				timestamp: new Date().toISOString()
			});

			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później'
			});
		}
	}
};
```

## 5. Typy

### Istniejące typy (z Supabase)

**Session** - Sesja użytkownika

```typescript
import type { Session, User } from '@supabase/supabase-js';

// Session - automatycznie z Supabase
interface Session {
	user: User;
	access_token: string;
	refresh_token: string;
	expires_at?: number;
	expires_in: number;
}
```

**AuthError** - Błędy z Supabase Auth

```typescript
interface AuthError {
	message: string;
	status?: number;
	// ... inne pola z Supabase
}
```

### Nowe typy (specyficzne dla widoku)

**PageData** - Dane z load function

```typescript
// src/routes/register/+page.server.ts
// Automatycznie generowane przez SvelteKit

interface PageData {
	// Puste - load function tylko sprawdza redirect
}
```

**ActionData** - Odpowiedź z form action

```typescript
// src/routes/register/+page.server.ts
// Automatycznie generowane przez SvelteKit

interface ActionData {
	/** Email użytkownika (zachowany przy błędzie) */
	email?: string;

	/** Ogólny komunikat błędu rejestracji */
	error?: string;

	/** Błędy walidacji dla poszczególnych pól */
	errors?: {
		email?: string;
		password?: string;
	};
}
```

**RegisterFormData** - Dane formularza (lokalny typ)

```typescript
// Lokalny typ w +page.server.ts
interface RegisterFormData {
	email: string;
	password: string;
	confirmPassword: string;
}
```

**SignUpWithPasswordCredentials** - Parametry Supabase Auth

```typescript
// Z @supabase/supabase-js
interface SignUpWithPasswordCredentials {
	email: string;
	password: string;
}
```

## 6. Zarządzanie stanem

### Stan lokalny (Svelte 5 runes)

**1. Pola formularza**

```typescript
// src/routes/register/+page.svelte
let email = $state('');
let password = $state('');
let confirmPassword = $state('');
```

**2. isSubmitting - Stan submitu formularza**

```typescript
let isSubmitting = $state(false);

// Użycie w enhance callback
use:enhance(() => {
  isSubmitting = true;

  return async ({ result, update }) => {
    isSubmitting = false;
    // ...
  };
}}
```

**Cel:**

- Wyświetlenie loading state na przycisku
- Disabled button podczas submitu
- Disabled inputs podczas submitu
- Zapobieganie wielokrotnym submitom

### Derived State (Svelte $derived)

**1. passwordsMatch - Czy hasła się zgadzają**

```typescript
let passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);
```

**2. passwordMismatchError - Inline error message**

```typescript
let passwordMismatchError = $derived(
	confirmPassword.length > 0 && !passwordsMatch ? 'Hasła nie pasują' : null
);
```

**Realizuje US 1.3**: "Walidacja błędów (np. 'Hasła nie pasują') odbywa się inline"

**3. canSubmit - Czy można submitować formularz**

```typescript
let canSubmit = $derived(
	email.length > 0 &&
		password.length > 0 &&
		confirmPassword.length > 0 &&
		passwordsMatch &&
		!isSubmitting
);
```

### Stan z SvelteKit

**1. PageData (reaktywny)**

```typescript
let { data }: Props = $props();

// Automatycznie reactive, updatuje się po:
// - Nawigacji
// - invalidateAll()
```

**2. ActionData (reaktywny)**

```typescript
let { form }: Props = $props();

// Automatycznie reactive, updatuje się po:
// - Zakończeniu form action
// - Zawiera wynik ostatniej akcji (sukces/failure)
```

### Stan globalny

Widok **nie wymaga** globalnego stanu. Supabase Auth zarządza sesją automatycznie:

- Session przechowywany w cookies
- Auto-refresh przez Supabase SDK
- Dostępny przez `locals.user` w server-side

### SvelteKit enhance

```typescript
import { enhance } from '$app/forms';

<form use:enhance={handleSubmit}>
  // ...
</form>

function handleSubmit() {
  // Before submit
  isSubmitting = true;

  return async ({ result, update }) => {
    // After response
    isSubmitting = false;

    // Handle redirect
    if (result.type === 'redirect') {
      await goto(result.location);
    }

    // Apply default behavior
    await update();
  };
}
```

### Przepływ stanu

**Scenariusz: Udana rejestracja**

```
1. User wypełnia formularz (email, password, confirmPassword)
2. User wpisuje confirmPassword → passwordsMatch recalculated
3. Submit → enhance callback → isSubmitting = true
4. POST (default action)
5. Server: locals.supabase.auth.signUp()
6. Success → throw redirect(303, '/')
7. enhance callback → goto('/')
8. Nawigacja na stronę główną
9. Session automatycznie dostępna w locals.user
```

**Scenariusz: Hasła nie pasują (inline)**

```
1. User wpisuje password: "Test1234"
2. User wpisuje confirmPassword: "Test123" (literówka)
3. passwordsMatch → false
4. passwordMismatchError → "Hasła nie pasują"
5. UI wyświetla czerwony komunikat pod polem
6. canSubmit → false (przycisk disabled)
7. User poprawia confirmPassword na "Test1234"
8. passwordsMatch → true
9. passwordMismatchError → null
10. canSubmit → true (przycisk active)
```

**Scenariusz: Email już zarejestrowany**

```
1. User wypełnia formularz
2. Submit → isSubmitting = true
3. POST
4. Server: signUp() → error "already registered"
5. return fail(400, { email, error: '...' })
6. enhance callback → isSubmitting = false
7. update() → form zawiera { email, error }
8. UI wyświetla alert z błędem
9. Email zachowany w polu
```

## 7. Integracja API

### Supabase Auth - Registration

**Metoda:** `supabase.auth.signUp()`

**Kiedy:** Po submit formularza rejestracji (default action)

**Typ żądania:**

```typescript
// Credentials
interface SignUpWithPasswordCredentials {
  email: string;
  password: string;
}

// Przykład
{
  email: "newuser@example.com",
  password: "SecurePass123!"
}
```

**Typ odpowiedzi:**

```typescript
// Success
interface AuthResponse {
	data: {
		user: User;
		session: Session;
	};
	error: null;
}

// Error
interface AuthResponse {
	data: {
		user: null;
		session: null;
	};
	error: AuthError;
}

// Session
interface Session {
	access_token: string; // JWT token
	refresh_token: string; // For auto-refresh
	expires_in: number; // Usually 3600 (1 hour)
	expires_at?: number; // Unix timestamp
	user: User;
}

// User
interface User {
	id: string; // UUID
	email: string;
	email_confirmed_at?: string;
	created_at: string;
	// ... other fields
}
```

**Implementacja w +page.server.ts:**

```typescript
export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			// 1. Parse and validate
			const formData = await request.formData();
			const email = formData.get('email')?.toString();
			const password = formData.get('password')?.toString();
			const confirmPassword = formData.get('confirmPassword')?.toString();

			// Validation...

			// 2. Call Supabase Auth
			const { data, error } = await locals.supabase.auth.signUp({
				email,
				password
			});

			// 3. Handle errors
			if (error) {
				console.error('Registration error:', error);

				// Map errors to Polish messages
				const errorMessages: Record<string, string> = {
					'already registered': 'Ten adres email jest już zarejestrowany',
					'Password should be': 'Hasło jest zbyt słabe. Użyj silniejszego hasła',
					'429': 'Zbyt wiele prób. Spróbuj za chwilę'
				};

				return fail(error.status || 400, {
					email,
					error: errorMessages[error.message] || 'Nie udało się zarejestrować'
				});
			}

			// 4. Check user created
			if (!data.user) {
				return fail(500, {
					email,
					error: 'Nie udało się utworzyć konta'
				});
			}

			// 5. Success - Supabase automatically logs in user
			// Redirect to home (US 1.5)
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Response && error.status === 303) {
				throw error;
			}

			console.error('Registration action error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd'
			});
		}
	}
};
```

**Registration Flow:**

```
1. User submits form with email + password + confirmPassword
   ↓
2. Server validates input (all fields, email format, password length, password match)
   ↓
3. Server calls supabase.auth.signUp()
   ↓
4. Supabase creates user account
   ↓
5. Supabase automatically logs in user (session cookie set)
   ↓
6. Server redirects to / (home page) - US 1.5
   ↓
7. User sees Story List (authenticated state)
```

**Session Management:**

- Supabase automatycznie ustawia cookie z session po rejestracji
- Hook `hooks.server.ts` parsuje cookie i udostępnia `locals.user`
- Auto-refresh przez Supabase SDK
- Session lifetime: 1 godzina (default), auto-refresh przed wygaśnięciem

## 8. Interakcje użytkownika

### Interakcja 1: Wypełnienie formularza z inline walidacją

**Akcja użytkownika:** Wpisanie email, hasła i powtórzenia hasła

**Ścieżka przepływu:**

1. Użytkownik wpisuje email
2. HTML5 validation: type="email", required
3. Użytkownik wpisuje hasło: "Test1234"
4. HTML5 validation: minlength="8", required
5. Użytkownik wpisuje confirm password: "Test123" (literówka)
6. **Inline validation (US 1.3)**: `passwordMismatchError` → "Hasła nie pasują"
7. Czerwony komunikat wyświetlony pod polem
8. Pole ma czerwoną ramkę (`input-error`)
9. Przycisk disabled (`canSubmit = false`)
10. Użytkownik poprawia: "Test1234"
11. **Inline validation**: `passwordMismatchError` → null
12. Komunikat znika, ramka wraca do normalnej
13. Przycisk aktywny (`canSubmit = true`)

**Walidacja:**

- Email: required, type="email"
- Password: required, minlength="8"
- Confirm Password: required, minlength="8", match password (inline)

**Oczekiwany rezultat:**

- Formularz ready do submit
- Natychmiastowa informacja zwrotna o zgodności haseł
- Intuicyjny UX - użytkownik wie od razu czy hasła się zgadzają

---

### Interakcja 2: Submit formularza - sukces

**Akcja użytkownika:** Kliknięcie "Zarejestruj się" z prawidłowymi danymi

**Ścieżka przepływu:**

1. Użytkownik klika "Zarejestruj się"
2. HTML5 validation sprawdza wszystkie pola
3. Jeśli OK → submit
4. enhance callback → `isSubmitting = true`
5. Przycisk disabled, tekst "Rejestracja...", spinner
6. Pola disabled
7. POST (default action) → server
8. Server: walidacja server-side
9. Server: `supabase.auth.signUp()`
10. **Sukces**: Supabase tworzy użytkownika i automatycznie loguje
11. Cookie z session automatycznie ustawione
12. Server: `throw redirect(303, '/')`
13. enhance callback → `goto('/')`
14. **Nawigacja na `/` (US 1.5)**: Lista historii (empty state dla nowego użytkownika)
15. Navbar pokazuje "Generuj" i "Wyloguj" (zalogowany stan)

**Oczekiwany rezultat:**

- Loading state podczas rejestracji
- Automatyczne logowanie
- Redirect na `/` po sukcesie (zgodnie z US 1.5)
- Użytkownik widzi zalogowany stan aplikacji

---

### Interakcja 3: Submit formularza - hasła nie pasują (server-side)

**Akcja użytkownika:** Submit z różnymi hasłami (JS wyłączony lub manipulacja)

**Ścieżka przepływu:**

1. Użytkownik submituje formularz
2. Server-side validation: `password !== confirmPassword`
3. Server: `return fail(400, { email, error: 'Hasła nie pasują' })`
4. enhance callback → `isSubmitting = false`, `update()`
5. Alert error pojawia się nad formularzem
6. Email zachowany w polu
7. Hasła puste (bezpieczeństwo)

**Oczekiwany rezultat:**

- Komunikat błędu wyświetlony
- Email nie tracony
- Możliwość poprawy i retry

---

### Interakcja 4: Submit formularza - email już zarejestrowany

**Akcja użytkownika:** Próba rejestracji z istniejącym emailem

**Ścieżka przepływu:**

1. Użytkownik wpisuje email który już istnieje w bazie
2. Wpisuje hasła poprawnie
3. Submit → loading state
4. Server: `supabase.auth.signUp()`
5. **Błąd**: Supabase zwraca error "already registered"
6. Server: `return fail(400, { email, error: 'Ten adres email jest już zarejestrowany' })`
7. enhance callback → alert z błędem
8. Email zachowany
9. Link "Zaloguj się" widoczny poniżej

**Oczekiwany rezultat:**

- Wyraźny komunikat że email zajęty
- Możliwość przejścia do logowania (link widoczny)
- Możliwość użycia innego emaila

---

### Interakcja 5: Submit formularza - zbyt słabe hasło

**Akcja użytkownika:** Próba rejestracji ze słabym hasłem

**Ścieżka przepływu:**

1. Użytkownik wpisuje email: "test@example.com"
2. Wpisuje hasło: "12345678" (tylko cyfry, słabe)
3. Wpisuje confirm password: "12345678" (zgadza się)
4. Client-side: `canSubmit = true` (hasła się zgadzają, 8+ znaków)
5. Submit → loading state
6. Server validation: OK
7. Server: `supabase.auth.signUp()`
8. **Błąd**: Supabase odrzuca słabe hasło
9. Server: `return fail(400, { email, error: 'Hasło jest zbyt słabe. Użyj silniejszego hasła' })`
10. Alert z sugestią silniejszego hasła

**Oczekiwany rezultat:**

- Komunikat o słabym haśle
- Sugestia użycia silniejszego hasła
- Email zachowany
- Możliwość retry

---

### Interakcja 6: Kliknięcie "Zaloguj się"

**Akcja użytkownika:** Kliknięcie linku "Zaloguj się" dla użytkowników z kontem

**Ścieżka przepływu:**

1. Użytkownik zauważa tekst: "Masz już konto? Zaloguj się"
2. Klika link
3. **Navigation**: SvelteKit → `/login`
4. Wyświetlenie widoku logowania

**Oczekiwany rezultat:**

- Płynne przejście na stronę logowania
- Brak przeładowania strony (SPA navigation)
- Realizacja US 1.7

---

### Interakcja 7: Próba dostępu zalogowanego użytkownika

**Akcja użytkownika:** Zalogowany użytkownik próbuje wejść na `/register`

**Ścieżka przepływu:**

1. Zalogowany użytkownik wpisuje `/register` w URL lub klika link
2. SvelteKit wywołuje load function
3. `if (locals.user)` → true
4. `throw redirect(303, '/')`
5. Użytkownik zostaje przekierowany na `/`

**Oczekiwany rezultat:**

- Natychmiastowe przekierowanie
- Formularz rejestracji się nie renderuje
- Zalogowani nie mogą się "re-zarejestrować"

## 9. Warunki i walidacja

### Warunek 1: Redirect guard - zalogowani użytkownicy

**Warunek:**

```typescript
if (locals.user !== null) {
	// Redirect na /
}
```

**Komponent:** `+page.server.ts` load function

**Implementacja:**

```typescript
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};
```

**Wpływ na UI:**

- Zalogowani użytkownicy nie widzą formularza rejestracji
- Automatyczne przekierowanie na stronę główną

---

### Warunek 2: Inline walidacja - hasła się zgadzają (US 1.3)

**Warunek:**

```typescript
if (confirmPassword.length > 0 && password !== confirmPassword) {
	// Wyświetl "Hasła nie pasują"
}
```

**Komponent:** Confirm Password field w `+page.svelte`

**Implementacja:**

```typescript
// Svelte $derived
let passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);

let passwordMismatchError = $derived(
	confirmPassword.length > 0 && !passwordsMatch ? 'Hasła nie pasują' : null
);
```

```svelte
<input type="password" bind:value={confirmPassword} class:input-error={passwordMismatchError} />

{#if passwordMismatchError}
	<label class="label">
		<span class="label-text-alt text-error">{passwordMismatchError}</span>
	</label>
{/if}
```

**Wpływ na UI:**

- Komunikat "Hasła nie pasują" pojawia się natychmiast gdy użytkownik zaczyna wpisywać różne hasło
- Czerwona ramka wokół pola
- Przycisk submit disabled
- **Realizuje US 1.3**: "Walidacja błędów (np. 'Hasła nie pasują') odbywa się inline"

---

### Warunek 3: Submit button disabled

**Warunek:**

```typescript
if (
	email.length === 0 ||
	password.length === 0 ||
	confirmPassword.length === 0 ||
	!passwordsMatch ||
	isSubmitting
) {
	// Disable button
}
```

**Komponent:** Button submit w formularzu

**Implementacja:**

```typescript
let canSubmit = $derived(
	email.length > 0 &&
		password.length > 0 &&
		confirmPassword.length > 0 &&
		passwordsMatch &&
		!isSubmitting
);
```

```svelte
<button type="submit" disabled={!canSubmit}>
	{#if isSubmitting}
		<span class="loading loading-spinner"></span>
		Rejestracja...
	{:else}
		Zarejestruj się
	{/if}
</button>
```

**Wpływ na UI:**

- Button disabled jeśli:
  - Jakiekolwiek pole puste
  - Hasła nie pasują
  - Trwa submit
- Tekst zmienia się na "Rejestracja..." podczas submitu
- Spinner wyświetlany
- Zapobiega wielokrotnym submitom

---

### Warunek 4: Walidacja email (HTML5 + backend)

**Warunki:**

1. **Required:** Pole musi być wypełnione
2. **Type email:** Musi być prawidłowy format email (zawierać @)

**Komponent:** Input email w formularzu

**Implementacja HTML5:**

```svelte
<input type="email" name="email" required class:input-error={form?.errors?.email} />

{#if form?.errors?.email}
	<span class="text-error">{form.errors.email}</span>
{/if}
```

**Implementacja Backend:**

```typescript
// +page.server.ts
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!email || !emailRegex.test(email)) {
	return fail(400, {
		email,
		errors: { email: 'Podaj prawidłowy adres email' }
	});
}
```

**Wpływ na UI:**

- HTML5 blokuje submit jeśli puste lub nieprawidłowy format
- Backend validation jako fallback (bez JS)
- Czerwona ramka i komunikat przy błędzie

---

### Warunek 5: Walidacja password length

**Warunki:**

1. **Required:** Pole musi być wypełnione
2. **Min length:** Minimum 8 znaków

**Komponent:** Input password w formularzu

**Implementacja HTML5:**

```svelte
<input type="password" name="password" required minlength="8" />

<label class="label">
	<span class="label-text-alt">Minimum 8 znaków</span>
</label>
```

**Implementacja Backend:**

```typescript
if (!password || password.length < 8) {
	return fail(400, {
		email,
		errors: { password: 'Hasło musi mieć minimum 8 znaków' }
	});
}
```

**Wpływ na UI:**

- HTML5 blokuje submit jeśli za krótkie
- Hint text pod polem: "Minimum 8 znaków"
- Backend sprawdza min length
- Komunikat błędu przy za krótkim haśle

---

### Warunek 6: Server-side password match validation

**Warunek:**

```typescript
if (password !== confirmPassword) {
	// Return error
}
```

**Komponent:** `+page.server.ts` action

**Implementacja:**

```typescript
if (password !== confirmPassword) {
	return fail(400, {
		email,
		error: 'Hasła nie pasują'
	});
}
```

**Wpływ na UI:**

- Fallback dla inline validation (gdy JS wyłączony)
- Alert z komunikatem błędu
- Email zachowany

---

### Warunek 7: Wyświetlanie błędów rejestracji

**Warunek:**

```typescript
if (form?.error) {
	// Wyświetl alert z błędem
}
```

**Komponent:** Alert w formularzu

**Implementacja:**

```svelte
{#if form?.error}
	<div class="alert alert-error">
		<svg>...</svg>
		<span>{form.error}</span>
	</div>
{/if}
```

**Wpływ na UI:**

- Alert wyświetlony gdy błąd rejestracji
- Czerwony kolor, ikona X
- Komunikat po polsku
- Email zachowany w polu

---

### Warunek 8: Zachowanie email przy błędzie

**Warunek:**

```typescript
if (form?.email) {
	// Wypełnij pole email
}
```

**Komponent:** Input email

**Implementacja:**

```svelte
<input type="email" name="email" bind:value={email} />

<!-- On mount: -->
{#if form?.email}
	{(email = form.email)}
{/if}

<!-- Or simpler: -->
<input type="email" name="email" value={form?.email || ''} />
```

**Wpływ na UI:**

- Email nie jest tracony przy błędzie
- Użytkownik nie musi wpisywać ponownie
- Tylko hasła trzeba wpisać ponownie (bezpieczeństwo)

## 10. Obsługa błędów

### Scenariusz 1: Email już zarejestrowany (400/409)

**Przyczyna:**

- Email już istnieje w bazie danych
- Użytkownik próbuje założyć drugie konto

**Obsługa:**

```typescript
// +page.server.ts
const { data, error } = await locals.supabase.auth.signUp({
	email,
	password
});

if (
	error &&
	(error.message.includes('already registered') || error.message.includes('already exists'))
) {
	return fail(400, {
		email,
		error: 'Ten adres email jest już zarejestrowany. Jeśli to Twoje konto, zaloguj się'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z komunikatem "Ten adres email jest już zarejestrowany"
- Email zachowany w polu
- Link "Zaloguj się" widoczny poniżej alertu
- Możliwość użycia innego emaila lub przejścia do logowania

---

### Scenariusz 2: Zbyt słabe hasło (400)

**Przyczyna:**

- Hasło nie spełnia wymagań Supabase (zbyt proste, bez znaków specjalnych, etc.)
- Mimo że ma 8+ znaków, jest słabe

**Obsługa:**

```typescript
if (error && error.message.includes('Password should be')) {
	return fail(400, {
		email,
		error: 'Hasło jest zbyt słabe. Użyj silniejszego hasła (wielkie litery, cyfry, znaki specjalne)'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z wyraźną instrukcją: "Hasło jest zbyt słabe..."
- Sugestia użycia wielkich liter, cyfr, znaków specjalnych
- Email zachowany
- Możliwość retry z silniejszym hasłem

---

### Scenariusz 3: Rate limit (429)

**Przyczyna:**

- Zbyt wiele prób rejestracji w krótkim czasie
- Supabase zabezpieczenie przed spamem/abusem

**Obsługa:**

```typescript
if (error && error.status === 429) {
	return fail(429, {
		email,
		error: 'Zbyt wiele prób rejestracji. Spróbuj ponownie za kilka minut'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z informacją o rate limit
- Sugestia odczekania kilku minut
- Email zachowany
- Ochrona przed spamem

---

### Scenariusz 4: Hasła nie pasują - inline (client-side)

**Przyczyna:**

- Użytkownik wpisał różne hasła w pole "Hasło" i "Powtórz hasło"
- Literówka lub pomyłka

**Obsługa:**

```typescript
// +page.svelte - inline validation (US 1.3)
let passwordMismatchError = $derived(
	confirmPassword.length > 0 && password !== confirmPassword ? 'Hasła nie pasują' : null
);
```

**Rezultat dla użytkownika:**

- **Natychmiastowy feedback**: Czerwony komunikat "Hasła nie pasują" pod polem
- Czerwona ramka wokół pola "Powtórz hasło"
- Przycisk submit disabled
- Komunikat znika gdy użytkownik poprawi hasło
- **Realizuje US 1.3**: "Walidacja błędów (np. 'Hasła nie pasują') odbywa się inline"

---

### Scenariusz 5: Hasła nie pasują - server-side (400)

**Przyczyna:**

- JavaScript wyłączony
- Manipulacja formularza
- Fallback dla inline validation

**Obsługa:**

```typescript
// +page.server.ts - server validation
if (password !== confirmPassword) {
	return fail(400, {
		email,
		error: 'Hasła nie pasują. Upewnij się, że oba pola zawierają identyczne hasło'
	});
}
```

**Rezultat dla użytkownika:**

- Alert error nad formularzem
- Email zachowany
- Hasła wyczyszczone
- Możliwość poprawy

---

### Scenariusz 6: Nieprawidłowy format email (400)

**Przyczyna:**

- Email pusty
- Email bez @
- Nieprawidłowy format (np. "test@")

**Obsługa:**

```typescript
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (!email || !emailRegex.test(email)) {
	return fail(400, {
		email,
		errors: {
			email: 'Podaj prawidłowy adres email (np. twoj@email.pl)'
		}
	});
}
```

**Rezultat dla użytkownika:**

- Komunikat błędu pod polem email
- Czerwona ramka wokół pola
- Wyraźna instrukcja z przykładem
- HTML5 validation jako pierwsza linia obrony

---

### Scenariusz 7: Puste pola (400)

**Przyczyna:**

- Użytkownik submituje formularz bez wypełnienia wszystkich pól
- JavaScript wyłączony (brak client-side validation)

**Obsługa:**

```typescript
if (!email || !password || !confirmPassword) {
	return fail(400, {
		email,
		error: 'Wszystkie pola są wymagane. Wypełnij email, hasło i powtórzenie hasła'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z wyraźną instrukcją
- HTML5 `required` attribute jako pierwsza linia obrony
- Server-side validation jako fallback

---

### Scenariusz 8: Błąd sieci / timeout (Network Error)

**Przyczyna:**

- Brak połączenia z internetem
- Problem z Supabase API
- Timeout

**Obsługa:**

```typescript
try {
	const { data, error } = await locals.supabase.auth.signUp({
		email,
		password
	});
} catch (error) {
	console.error('Network error:', error);
	return fail(500, {
		email,
		error: 'Błąd połączenia. Sprawdź internet i spróbuj ponownie'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z komunikatem o błędzie połączenia
- Sugestia sprawdzenia internetu
- Email zachowany
- Możliwość retry

---

### Scenariusz 9: Błąd wewnętrzny serwera (500)

**Przyczyna:**

- Nieoczekiwany błąd serwera
- Błąd w kodzie
- Problem z Supabase
- Brak `data.user` mimo braku `error`

**Obsługa:**

```typescript
// No user returned
if (!data.user) {
  console.error('[AUTH_ERROR] No user returned after signUp', {
    email,
    timestamp: new Date().toISOString()
  });

  return fail(500, {
    email,
    error: 'Nie udało się utworzyć konta. Spróbuj ponownie później'
  });
}

// Unexpected error
catch (error) {
  if (error instanceof Response && error.status === 303) {
    throw error; // Re-throw redirect
  }

  console.error('Registration action error:', error);
  return fail(500, {
    email,
    error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później'
  });
}
```

**Rezultat dla użytkownika:**

- Ogólny komunikat błędu
- Sugestia retry za chwilę
- Email zachowany
- Log w konsoli serwera dla debugowania

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

**Zadania:**

1. Utworzenie katalogu route
2. Utworzenie plików widoku
3. Przygotowanie podstawowej struktury

**Struktura katalogów:**

```
src/
├── routes/
│   └── register/
│       ├── +page.svelte          (główny widok)
│       └── +page.server.ts       (server logic, action, guard)
```

**Polecenia:**

```bash
# Utwórz katalog
mkdir -p src/routes/register

# Utwórz pliki
touch src/routes/register/+page.svelte
touch src/routes/register/+page.server.ts
```

---

### Krok 2: Implementacja +page.server.ts

**2.1. Load function z redirect guard:**

```typescript
// src/routes/register/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Guard: zalogowani użytkownicy → /
	if (locals.user) {
		throw redirect(303, '/');
	}

	return {};
};
```

**2.2. Form Action - default (rejestracja):**

```typescript
export const actions: Actions = {
	default: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email')?.toString();
			const password = formData.get('password')?.toString();
			const confirmPassword = formData.get('confirmPassword')?.toString();

			// 2. Server-side validation
			if (!email || !password || !confirmPassword) {
				return fail(400, {
					email,
					error: 'Wszystkie pola są wymagane'
				});
			}

			// Email format
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
			if (!emailRegex.test(email)) {
				return fail(400, {
					email,
					errors: { email: 'Podaj prawidłowy adres email' }
				});
			}

			// Password length
			if (password.length < 8) {
				return fail(400, {
					email,
					errors: { password: 'Hasło musi mieć minimum 8 znaków' }
				});
			}

			// Password match
			if (password !== confirmPassword) {
				return fail(400, {
					email,
					error: 'Hasła nie pasują'
				});
			}

			// 3. Call Supabase Auth
			const { data, error } = await locals.supabase.auth.signUp({
				email,
				password
			});

			// 4. Handle errors
			if (error) {
				console.error('[AUTH_ERROR] Registration failed', {
					code: error.status,
					message: error.message,
					email,
					timestamp: new Date().toISOString()
				});

				// Map Supabase errors to Polish
				let errorMessage = 'Nie udało się zarejestrować. Spróbuj ponownie później';

				if (
					error.message.includes('already registered') ||
					error.message.includes('already exists')
				) {
					errorMessage = 'Ten adres email jest już zarejestrowany';
				} else if (error.message.includes('Password should be')) {
					errorMessage = 'Hasło jest zbyt słabe. Użyj silniejszego hasła';
				} else if (error.status === 429) {
					errorMessage = 'Zbyt wiele prób rejestracji. Spróbuj za chwilę';
				}

				return fail(error.status || 400, {
					email,
					error: errorMessage
				});
			}

			// 5. Check user created
			if (!data.user) {
				console.error('[AUTH_ERROR] No user returned', { email });
				return fail(500, {
					email,
					error: 'Nie udało się utworzyć konta. Spróbuj ponownie później'
				});
			}

			// 6. Success - automatically logged in, redirect to home (US 1.5)
			console.info('[SUCCESS] User registered', {
				userId: data.user.id,
				email: data.user.email
			});

			throw redirect(303, '/');
		} catch (error: unknown) {
			// Re-throw redirect
			if (error instanceof Response && error.status === 303) {
				throw error;
			}

			console.error('[UNEXPECTED_ERROR] Registration failed', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później'
			});
		}
	}
};
```

---

### Krok 3: Implementacja +page.svelte - script section

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	interface Props {
		data: PageData;
		form?: ActionData;
	}

	let { data, form }: Props = $props();

	// Local state
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	// Derived state: inline validation (US 1.3)
	let passwordsMatch = $derived(confirmPassword.length === 0 || password === confirmPassword);

	let passwordMismatchError = $derived(
		confirmPassword.length > 0 && !passwordsMatch ? 'Hasła nie pasują' : null
	);

	// Can submit?
	let canSubmit = $derived(
		email.length > 0 &&
			password.length > 0 &&
			confirmPassword.length > 0 &&
			passwordsMatch &&
			!isSubmitting
	);
</script>
```

---

### Krok 4: Implementacja +page.svelte - template (header + card wrapper)

```svelte
<svelte:head>
	<title>Rejestracja - MroczneHistorie</title>
	<meta name="description" content="Załóż konto w MroczneHistorie" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-300 px-4 py-8">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-bold mb-2">Zarejestruj się</h1>
			<p class="text-lg opacity-80">Dołącz do MroczneHistorie!</p>
		</div>

		<!-- Auth Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<!-- Form w następnym kroku -->
			</div>
		</div>

		<!-- Back to Home -->
		<div class="text-center mt-4">
			<a href="/" class="link link-hover text-sm opacity-70"> ← Powrót do strony głównej </a>
		</div>
	</div>
</div>
```

---

### Krok 5: Implementacja formularza z inline walidacją

```svelte
<!-- Kontynuacja w card-body -->

<form
	method="POST"
	use:enhance={() => {
		isSubmitting = true;

		return async ({ result, update }) => {
			isSubmitting = false;

			if (result.type === 'redirect') {
				await goto(result.location);
			}

			await update();
		};
	}}
>
	<!-- Email Field -->
	<div class="form-control">
		<label for="email" class="label">
			<span class="label-text font-semibold">Adres email</span>
			<span class="label-text-alt text-error">*wymagane</span>
		</label>
		<input
			type="email"
			name="email"
			id="email"
			class="input input-bordered"
			class:input-error={form?.errors?.email}
			placeholder="twoj@email.pl"
			required
			autocomplete="email"
			bind:value={email}
			disabled={isSubmitting}
		/>
		{#if form?.errors?.email}
			<label class="label">
				<span class="label-text-alt text-error">
					{form.errors.email}
				</span>
			</label>
		{/if}
	</div>

	<!-- Password Field -->
	<div class="form-control mt-4">
		<label for="password" class="label">
			<span class="label-text font-semibold">Hasło</span>
			<span class="label-text-alt text-error">*wymagane</span>
		</label>
		<input
			type="password"
			name="password"
			id="password"
			class="input input-bordered"
			class:input-error={form?.errors?.password}
			placeholder="••••••••"
			required
			minlength="8"
			autocomplete="new-password"
			bind:value={password}
			disabled={isSubmitting}
		/>
		<label class="label">
			<span class="label-text-alt text-base-content/60"> Minimum 8 znaków </span>
		</label>
		{#if form?.errors?.password}
			<label class="label">
				<span class="label-text-alt text-error">
					{form.errors.password}
				</span>
			</label>
		{/if}
	</div>

	<!-- Confirm Password Field with INLINE VALIDATION (US 1.3) -->
	<div class="form-control mt-4">
		<label for="confirmPassword" class="label">
			<span class="label-text font-semibold">Powtórz hasło</span>
			<span class="label-text-alt text-error">*wymagane</span>
		</label>
		<input
			type="password"
			name="confirmPassword"
			id="confirmPassword"
			class="input input-bordered"
			class:input-error={passwordMismatchError}
			placeholder="••••••••"
			required
			minlength="8"
			autocomplete="new-password"
			bind:value={confirmPassword}
			disabled={isSubmitting}
		/>

		<!-- INLINE VALIDATION ERROR (US 1.3: "Walidacja błędów odbywa się inline") -->
		{#if passwordMismatchError}
			<label class="label">
				<span class="label-text-alt text-error">
					{passwordMismatchError}
				</span>
			</label>
		{/if}
	</div>

	<!-- General Error Alert -->
	{#if form?.error}
		<div class="alert alert-error mt-4">
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

	<!-- Submit Button -->
	<div class="form-control mt-6">
		<button type="submit" class="btn btn-primary btn-lg w-full" disabled={!canSubmit}>
			{#if isSubmitting}
				<span class="loading loading-spinner loading-sm"></span>
				Rejestracja...
			{:else}
				Zarejestruj się
			{/if}
		</button>
	</div>
</form>

<!-- Divider -->
<div class="divider">LUB</div>

<!-- Link to Login (US 1.7) -->
<div class="text-center">
	<p class="text-sm">
		Masz już konto?
		<a href="/login" class="link link-primary font-semibold"> Zaloguj się </a>
	</p>
</div>
```

---

### Krok 6: Testowanie inline walidacji (US 1.3)

**6.1. Test inline walidacji - hasła nie pasują:**

```bash
# Otwórz http://localhost:5173/register
# 1. Wpisz email: test@example.com
# 2. Wpisz password: Test1234
# 3. Wpisz confirmPassword: Test123 (bez "4")

# Sprawdź:
- [ ] Komunikat "Hasła nie pasują" pojawia się natychmiast
- [ ] Komunikat jest pod polem "Powtórz hasło"
- [ ] Pole ma czerwoną ramkę (input-error)
- [ ] Przycisk "Zarejestruj się" jest disabled (szary)

# 4. Popraw confirmPassword na: Test1234

# Sprawdź:
- [ ] Komunikat "Hasła nie pasują" znika natychmiast
- [ ] Czerwona ramka znika
- [ ] Przycisk "Zarejestruj się" staje się aktywny (niebieski)
```

**US 1.3 REALIZACJA**: ✅ "Walidacja błędów (np. 'Hasła nie pasują') odbywa się inline"

---

### Krok 7: Testowanie funkcjonalności - redirect guard

**7.1. Test redirect guard (zalogowany):**

```bash
# Zaloguj się na istniejące konto
# Spróbuj wejść na http://localhost:5173/register

# Sprawdź:
- [ ] Natychmiastowe przekierowanie na /
- [ ] Formularz rejestracji się nie renderuje
- [ ] Brak flashów contentu
```

---

### Krok 8: Testowanie rejestracji - sukces

**8.1. Test udanej rejestracji:**

```bash
# Wyloguj się
# Otwórz /register
# Wpisz nowy email: newuser@example.com
# Wpisz password: SecurePass123!
# Wpisz confirmPassword: SecurePass123! (identyczne)
# Kliknij "Zarejestruj się"

# Sprawdź:
- [ ] Przycisk disabled
- [ ] Tekst "Rejestracja..."
- [ ] Spinner wyświetlany
- [ ] Po 1-2s redirect na / (US 1.5: "Być automatycznie przekierowanym na `/`")
- [ ] Zalogowany (navbar pokazuje "Generuj" i "Wyloguj")
- [ ] Empty state lub lista historii (dla nowego użytkownika empty state)
```

**US 1.5 REALIZACJA**: ✅ "Być automatycznie przekierowanym na `/` (listę historii)"

---

### Krok 9: Testowanie błędów rejestracji

**9.1. Test - email już zarejestrowany:**

```bash
# Użyj emaila który już istnieje
# Submit

# Sprawdź:
- [ ] Alert "Ten adres email jest już zarejestrowany"
- [ ] Email zachowany w polu
- [ ] Hasła puste
- [ ] Link "Zaloguj się" widoczny poniżej
```

**9.2. Test - zbyt słabe hasło:**

```bash
# Użyj słabego hasła: "12345678"
# Submit

# Sprawdź:
- [ ] Alert "Hasło jest zbyt słabe. Użyj silniejszego hasła"
- [ ] Email zachowany
- [ ] Możliwość retry
```

**9.3. Test - rate limit:**

```bash
# Wykonaj wiele prób rejestracji (10+)

# Sprawdź:
- [ ] Po kilku próbach: alert o rate limit
- [ ] Sugestia odczekania
```

---

### Krok 10: Testowanie progressive enhancement

**10.1. Test bez JavaScript:**

```bash
# Wyłącz JavaScript w przeglądarce

# Sprawdź:
- [ ] Formularz się renderuje
- [ ] HTML5 validation działa (required, minlength, type="email")
- [ ] Submit → POST request
- [ ] Backend validation działa
- [ ] Błędy wyświetlane po reload
- [ ] Email zachowany przy błędzie
- [ ] Redirect działa po sukcesie
- [ ] Inline walidacja NIE działa (to OK - wymaga JS)
```

**10.2. Test z JavaScript:**

```bash
# Włącz JavaScript

# Sprawdź:
- [ ] enhance działa
- [ ] Inline walidacja działa (US 1.3)
- [ ] Loading state wyświetlany
- [ ] Brak full page reload
- [ ] Smooth UX
- [ ] Redirect bez reload
```

---

### Krok 11: Testowanie linków (US 1.7)

```bash
# Na stronie /register kliknij "Zaloguj się"

# Sprawdź:
- [ ] Nawigacja na /login
- [ ] Płynne przejście (SPA)
- [ ] Brak przeładowania
```

**US 1.7 REALIZACJA**: ✅ "Mieć możliwość przełączenia się pomiędzy widokiem logowania a rejestracją"

---

### Krok 12: Accessibility

**12.1. Keyboard navigation:**

```bash
# Sprawdź:
- [ ] Tab przełącza między polami
- [ ] Kolejność: email → password → confirmPassword → button
- [ ] Enter submituje formularz
- [ ] Focus visible na wszystkich elementach
```

**12.2. Screen reader:**

```bash
# Użyj screen readera (VoiceOver, NVDA)

# Sprawdź:
- [ ] Labels czytane poprawnie
- [ ] Błędy ogłaszane (inline + alert)
- [ ] Button states ogłaszane
- [ ] Hint text czytany ("Minimum 8 znaków")
```

---

### Krok 13: Styling i responsywność

**13.1. Mobile (< 768px):**

```bash
# Sprawdź:
- [ ] Formularz wypełnia ekran (max-w-md)
- [ ] Padding odpowiedni (px-4)
- [ ] Pola rozciągają się na 100%
- [ ] Przycisk pełnej szerokości
- [ ] Tekst czytelny
- [ ] Hint text widoczny
```

**13.2. Desktop (> 1024px):**

```bash
# Sprawdź:
- [ ] Card wyśrodkowany
- [ ] Max width 28rem (448px)
- [ ] Nie za szeroki
```

---

### Krok 14: Finalizacja

**14.1. Code review checklist:**

```bash
- [ ] Wszystkie typy poprawne (Props z $props())
- [ ] Inline walidacja działa (US 1.3)
- [ ] Redirect po rejestracji na / (US 1.5)
- [ ] Link do logowania działa (US 1.7)
- [ ] Brak console.log (poza error handling)
- [ ] Brak unused imports
- [ ] Progressive enhancement działa
- [ ] Error handling kompletny
- [ ] Accessibility OK
- [ ] Responsive design
```

**14.2. User Stories verification:**

```bash
- [ ] US 1.2: ✅ Można zarejestrować się z email + password
- [ ] US 1.3: ✅ Walidacja "Hasła nie pasują" odbywa się inline
- [ ] US 1.5: ✅ Automatyczne przekierowanie na / po rejestracji
- [ ] US 1.7: ✅ Link do przełączenia na logowanie
```

**14.3. Security checklist:**

```bash
- [ ] Password type="password" (masked)
- [ ] Autocomplete attributes (new-password)
- [ ] Password match validation (client + server)
- [ ] Rate limiting działa (Supabase)
- [ ] Session cookie HttpOnly (Supabase)
- [ ] No password w logach
```

---

## Podsumowanie

Ten plan implementacji obejmuje kompletnie Widok 4: Rejestracja aplikacji MroczneHistorie.

### Kluczowe aspekty:

**Funkcjonalności:**

1. **Formularz rejestracji** - email + password + confirm password
2. **Inline walidacja (US 1.3)** - "Hasła nie pasują" w czasie rzeczywistym
3. **Supabase Auth** - signUp() z automatycznym logowaniem
4. **Redirect na `/` (US 1.5)** - po udanej rejestracji
5. **Redirect guard** - zalogowani → `/`
6. **Link do logowania (US 1.7)** - dla użytkowników z kontem
7. **Progressive enhancement** - działa z i bez JS
8. **Error handling** - wszystkie scenariusze błędów

**Realizacja User Stories:**

- ✅ **US 1.2**: Rejestracja z email + password
- ✅ **US 1.3**: Inline walidacja "Hasła nie pasują"
- ✅ **US 1.5**: Automatyczne przekierowanie na `/`
- ✅ **US 1.7**: Link do przełączenia na logowanie

**Technologie:**

- SvelteKit Form Actions
- Supabase Auth (@supabase/supabase-js)
- Svelte 5 runes ($state, $derived)
- DaisyUI components
- HTML5 validation

**UX:**

- Inline walidacja zgodności haseł (natychmiastowy feedback)
- Loading state na przycisku i inputs
- Komunikaty błędów po polsku
- Email zachowany przy błędzie
- Wyraźne wskazówki
- Smooth transitions

**Bezpieczeństwo:**

- Password masked (type="password")
- Autocomplete new-password
- Password match validation (client + server)
- Rate limiting (Supabase)
- Session cookies (HttpOnly)
- Redirect guard

**Accessibility:**

- Keyboard navigation
- Screen reader support
- ARIA attributes (opcjonalnie)
- Focus management
- Clear error messages

Szacowany czas implementacji: **4-5 godzin** dla doświadczonego programisty frontend.

Widok jest podobny do logowania, ale z dodatkiem trzeciego pola i inline walidacji (US 1.3), która wymaga trochę więcej pracy z Svelte runes ($derived).
