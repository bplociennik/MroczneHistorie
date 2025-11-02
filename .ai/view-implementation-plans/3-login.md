# Plan implementacji widoku Logowanie

## 1. Przegląd

Widok Logowanie (`/login`) umożliwia istniejącym użytkownikom zalogowanie się do aplikacji MroczneHistorie przy użyciu adresu email i hasła. Jest to prosty, skoncentrowany widok z jednym formularzem wykorzystującym Supabase Auth jako backend uwierzytelniania.

Kluczowe cechy:

- **Formularz logowania** - email + password
- **Supabase Auth** - JWT Bearer authentication
- **Progressive enhancement** - działa z i bez JavaScript
- **Redirect guard** - zalogowani użytkownicy są automatycznie przekierowywani na `/`
- **Error handling** - wyświetlanie błędów logowania
- **Link do rejestracji** - dla nowych użytkowników
- **Mobile-first design** - responsywny layout z DaisyUI

Widok jest częścią Epic 1 (Uwierzytelnianie i Architektura Strony) i realizuje US 1.4 oraz US 1.7.

## 2. Routing widoku

**Ścieżka główna:** `/login`

**Pliki implementacji:**

- `src/routes/login/+page.svelte` - główny komponent widoku
- `src/routes/login/+page.server.ts` - server-side logic, action, redirect guard

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

- `?/login` - loguje użytkownika przez Supabase Auth

**Nawigacja z tego widoku:**

- `/` - po udanym zalogowaniu (automatyczny redirect)
- `/register` - link dla nowych użytkowników

**Nawigacja na ten widok:**

- Z landing page (`/`) - przycisk "Zaloguj się"
- Z nawigacji (dla niezalogowanych)
- Z `/register` - link "Masz już konto?"
- Z chronionych stron - redirect gdy niezalogowany (np. z `/generate`)

## 3. Struktura komponentów

```
+page.svelte (główny kontener)
│
├── <svelte:head>
│   └── <title> Logowanie - MroczneHistorie
│
├── <div class="container">
│   │
│   ├── <div class="page-header">
│   │   ├── <h1> Zaloguj się
│   │   └── <p> Witaj ponownie!
│   │
│   └── <div class="auth-card">
│       │
│       └── <form method="POST" action="?/login" use:enhance>
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
│           │   │   />
│           │   └── {#if form?.errors?.password}
│           │       └── <span class="error"> {form.errors.password}
│           │
│           ├── {#if form?.error}
│           │   └── <div class="alert alert-error">
│           │       └── {form.error}
│           │
│           ├── <button type="submit" class="btn btn-primary">
│           │   Zaloguj się
│           │
│           └── <div class="text-center">
│               └── <p>
│                   Nie masz konta?
│                   <a href="/register"> Zarejestruj się
```

## 4. Szczegóły komponentów

### Komponent: `+page.svelte` (główny plik widoku)

**Opis komponentu:**
Główny widok logowania zawierający formularz z polami email i password. Wykorzystuje SvelteKit Form Actions dla progressive enhancement, co oznacza że działa zarówno z włączonym jak i wyłączonym JavaScript. Obsługuje wyświetlanie błędów walidacji oraz błędów logowania z Supabase Auth.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	// Stan loading (opcjonalny, dla lepszego UX)
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Logowanie - MroczneHistorie</title>
	<meta name="description" content="Zaloguj się do swojego konta MroczneHistorie" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-300 px-4 py-8">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-2">Zaloguj się</h1>
			<p class="text-lg opacity-80">Witaj ponownie w MroczneHistorie!</p>
		</div>

		<!-- Auth Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<form
					method="POST"
					action="?/login"
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
							value={form?.email || ''}
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
							autocomplete="current-password"
						/>
						{#if form?.errors?.password}
							<label class="label">
								<span class="label-text-alt text-error">{form.errors.password}</span>
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
						<button type="submit" class="btn btn-primary btn-lg" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="loading loading-spinner loading-sm"></span>
								Logowanie...
							{:else}
								Zaloguj się
							{/if}
						</button>
					</div>
				</form>

				<!-- Link to Register -->
				<div class="divider">LUB</div>

				<div class="text-center">
					<p class="text-sm">
						Nie masz konta?
						<a href="/register" class="link link-primary font-semibold"> Zarejestruj się </a>
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

1. `submit` (formularz) - wywołuje action `?/login`
2. `enhance` callback - loading state, redirect handling

**Warunki walidacji:**

1. **Email:**
   - Required: pole musi być wypełnione
   - Type: email (HTML5 validation)
   - Format: valid email format

2. **Password:**
   - Required: pole musi być wypełnione
   - Min length: opcjonalnie (Supabase ma swoje wymagania)

**Typy wymagane przez komponent:**

```typescript
import type { PageData, ActionData } from './$types';

interface PageData {
	// Puste (tylko redirect guard w load)
}

interface ActionData {
	email?: string; // Zachowany email przy błędzie
	error?: string; // Ogólny błąd logowania
	errors?: {
		email?: string; // Błąd walidacji email
		password?: string; // Błąd walidacji password
	};
}
```

**Propsy:**

```typescript
export let data: PageData;
export let form: ActionData;
```

---

### Plik: `+page.server.ts`

**Opis:**
Server-side logic zawierający load function (redirect guard dla zalogowanych) oraz Form Action `?/login` która loguje użytkownika przez Supabase Auth. Obsługuje błędy logowania i walidację danych.

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
	login: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;

			// 2. Basic validation
			if (!email || !email.includes('@')) {
				return fail(400, {
					email,
					errors: {
						email: 'Podaj prawidłowy adres email'
					}
				});
			}

			if (!password || password.length < 6) {
				return fail(400, {
					email,
					errors: {
						password: 'Hasło musi mieć minimum 6 znaków'
					}
				});
			}

			// 3. Call Supabase Auth
			const { data, error } = await locals.supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				console.error('Login error:', error);

				// Map Supabase errors to user-friendly messages
				const errorMessages: Record<string, string> = {
					'Invalid login credentials': 'Nieprawidłowy email lub hasło',
					'Email not confirmed': 'Email nie został potwierdzony. Sprawdź swoją skrzynkę',
					'User not found': 'Nie znaleziono użytkownika z tym adresem email',
					'Too many requests': 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę'
				};

				return fail(401, {
					email,
					error: errorMessages[error.message] || 'Nie udało się zalogować. Spróbuj ponownie'
				});
			}

			// 4. Success - redirect to home
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error;
			}

			console.error('Login action error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie'
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
// src/routes/login/+page.server.ts
// Automatycznie generowane przez SvelteKit

interface PageData {
	// Puste - load function tylko sprawdza redirect
}
```

**ActionData** - Odpowiedź z form action

```typescript
// src/routes/login/+page.server.ts
// Automatycznie generowane przez SvelteKit

interface ActionData {
	/** Email użytkownika (zachowany przy błędzie) */
	email?: string;

	/** Ogólny komunikat błędu logowania */
	error?: string;

	/** Błędy walidacji dla poszczególnych pól */
	errors?: {
		email?: string;
		password?: string;
	};
}
```

**LoginFormData** - Dane formularza (lokalny typ)

```typescript
// Lokalny typ w +page.server.ts
interface LoginFormData {
	email: string;
	password: string;
}
```

**SignInWithPasswordCredentials** - Parametry Supabase Auth

```typescript
// Z @supabase/supabase-js
interface SignInWithPasswordCredentials {
	email: string;
	password: string;
}
```

## 6. Zarządzanie stanem

### Stan lokalny (Svelte 5 runes)

**1. isSubmitting - Stan submitu formularza**

```typescript
// src/routes/login/+page.svelte
let isSubmitting = $state(false);

// Użycie w enhance callback
use:enhance={() => {
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
- Zapobieganie wielokrotnym submitom

### Stan z SvelteKit

**1. PageData (reaktywny)**

```typescript
export let data: PageData;

// Automatycznie reactive, updatuje się po:
// - Nawigacji
// - invalidateAll()
```

**2. ActionData (reaktywny)**

```typescript
export let form: ActionData;

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

**Scenariusz: Udane logowanie**

```
1. User wypełnia formularz (email, password)
2. Submit → enhance callback → isSubmitting = true
3. POST ?/login (server action)
4. Server: locals.supabase.auth.signInWithPassword()
5. Success → throw redirect(303, '/')
6. enhance callback → goto('/')
7. Nawigacja na stronę główną
8. Session automatycznie dostępna w locals.user
```

**Scenariusz: Błędne dane logowania**

```
1. User wypełnia formularz
2. Submit → isSubmitting = true
3. POST ?/login
4. Server: signInWithPassword() → error
5. return fail(401, { email, error: '...' })
6. enhance callback → isSubmitting = false
7. update() → form zawiera { email, error }
8. UI wyświetla błąd
9. Email zachowany w polu (value={form?.email})
```

## 7. Integracja API

### Supabase Auth - Login

**Metoda:** `supabase.auth.signInWithPassword()`

**Kiedy:** Po submit formularza logowania (action `?/login`)

**Typ żądania:**

```typescript
// Credentials
interface SignInWithPasswordCredentials {
  email: string;
  password: string;
}

// Przykład
{
  email: "user@example.com",
  password: "securePassword123"
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
	login: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;

			// 2. Validate
			if (!email || !email.includes('@')) {
				return fail(400, {
					email,
					errors: { email: 'Podaj prawidłowy adres email' }
				});
			}

			if (!password || password.length < 6) {
				return fail(400, {
					email,
					errors: { password: 'Hasło musi mieć minimum 6 znaków' }
				});
			}

			// 3. Call Supabase Auth
			const { data, error } = await locals.supabase.auth.signInWithPassword({
				email,
				password
			});

			// 4. Handle errors
			if (error) {
				console.error('Login error:', error);

				// Map errors to Polish messages
				const errorMessages: Record<string, string> = {
					'Invalid login credentials': 'Nieprawidłowy email lub hasło',
					'Email not confirmed': 'Email nie został potwierdzony',
					'User not found': 'Nie znaleziono użytkownika',
					'Too many requests': 'Zbyt wiele prób. Spróbuj za chwilę'
				};

				return fail(401, {
					email,
					error: errorMessages[error.message] || 'Nie udało się zalogować'
				});
			}

			// 5. Success - Supabase automatically sets session cookie
			// Redirect to home
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error;
			}

			console.error('Login action error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd'
			});
		}
	}
};
```

**Session Management:**

- Supabase automatycznie ustawia cookie z session
- Hook `hooks.server.ts` parsuje cookie i udostępnia `locals.user`
- Auto-refresh przez Supabase SDK
- Session lifetime: 1 godzina (default), auto-refresh przed wygaśnięciem

## 8. Interakcje użytkownika

### Interakcja 1: Wypełnienie formularza

**Akcja użytkownika:** Wpisanie email i hasła

**Ścieżka przepływu:**

1. Użytkownik wpisuje email
2. HTML5 validation: type="email", required
3. Użytkownik wpisuje hasło
4. HTML5 validation: required
5. Przyciski "Zaloguj się" aktywny

**Walidacja:**

- Email: required, type="email"
- Password: required

**Oczekiwany rezultat:**

- Formularz ready do submit
- Brak błędów walidacji HTML5

---

### Interakcja 2: Submit formularza

**Akcja użytkownika:** Kliknięcie "Zaloguj się"

**Ścieżka przepływu:**

1. Użytkownik klika "Zaloguj się"
2. HTML5 validation sprawdza required i email format
3. Jeśli OK → submit
4. enhance callback → `isSubmitting = true`
5. Przycisk disabled, tekst "Logowanie...", spinner
6. POST ?/login → server action
7. Server action → `supabase.auth.signInWithPassword()`

**Sukces:** 8. Supabase zwraca session 9. Cookie automatycznie ustawione 10. Server action → `throw redirect(303, '/')` 11. enhance callback → `goto('/')` 12. Nawigacja na stronę główną (lista historii lub empty state)

**Błąd - nieprawidłowe dane:** 8. Supabase zwraca error "Invalid login credentials" 9. Server action → `return fail(401, { email, error: 'Nieprawidłowy email lub hasło' })` 10. enhance callback → `isSubmitting = false`, `update()` 11. Alert z komunikatem błędu wyświetlony 12. Email zachowany w polu 13. Użytkownik może poprawić i spróbować ponownie

**Błąd - email niepotwierdzony:** 8. Supabase zwraca error "Email not confirmed" 9. Server action → `return fail(401, { email, error: 'Email nie został potwierdzony...' })` 10. Alert z komunikatem 11. Użytkownik musi potwierdzić email

**Oczekiwany rezultat:**

- Loading state podczas logowania
- Redirect na `/` po sukcesie
- Komunikat błędu przy niepowodzeniu

---

### Interakcja 3: Kliknięcie "Zarejestruj się"

**Akcja użytkownika:** Kliknięcie linku "Zarejestruj się"

**Ścieżka przepływu:**

1. Użytkownik klika link
2. Nawigacja SvelteKit → `/register`
3. Wyświetlenie widoku rejestracji

**Oczekiwany rezultat:**

- Płynne przejście na stronę rejestracji
- Brak przeładowania strony (SPA navigation)

---

### Interakcja 4: Kliknięcie "Powrót do strony głównej"

**Akcja użytkownika:** Kliknięcie linku w stopce

**Ścieżka przepływu:**

1. Użytkownik klika "← Powrót do strony głównej"
2. Nawigacja → `/`
3. Wyświetlenie landing page

**Oczekiwany rezultat:**

- Powrót na stronę główną

---

### Interakcja 5: Próba dostępu zalogowanego użytkownika

**Akcja użytkownika:** Zalogowany użytkownik próbuje wejść na `/login`

**Ścieżka przepływu:**

1. Zalogowany użytkownik wpisuje `/login` w URL lub klika link
2. SvelteKit wywołuje load function
3. `if (locals.user)` → true
4. `throw redirect(303, '/')`
5. Użytkownik zostaje przekierowany na `/`

**Oczekiwany rezultat:**

- Natychmiastowe przekierowanie
- Formularz logowania się nie renderuje
- US 1.7: Zalogowany na `/login` → `/`

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

- Zalogowani użytkownicy nie widzą formularza logowania
- Automatyczne przekierowanie na stronę główną
- Realizacja US 1.7

---

### Warunek 2: Walidacja email (HTML5 + backend)

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
const email = formData.get('email') as string;

if (!email || !email.includes('@')) {
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

### Warunek 3: Walidacja password

**Warunki:**

1. **Required:** Pole musi być wypełnione
2. **Min length:** Minimum 6 znaków (Supabase default)

**Komponent:** Input password w formularzu

**Implementacja HTML5:**

```svelte
<input type="password" name="password" required class:input-error={form?.errors?.password} />

{#if form?.errors?.password}
	<span class="text-error">{form.errors.password}</span>
{/if}
```

**Implementacja Backend:**

```typescript
const password = formData.get('password') as string;

if (!password || password.length < 6) {
	return fail(400, {
		email,
		errors: { password: 'Hasło musi mieć minimum 6 znaków' }
	});
}
```

**Wpływ na UI:**

- HTML5 blokuje submit jeśli puste
- Backend sprawdza min length
- Komunikat błędu przy za krótkim haśle

---

### Warunek 4: Disabled button podczas submitu

**Warunek:**

```typescript
if (isSubmitting === true) {
	// Disable button
}
```

**Komponent:** Button submit w formularzu

**Implementacja:**

```svelte
<script>
	let isSubmitting = $state(false);
</script>

<button type="submit" disabled={isSubmitting}>
	{#if isSubmitting}
		<span class="loading loading-spinner"></span>
		Logowanie...
	{:else}
		Zaloguj się
	{/if}
</button>
```

**Wpływ na UI:**

- Button disabled podczas logowania
- Tekst zmienia się na "Logowanie..."
- Spinner wyświetlany
- Zapobiega wielokrotnym submitom

---

### Warunek 5: Wyświetlanie błędów logowania

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

- Alert wyświetlony gdy błąd logowania
- Czerwony kolor, ikona X
- Komunikat po polsku
- Email zachowany w polu

---

### Warunek 6: Zachowanie email przy błędzie

**Warunek:**

```typescript
if (form?.email) {
	// Wypełnij pole email
}
```

**Komponent:** Input email

**Implementacja:**

```svelte
<input type="email" name="email" value={form?.email || ''} />
```

**Wpływ na UI:**

- Email nie jest tracony przy błędzie
- Użytkownik nie musi wpisywać ponownie
- Tylko hasło trzeba wpisać ponownie (bezpieczeństwo)

## 10. Obsługa błędów

### Scenariusz 1: Nieprawidłowe dane logowania (401)

**Przyczyna:**

- Błędny email lub hasło
- Użytkownik nie istnieje
- Literówka w danych

**Obsługa:**

```typescript
// +page.server.ts
const { data, error } = await locals.supabase.auth.signInWithPassword({
	email,
	password
});

if (error && error.message === 'Invalid login credentials') {
	return fail(401, {
		email,
		error: 'Nieprawidłowy email lub hasło. Sprawdź dane i spróbuj ponownie'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z komunikatem "Nieprawidłowy email lub hasło"
- Email zachowany w polu
- Możliwość poprawy danych i retry
- Hasło pole puste (bezpieczeństwo)

---

### Scenariusz 2: Email niepotwierdzony (401)

**Przyczyna:**

- Użytkownik się zarejestrował ale nie kliknął linku w emailu
- Link weryfikacyjny wygasł

**Obsługa:**

```typescript
if (error && error.message === 'Email not confirmed') {
	return fail(401, {
		email,
		error:
			'Email nie został potwierdzony. Sprawdź swoją skrzynkę pocztową i kliknij link weryfikacyjny'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z instrukcją potwierdzenia email
- Wyraźny komunikat co zrobić
- Nie można się zalogować bez potwierdzenia

---

### Scenariusz 3: Rate limit (429)

**Przyczyna:**

- Zbyt wiele prób logowania w krótkim czasie
- Supabase zabezpieczenie przed brute force

**Obsługa:**

```typescript
if (error && error.message === 'Too many requests') {
	return fail(429, {
		email,
		error: 'Zbyt wiele prób logowania. Spróbuj ponownie za kilka minut'
	});
}
```

**Rezultat dla użytkownika:**

- Alert z informacją o rate limit
- Sugestia odczekania
- Ochrona przed atakami brute force

---

### Scenariusz 4: Błąd walidacji email (400)

**Przyczyna:**

- Email pusty
- Email bez @
- Nieprawidłowy format

**Obsługa:**

```typescript
if (!email || !email.includes('@')) {
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
- Wyraźna instrukcja co poprawić
- HTML5 validation jako pierwsza linia obrony

---

### Scenariusz 5: Błąd walidacji hasła (400)

**Przyczyna:**

- Hasło puste
- Hasło za krótkie (< 6 znaków)

**Obsługa:**

```typescript
if (!password || password.length < 6) {
	return fail(400, {
		email,
		errors: {
			password: 'Hasło musi mieć minimum 6 znaków'
		}
	});
}
```

**Rezultat dla użytkownika:**

- Komunikat błędu pod polem password
- Czerwona ramka
- Email zachowany

---

### Scenariusz 6: Błąd sieci (Network Error)

**Przyczyna:**

- Brak połączenia z internetem
- Problem z Supabase API
- Timeout

**Obsługa:**

```typescript
try {
	const { data, error } = await locals.supabase.auth.signInWithPassword({
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
- Możliwość retry

---

### Scenariusz 7: Błąd wewnętrzny (500)

**Przyczyna:**

- Nieoczekiwany błąd serwera
- Błąd w kodzie
- Problem z Supabase

**Obsługa:**

```typescript
catch (error) {
  if (error instanceof Error && error.message.includes('redirect')) {
    throw error; // Re-throw redirect
  }

  console.error('Login action error:', error);
  return fail(500, {
    email,
    error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę'
  });
}
```

**Rezultat dla użytkownika:**

- Ogólny komunikat błędu
- Sugestia retry
- Log w konsoli serwera dla debugowania

---

### Scenariusz 8: User not found (404)

**Przyczyna:**

- Email nie istnieje w bazie
- Użytkownik usunął konto

**Obsługa:**

```typescript
if (error && error.message === 'User not found') {
	return fail(401, {
		email,
		error: 'Nie znaleziono użytkownika z tym adresem email. Sprawdź email lub zarejestruj się'
	});
}
```

**Rezultat dla użytkownika:**

- Komunikat że użytkownik nie istnieje
- Link do rejestracji widoczny poniżej
- Możliwość sprawdzenia literówki w emailu

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
│   └── login/
│       ├── +page.svelte          (główny widok)
│       └── +page.server.ts       (server logic, action, guard)
```

**Polecenia:**

```bash
# Utwórz katalog
mkdir -p src/routes/login

# Utwórz pliki
touch src/routes/login/+page.svelte
touch src/routes/login/+page.server.ts
```

---

### Krok 2: Implementacja +page.server.ts

**2.1. Load function z redirect guard:**

```typescript
// src/routes/login/+page.server.ts
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

**2.2. Form Action - login:**

```typescript
export const actions: Actions = {
	login: async ({ request, locals }) => {
		try {
			// 1. Parse form data
			const formData = await request.formData();
			const email = formData.get('email') as string;
			const password = formData.get('password') as string;

			// 2. Validate
			if (!email || !email.includes('@')) {
				return fail(400, {
					email,
					errors: {
						email: 'Podaj prawidłowy adres email'
					}
				});
			}

			if (!password || password.length < 6) {
				return fail(400, {
					email,
					errors: {
						password: 'Hasło musi mieć minimum 6 znaków'
					}
				});
			}

			// 3. Call Supabase Auth
			const { data, error } = await locals.supabase.auth.signInWithPassword({
				email,
				password
			});

			// 4. Handle errors
			if (error) {
				console.error('Login error:', {
					message: error.message,
					email,
					timestamp: new Date().toISOString()
				});

				// Map Supabase errors to Polish
				const errorMessages: Record<string, string> = {
					'Invalid login credentials': 'Nieprawidłowy email lub hasło',
					'Email not confirmed': 'Email nie został potwierdzony. Sprawdź swoją skrzynkę',
					'User not found': 'Nie znaleziono użytkownika z tym adresem email',
					'Too many requests': 'Zbyt wiele prób logowania. Spróbuj za kilka minut'
				};

				return fail(401, {
					email,
					error: errorMessages[error.message] || 'Nie udało się zalogować. Spróbuj ponownie'
				});
			}

			// 5. Success - Supabase sets cookie automatically
			throw redirect(303, '/');
		} catch (error) {
			// Re-throw redirect
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error;
			}

			console.error('Login action unexpected error:', error);
			return fail(500, {
				error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie'
			});
		}
	}
};
```

---

### Krok 3: Implementacja +page.svelte - podstawowa struktura

```svelte
<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';

	export let data: PageData;
	export let form: ActionData;

	// Loading state
	let isSubmitting = $state(false);
</script>

<svelte:head>
	<title>Logowanie - MroczneHistorie</title>
	<meta name="description" content="Zaloguj się do swojego konta" />
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-base-300 px-4 py-8">
	<div class="w-full max-w-md">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-4xl md:text-5xl font-bold mb-2">Zaloguj się</h1>
			<p class="text-lg opacity-80">Witaj ponownie w MroczneHistorie!</p>
		</div>

		<!-- Auth Card -->
		<div class="card bg-base-100 shadow-xl">
			<div class="card-body">
				<!-- Form będzie w następnym kroku -->
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

### Krok 4: Implementacja formularza

```svelte
<!-- Kontynuacja w card-body -->

<form
	method="POST"
	action="?/login"
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
			value={form?.email || ''}
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
			autocomplete="current-password"
		/>
		{#if form?.errors?.password}
			<label class="label">
				<span class="label-text-alt text-error">
					{form.errors.password}
				</span>
			</label>
		{/if}
	</div>

	<!-- General Error Alert -->
	{#if form?.error}
		<div class="alert alert-error mt-4">
			<svg
				class="w-6 h-6 shrink-0"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
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
		<button type="submit" class="btn btn-primary btn-lg w-full" disabled={isSubmitting}>
			{#if isSubmitting}
				<span class="loading loading-spinner loading-sm"></span>
				Logowanie...
			{:else}
				<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
					/>
				</svg>
				Zaloguj się
			{/if}
		</button>
	</div>
</form>

<!-- Divider -->
<div class="divider">LUB</div>

<!-- Link to Register -->
<div class="text-center">
	<p class="text-sm">
		Nie masz konta?
		<a href="/register" class="link link-primary font-semibold"> Zarejestruj się </a>
	</p>
</div>
```

---

### Krok 5: Testowanie funkcjonalności

**5.1. Test redirect guard (zalogowany):**

```bash
# Zaloguj się
# Spróbuj wejść na http://localhost:5173/login

# Sprawdź:
- [ ] Natychmiastowe przekierowanie na /
- [ ] Formularz nie renderuje się
- [ ] Brak flashów contentu
```

**5.2. Test formularza (niezalogowany):**

```bash
# Wyloguj się
# Otwórz http://localhost:5173/login

# Sprawdź:
- [ ] Formularz się wyświetla
- [ ] Pola email i password puste
- [ ] Przycisk "Zaloguj się" aktywny
- [ ] Link do rejestracji widoczny
```

**5.3. Test walidacji HTML5:**

```bash
# Spróbuj submit z pustym email
- [ ] HTML5 validation blokuje submit
- [ ] Message "Please fill out this field"

# Wpisz nieprawidłowy email (bez @)
- [ ] HTML5 validation blokuje
- [ ] Message "Please include @ in email"

# Spróbuj submit z pustym password
- [ ] HTML5 validation blokuje
```

**5.4. Test backend validation:**

```bash
# Wyłącz JavaScript w przeglądarce
# Wpisz email bez @ i submit

# Sprawdź:
- [ ] Backend zwraca fail(400)
- [ ] Komunikat błędu pod polem email
- [ ] Email zachowany w polu
```

**5.5. Test logowania - sukces:**

```bash
# Wpisz prawidłowe dane istniejącego użytkownika
# Kliknij "Zaloguj się"

# Sprawdź:
- [ ] Przycisk disabled
- [ ] Tekst "Logowanie..."
- [ ] Spinner wyświetlany
- [ ] Po 1-2s redirect na /
- [ ] Zalogowany (nawigacja zmieniona)
- [ ] Session cookie ustawione
```

**5.6. Test logowania - błędne dane:**

```bash
# Wpisz nieprawidłowy email lub hasło
# Submit

# Sprawdź:
- [ ] Alert "Nieprawidłowy email lub hasło"
- [ ] Email zachowany w polu
- [ ] Password pole puste
- [ ] Możliwość ponownej próby
```

**5.7. Test logowania - email niepotwierdzony:**

```bash
# Zarejestruj nowego użytkownika (nie potwierdzaj email)
# Spróbuj się zalogować

# Sprawdź:
- [ ] Alert "Email nie został potwierdzony..."
- [ ] Instrukcja sprawdzenia skrzynki
- [ ] Nie można się zalogować
```

**5.8. Test linków:**

```bash
# Kliknij "Zarejestruj się"
- [ ] Nawigacja na /register

# Kliknij "Powrót do strony głównej"
- [ ] Nawigacja na /
```

---

### Krok 6: Obsługa błędów - edge cases

**6.1. Test rate limit:**

```bash
# Wykonaj wiele prób logowania w krótkim czasie (10+)

# Sprawdź:
- [ ] Po kilku próbach: alert o rate limit
- [ ] Sugestia odczekania
- [ ] Email zachowany
```

**6.2. Test network error:**

```bash
# Wyłącz internet
# Spróbuj się zalogować

# Sprawdź:
- [ ] Alert "Błąd połączenia"
- [ ] Sugestia sprawdzenia internetu
- [ ] Dane zachowane
```

**6.3. Test bardzo długiego email:**

```bash
# Wpisz bardzo długi email (200+ znaków)

# Sprawdź:
- [ ] Pole przyjmuje długi tekst
- [ ] Submit działa
- [ ] Backend obsługuje
```

**6.4. Test special characters w password:**

```bash
# Wpisz hasło ze special chars: !@#$%^&*()

# Sprawdź:
- [ ] Hasło akceptowane
- [ ] Logowanie działa
```

---

### Krok 7: Progressive enhancement

**7.1. Test bez JavaScript:**

```bash
# Wyłącz JavaScript w przeglądarce

# Sprawdź:
- [ ] Formularz się renderuje
- [ ] HTML5 validation działa
- [ ] Submit → POST request
- [ ] Backend validation działa
- [ ] Błędy wyświetlane po reload
- [ ] Email zachowany przy błędzie
- [ ] Redirect działa po sukcesie
```

**7.2. Test z JavaScript:**

```bash
# Włącz JavaScript

# Sprawdź:
- [ ] enhance działa
- [ ] Loading state wyświetlany
- [ ] Brak full page reload
- [ ] Smooth UX
- [ ] Redirect bez reload
```

---

### Krok 8: Accessibility

**8.1. Keyboard navigation:**

```bash
# Sprawdź:
- [ ] Tab przełącza między polami
- [ ] Enter submituje formularz
- [ ] Focus visible na wszystkich elementach
- [ ] Escape na alertach (opcjonalnie)
```

**8.2. Screen reader:**

```bash
# Użyj screen readera (VoiceOver, NVDA)

# Sprawdź:
- [ ] Labels czytane poprawnie
- [ ] Błędy ogłaszane
- [ ] Button states ogłaszane
- [ ] Alert ogłaszany
```

**8.3. ARIA attributes:**

```svelte
<!-- Dodaj jeśli potrzebne -->
<input
	aria-label="Adres email"
	aria-invalid={form?.errors?.email ? 'true' : 'false'}
	aria-describedby={form?.errors?.email ? 'email-error' : undefined}
/>

{#if form?.errors?.email}
	<span id="email-error" role="alert">
		{form.errors.email}
	</span>
{/if}
```

---

### Krok 9: Styling i responsywność

**9.1. Mobile (< 768px):**

```bash
# Sprawdź:
- [ ] Formularz wypełnia ekran (max-w-md)
- [ ] Padding odpowiedni (px-4)
- [ ] Pola rozciągają się na 100%
- [ ] Przycisk pełnej szerokości
- [ ] Tekst czytelny
```

**9.2. Tablet (768px - 1024px):**

```bash
# Sprawdź:
- [ ] Card wyśrodkowany
- [ ] Max width 28rem
- [ ] Spacing proporcjonalny
```

**9.3. Desktop (> 1024px):**

```bash
# Sprawdź:
- [ ] Card wyśrodkowany
- [ ] Nie za szeroki
- [ ] Padding sides odpowiedni
```

---

### Krok 10: Finalizacja

**10.1. Code review checklist:**

```bash
- [ ] Wszystkie typy poprawne
- [ ] Brak console.log (poza error handling)
- [ ] Brak unused imports
- [ ] Progressive enhancement działa
- [ ] Error handling kompletny
- [ ] Accessibility OK
- [ ] Responsive design
- [ ] Link do rejestracji działa
- [ ] Redirect guard działa
```

**10.2. Security checklist:**

```bash
- [ ] Password type="password" (masked)
- [ ] Autocomplete attributes
- [ ] HTTPS w produkcji
- [ ] Rate limiting działa
- [ ] Session cookie HttpOnly (Supabase)
- [ ] No password w logach
```

**10.3. UX checklist:**

```bash
- [ ] Loading state wyraźny
- [ ] Error messages po polsku
- [ ] Email zachowany przy błędzie
- [ ] Clear error messaging
- [ ] Link do rejestracji widoczny
- [ ] Back button działa
```

---

### Krok 11: Deployment

```bash
# 1. Final checks
npm run check
npm run lint
npm run build
npm run preview

# 2. Test na preview
# - Redirect guard
# - Logowanie
# - Error handling

# 3. Commit
git add .
git commit -m "Implement login view with Supabase Auth

- Add login form with email and password
- Implement redirect guard (logged in → /)
- Add Supabase Auth integration
- Handle login errors (invalid credentials, email not confirmed, rate limit)
- Progressive enhancement support
- Full accessibility
- Responsive design
- Link to registration"

# 4. Push
git push origin main

# 5. Verify production
# - Test logowania na produkcji
# - Sprawdź redirect guard
# - Test błędów
```

---

## Podsumowanie

Ten plan implementacji obejmuje kompletnie Widok 3: Logowanie aplikacji MroczneHistorie.

### Kluczowe aspekty:

**Funkcjonalności:**

1. **Formularz logowania** - email + password
2. **Supabase Auth** - signInWithPassword()
3. **Redirect guard** - zalogowani → `/`
4. **Error handling** - wszystkie scenariusze błędów
5. **Progressive enhancement** - działa z i bez JS
6. **Link do rejestracji** - dla nowych użytkowników

**Technologie:**

- SvelteKit Form Actions
- Supabase Auth (@supabase/supabase-js)
- Svelte 5 runes ($state)
- DaisyUI components
- HTML5 validation

**UX:**

- Loading state na przycisku
- Komunikaty błędów po polsku
- Email zachowany przy błędzie
- Wyraźne wskazówki
- Smooth transitions

**Bezpieczeństwo:**

- Password masked (type="password")
- Autocomplete attributes
- Rate limiting (Supabase)
- Session cookies (HttpOnly)
- Redirect guard

**Accessibility:**

- Keyboard navigation
- Screen reader support
- ARIA attributes
- Focus management
- Clear error messages

Szacowany czas implementacji: **3-4 godziny** dla doświadczonego programisty frontend.

Widok jest prostszy niż generator, ale równie ważny - to brama do aplikacji dla istniejących użytkowników!
