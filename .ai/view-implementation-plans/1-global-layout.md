# Plan implementacji widoku Globalny Layout

## 1. Przegląd

Widok Globalny Layout (`src/routes/+layout.svelte`) stanowi fundamentalną warstwę architektury aplikacji MroczneHistorie. Jest to nadrzędny komponent obejmujący wszystkie podstrony aplikacji, zapewniający spójną nawigację, globalny system powiadomień oraz wskaźnik ładowania podczas operacji asynchronicznych (generowanie AI).

Główne cele tego widoku:

- Zapewnienie jednolitej nawigacji zależnej od stanu uwierzytelnienia użytkownika
- Zarządzanie globalnym stanem ładowania (podczas generowania historii przez AI)
- Wyświetlanie toastów z błędami i powiadomieniami systemowymi
- Dostarczanie kontekstu sesji użytkownika dla wszystkich podstron
- Wymuszenie trybu ciemnego (dark mode) dla całej aplikacji

## 2. Routing widoku

**Ścieżka główna:** `src/routes/+layout.svelte`

Widok obejmuje wszystkie ścieżki w aplikacji. Jest to root layout SvelteKit, który owija całą aplikację:

- `/` - strona główna (landing page lub lista historii)
- `/login` - strona logowania
- `/register` - strona rejestracji
- `/generate` - generator historii
- `/stories/[id]` - tryb gry (wyświetlanie pojedynczej historii)
- `/stories/[id]/edit` - edycja historii

**Plik serwera:** `src/routes/+layout.server.ts`

Odpowiedzialny za:

- Pobieranie sesji użytkownika z Supabase
- Udostępnianie danych sesji wszystkim podstronom
- Obsługę akcji wylogowania

## 3. Struktura komponentów

```
+layout.svelte (główny kontener)
│
├── <Navbar />
│   ├── Logo/Brand
│   ├── Linki nawigacji (warunkowe, zależne od sesji)
│   │   ├── [Niezalogowany] Link: Strona główna (/)
│   │   ├── [Niezalogowany] Link: Zaloguj się (/login)
│   │   ├── [Niezalogowany] Link: Stwórz konto (/register)
│   │   ├── [Zalogowany] Link: Moje Historie (/)
│   │   ├── [Zalogowany] Link: Generuj (+) (/generate)
│   │   └── [Zalogowany] Przycisk: Wyloguj (form action)
│   └── [Mobile] DaisyUI Dropdown/Hamburger menu
│
├── <GlobalLoader />
│   ├── Overlay (pełnoekranowy, semi-transparent)
│   ├── Spinner (DaisyUI loading)
│   └── Tekst: "Tworzymy Twoją mroczną historię..."
│
├── <ToastContainer />
│   └── Lista toastów (DaisyUI Alert)
│       ├── Toast message
│       ├── Toast type indicator (ikona/kolor)
│       └── Przycisk zamknięcia (X)
│
└── <slot />
    └── [Treść renderowana z podstron]
```

## 4. Szczegóły komponentów

### Komponent: `+layout.svelte` (główny plik layoutu)

**Opis komponentu:**
Root layout aplikacji SvelteKit. Odpowiada za kompozycję globalnych komponentów i renderowanie treści podstron poprzez slot. Importuje i inicjalizuje globalne store'y dla ładowania i toastów.

**Główne elementy HTML i komponenty:**

```svelte
<div class="min-h-screen bg-base-300">
	<Navbar session={data.session} />

	<main class="container mx-auto px-4 py-8">
		<slot />
	</main>

	<GlobalLoader />
	<ToastContainer />
</div>
```

**Obsługiwane zdarzenia:**

- Brak bezpośrednich zdarzeń (deleguje do komponentów dzieci)

**Warunki walidacji:**

- Sprawdzenie czy `data.session` istnieje przed przekazaniem do `<Navbar />`

**Typy wymagane przez komponent:**

- `LayoutData` - typ danych z +layout.server.ts

```typescript
interface LayoutData {
	session: Session | null;
}
```

**Propsy:**

```typescript
// Z SvelteKit (automatycznie dostarczane)
export let data: LayoutData;
```

---

### Komponent: `<Navbar />`

**Opis komponentu:**
Responsywny komponent nawigacji wyświetlający różne linki w zależności od stanu uwierzytelnienia użytkownika. Wykorzystuje DaisyUI components (navbar, dropdown) dla zapewnienia spójnego wyglądu i responsywności.

**Główne elementy HTML i komponenty:**

```svelte
<nav class="navbar bg-base-100 shadow-lg">
	<!-- Logo -->
	<div class="navbar-start">
		<a href="/" class="btn btn-ghost text-xl">MroczneHistorie</a>
	</div>

	<!-- Desktop Navigation -->
	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1">
			{#if session}
				<li><a href="/">Moje Historie</a></li>
				<li><a href="/generate">Generuj (+)</a></li>
			{:else}
				<li><a href="/">Strona główna</a></li>
				<li><a href="/login">Zaloguj się</a></li>
				<li><a href="/register">Stwórz konto</a></li>
			{/if}
		</ul>
	</div>

	<!-- Mobile Dropdown -->
	<div class="navbar-end lg:hidden">
		<div class="dropdown dropdown-end">
			<button class="btn btn-ghost">☰</button>
			<ul class="dropdown-content menu">
				<!-- linki mobilne -->
			</ul>
		</div>
	</div>

	<!-- Desktop Logout -->
	{#if session}
		<div class="navbar-end hidden lg:flex">
			<form method="POST" action="?/logout">
				<button class="btn btn-ghost">Wyloguj</button>
			</form>
		</div>
	{/if}
</nav>
```

**Obsługiwane zdarzenia:**

- `click` na linkach nawigacji - przejście do odpowiedniej strony (natywna nawigacja SvelteKit)
- `submit` na formularzu wylogowania - wywołanie akcji `?/logout`
- `click` na przycisku hamburger (mobile) - toggle dropdown menu

**Warunki walidacji:**

- Nie wymaga walidacji (tylko prezentacja)

**Typy wymagane przez komponent:**

```typescript
import type { Session } from '@supabase/supabase-js';

interface NavbarProps {
	session: Session | null;
}
```

**Propsy:**

```typescript
export let session: Session | null;
```

---

### Komponent: `<GlobalLoader />`

**Opis komponentu:**
Pełnoekranowy wskaźnik ładowania wyświetlany podczas długotrwałych operacji asynchronicznych (głównie generowanie historii przez AI). Blokuje całość interfejsu użytkownika, uniemożliwiając interakcję podczas przetwarzania. Kontrolowany przez globalny Svelte store `loadingStore`.

**Główne elementy HTML i komponenty:**

```svelte
{#if $loadingStore.isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/90 backdrop-blur-sm">
		<div class="flex flex-col items-center gap-4">
			<span class="loading loading-spinner loading-lg text-primary"></span>
			<p class="text-lg font-medium text-base-content">
				{$loadingStore.message || 'Ładowanie...'}
			</p>
		</div>
	</div>
{/if}
```

**Obsługiwane zdarzenia:**

- Brak (komponent jest tylko widokiem, kontrolowany przez store)

**Warunki walidacji:**

- Wyświetlanie warunkowe: `$loadingStore.isLoading === true`
- Timeout: 45 sekund (zarządzane przez wywołujący kod, nie przez komponent)

**Typy wymagane przez komponent:**

```typescript
interface LoadingState {
	isLoading: boolean;
	message?: string;
}
```

**Propsy:**

```typescript
// Brak propsów - komponent subskrybuje globalny store
```

---

### Komponent: `<ToastContainer />`

**Opis komponentu:**
Kontener na powiadomienia toast wyświetlane w prawym górnym rogu ekranu. Obsługuje różne typy komunikatów (błędy, sukces, info) i automatyczne znikanie po określonym czasie (domyślnie 5 sekund). Wykorzystuje DaisyUI Alert component.

**Główne elementy HTML i komponenty:**

```svelte
<div class="toast toast-top toast-end z-50">
	{#each $toastStore as toast (toast.id)}
		<div class="alert alert-{toast.type} shadow-lg" transition:fly={{ y: -20, duration: 300 }}>
			<div class="flex items-center justify-between w-full gap-2">
				<span>{toast.message}</span>
				<button class="btn btn-sm btn-ghost" on:click={() => removeToast(toast.id)}> ✕ </button>
			</div>
		</div>
	{/each}
</div>
```

**Obsługiwane zdarzenia:**

- `click` na przycisku zamknięcia (✕) - usunięcie konkretnego toasta
- Automatyczne usunięcie po `toast.duration` ms (zarządzane przez store)

**Warunki walidacji:**

- Wyświetlanie tylko gdy `$toastStore.length > 0`
- Automatyczne usuwanie po upływie czasu

**Typy wymagane przez komponent:**

```typescript
interface Toast {
	id: string;
	message: string;
	type: 'error' | 'success' | 'info' | 'warning';
	duration?: number;
}
```

**Propsy:**

```typescript
// Brak propsów - komponent subskrybuje globalny store
```

---

### Plik: `+layout.server.ts`

**Opis:**
Server-side load function odpowiedzialna za pobieranie sesji użytkownika z Supabase i udostępnianie jej wszystkim podstronom. Obsługuje również akcję wylogowania.

**Load function:**

```typescript
export const load: LayoutServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	return {
		session
	};
};
```

**Form Actions:**

```typescript
export const actions: Actions = {
	logout: async ({ locals }) => {
		const { error } = await locals.supabase.auth.signOut();

		if (error) {
			return fail(500, { message: 'Błąd podczas wylogowywania' });
		}

		throw redirect(303, '/');
	}
};
```

## 5. Typy

### Typy z Supabase Auth

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

// User - automatycznie z Supabase
interface User {
	id: string;
	email?: string;
	// ... inne pola
}
```

### Typy Store'ów (nowe typy do stworzenia)

**LoadingState** - do zarządzania stanem globalnego loadera

```typescript
// src/lib/stores/loading.ts
interface LoadingState {
	/** Czy operacja się wykonuje */
	isLoading: boolean;

	/** Opcjonalna wiadomość do wyświetlenia */
	message?: string;
}
```

**Toast** - do zarządzania powiadomieniami

```typescript
// src/lib/stores/toasts.ts
interface Toast {
	/** Unikalny identyfikator toasta */
	id: string;

	/** Treść komunikatu (w języku polskim) */
	message: string;

	/** Typ toasta wpływający na styl wizualny */
	type: 'error' | 'success' | 'info' | 'warning';

	/** Czas wyświetlania w milisekundach (domyślnie 5000) */
	duration?: number;
}

/** Funkcje helper dla toastStore */
interface ToastStore extends Writable<Toast[]> {
	/** Dodaje nowy toast do listy */
	addToast: (message: string, type?: Toast['type'], duration?: number) => void;

	/** Usuwa toast o podanym ID */
	removeToast: (id: string) => void;
}
```

### Typy dla Layout Data

```typescript
// src/routes/+layout.server.ts
import type { Session } from '@supabase/supabase-js';
import type { LayoutServerLoad } from './$types';

interface LayoutData {
	session: Session | null;
}
```

## 6. Zarządzanie stanem

### Globalne Svelte Stores

Layout wykorzystuje dwa główne store'y do zarządzania stanem globalnym:

#### 1. `loadingStore` - Stan globalnego ładowania

**Lokalizacja:** `src/lib/stores/loading.ts`

**Implementacja:**

```typescript
import { writable } from 'svelte/store';

interface LoadingState {
	isLoading: boolean;
	message?: string;
}

function createLoadingStore() {
	const { subscribe, set, update } = writable<LoadingState>({
		isLoading: false,
		message: undefined
	});

	return {
		subscribe,

		/** Rozpoczyna ładowanie z opcjonalną wiadomością */
		start: (message?: string) => {
			set({ isLoading: true, message });
		},

		/** Zatrzymuje ładowanie */
		stop: () => {
			set({ isLoading: false, message: undefined });
		},

		/** Reset do stanu początkowego */
		reset: () => {
			set({ isLoading: false, message: undefined });
		}
	};
}

export const loadingStore = createLoadingStore();
```

**Użycie:**

```typescript
// Rozpoczęcie ładowania
loadingStore.start('Tworzymy Twoją mroczną historię...');

// Zatrzymanie ładowania
loadingStore.stop();
```

#### 2. `toastStore` - Zarządzanie powiadomieniami

**Lokalizacja:** `src/lib/stores/toasts.ts`

**Implementacja:**

```typescript
import { writable } from 'svelte/store';
import { nanoid } from 'nanoid'; // lub inna metoda generowania ID

interface Toast {
	id: string;
	message: string;
	type: 'error' | 'success' | 'info' | 'warning';
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	// Mapa timeout'ów dla automatycznego usuwania
	const timeouts = new Map<string, number>();

	return {
		subscribe,

		/** Dodaje nowy toast */
		addToast: (message: string, type: Toast['type'] = 'info', duration: number = 5000) => {
			const id = nanoid();
			const toast: Toast = { id, message, type, duration };

			update((toasts) => [...toasts, toast]);

			// Automatyczne usunięcie po duration ms
			const timeoutId = setTimeout(() => {
				removeToast(id);
			}, duration);

			timeouts.set(id, timeoutId);
		},

		/** Usuwa toast o podanym ID */
		removeToast: (id: string) => {
			// Usuń timeout jeśli istnieje
			const timeoutId = timeouts.get(id);
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeouts.delete(id);
			}

			// Usuń toast z listy
			update((toasts) => toasts.filter((t) => t.id !== id));
		}
	};
}

export const toastStore = createToastStore();
```

**Użycie:**

```typescript
// Dodanie toasta błędu
toastStore.addToast('Wystąpił błąd podczas generowania historii', 'error');

// Dodanie toasta sukcesu
toastStore.addToast('Historia została zapisana', 'success');

// Ręczne usunięcie
toastStore.removeToast(toastId);
```

### Stan lokalny

Layout nie wymaga lokalnego stanu - cały stan jest zarządzany przez:

1. **Globalne store'y** - `loadingStore`, `toastStore`
2. **SvelteKit data** - `data.session` z +layout.server.ts
3. **Komponenty dzieci** - zarządzają własnym stanem lokalnie

## 7. Integracja API

### Endpoint: Pobieranie sesji użytkownika

**Implementacja:** `+layout.server.ts` - funkcja `load`

**Typ żądania:** Brak (wewnętrzne wywołanie Supabase)

**Typ odpowiedzi:**

```typescript
interface LayoutData {
	session: Session | null;
}

// Session z @supabase/supabase-js
interface Session {
	user: User;
	access_token: string;
	refresh_token: string;
	expires_at?: number;
	expires_in: number;
}
```

**Obsługa:**

```typescript
export const load: LayoutServerLoad = async ({ locals }) => {
	const session = await locals.getSession();

	return {
		session
	};
};
```

**Obsługa błędów:**

- Jeśli `locals.getSession()` rzuci błąd, zwracamy `session: null`
- Użytkownik jest traktowany jako niezalogowany

---

### Action: Wylogowanie użytkownika

**Implementacja:** `+layout.server.ts` - akcja `?/logout`

**Typ żądania:**

```typescript
// Form action - brak body
FormData {} // pusty formularz
```

**Typ odpowiedzi:**

```typescript
// Sukces - redirect
type ActionResult = {
	type: 'redirect';
	status: 303;
	location: '/';
};

// Błąd
type ActionResult = {
	type: 'failure';
	status: 500;
	data: {
		message: string;
	};
};
```

**Obsługa:**

```typescript
export const actions: Actions = {
	logout: async ({ locals }) => {
		const { error } = await locals.supabase.auth.signOut();

		if (error) {
			console.error('Logout error:', error);
			return fail(500, {
				message: 'Nie udało się wylogować. Spróbuj ponownie.'
			});
		}

		throw redirect(303, '/');
	}
};
```

**Obsługa błędów:**

- Błąd Supabase → zwracamy `fail(500)` z komunikatem
- Toast z błędem może być wyświetlony przez komponent wywołujący

## 8. Interakcje użytkownika

### Interakcja 1: Nawigacja po aplikacji

**Akcja użytkownika:** Kliknięcie w link w nawigacji

**Ścieżka przepływu:**

1. Użytkownik klika link (np. "Moje Historie", "Generuj", "Zaloguj się")
2. SvelteKit interceptuje kliknięcie (client-side navigation)
3. Następuje przejście na odpowiednią stronę bez przeładowania
4. Nawigacja pozostaje widoczna (część layoutu)

**Obsługa:**

- Natywne linki `<a href="...">` obsługiwane przez SvelteKit router
- Brak dodatkowej logiki

**Oczekiwany rezultat:**

- Płynne przejście na wybraną stronę
- Navbar pozostaje widoczny i aktywny

---

### Interakcja 2: Wylogowanie

**Akcja użytkownika:** Kliknięcie przycisku "Wyloguj"

**Ścieżka przepływu:**

1. Użytkownik klika "Wyloguj"
2. Formularz submit → wywołanie akcji `?/logout`
3. Serwer wywołuje `supabase.auth.signOut()`
4. Redirect na `/`
5. Layout ponownie ładuje dane → `session` = null
6. Navbar renderuje linki dla niezalogowanych

**Obsługa:**

```svelte
<form method="POST" action="?/logout">
	<button type="submit" class="btn btn-ghost"> Wyloguj </button>
</form>
```

**Oczekiwany rezultat:**

- Użytkownik zostaje wylogowany
- Przekierowanie na stronę główną
- Zmiana nawigacji na wersję dla niezalogowanych

**Obsługa błędów:**

- Jeśli wylogowanie się nie powiedzie → toast z błędem
- Użytkownik pozostaje zalogowany

---

### Interakcja 3: Zamknięcie toasta

**Akcja użytkownika:** Kliknięcie przycisku "✕" na toaście

**Ścieżka przepływu:**

1. Użytkownik klika "✕"
2. Wywołanie `toastStore.removeToast(id)`
3. Toast znika z animacją

**Obsługa:**

```svelte
<button on:click={() => toastStore.removeToast(toast.id)}> ✕ </button>
```

**Oczekiwany rezultat:**

- Natychmiastowe usunięcie toasta
- Animacja znikania (transition)

---

### Interakcja 4: Automatyczne znikanie toasta

**Akcja użytkownika:** Brak (automatyczne)

**Ścieżka przepływu:**

1. Toast zostaje dodany przez `toastStore.addToast()`
2. Ustawiony zostaje `setTimeout` na `duration` ms (domyślnie 5000)
3. Po upływie czasu toast jest automatycznie usuwany

**Obsługa:**

- Wbudowana w `toastStore.addToast()`

**Oczekiwany rezultat:**

- Toast znika po 5 sekundach (lub innym czasie)
- Użytkownik może zamknąć wcześniej klikając "✕"

---

### Interakcja 5: Wyświetlanie globalnego loadera

**Akcja użytkownika:** Brak (automatyczne, wywołane przez inny komponent)

**Ścieżka przepływu:**

1. Użytkownik inicjuje operację (np. kliknięcie "Generuj" w `/generate`)
2. Komponent wywołuje `loadingStore.start('Tworzymy...')`
3. `<GlobalLoader />` wyświetla się (fixed, full-screen)
4. UI zostaje zablokowany (pointer-events)
5. Po zakończeniu operacji → `loadingStore.stop()`
6. Loader znika

**Obsługa:**

- Automatyczna (reaktywność Svelte)
- `{#if $loadingStore.isLoading}` w komponencie

**Oczekiwany rezultat:**

- Pełnoekranowy loader blokuje UI
- Wyświetlany tekst "Tworzymy Twoją mroczną historię..."
- Po zakończeniu loader znika
- Timeout: 45 sekund (obsługiwany przez wywołujący kod)

## 9. Warunki i walidacja

### Warunek 1: Wyświetlanie odpowiedniej nawigacji

**Komponent:** `<Navbar />`

**Warunek:**

```typescript
if (session !== null) {
	// Pokaż nawigację dla zalogowanych
} else {
	// Pokaż nawigację dla niezalogowanych
}
```

**Implementacja:**

```svelte
{#if session}
	<!-- Linki dla zalogowanych -->
	<li><a href="/">Moje Historie</a></li>
	<li><a href="/generate">Generuj (+)</a></li>
	<form method="POST" action="?/logout">
		<button>Wyloguj</button>
	</form>
{:else}
	<!-- Linki dla niezalogowanych -->
	<li><a href="/">Strona główna</a></li>
	<li><a href="/login">Zaloguj się</a></li>
	<li><a href="/register">Stwórz konto</a></li>
{/if}
```

**Wpływ na UI:**

- Zmiana zestawu linków w nawigacji
- Pokazanie/ukrycie przycisku wylogowania

---

### Warunek 2: Wyświetlanie globalnego loadera

**Komponent:** `<GlobalLoader />`

**Warunek:**

```typescript
if ($loadingStore.isLoading === true) {
	// Wyświetl loader
}
```

**Implementacja:**

```svelte
{#if $loadingStore.isLoading}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/90">
		<span class="loading loading-spinner loading-lg"></span>
		<p>{$loadingStore.message || 'Ładowanie...'}</p>
	</div>
{/if}
```

**Wpływ na UI:**

- Pełnoekranowy overlay blokujący interakcje
- Wyświetlenie spinnera i komunikatu
- Zablokowanie całego UI (w tym nawigacji)

---

### Warunek 3: Wyświetlanie toastów

**Komponent:** `<ToastContainer />`

**Warunek:**

```typescript
if ($toastStore.length > 0) {
	// Renderuj toasty
}
```

**Implementacja:**

```svelte
<div class="toast toast-top toast-end">
	{#each $toastStore as toast (toast.id)}
		<div class="alert alert-{toast.type}">
			<span>{toast.message}</span>
			<button on:click={() => removeToast(toast.id)}>✕</button>
		</div>
	{/each}
</div>
```

**Wpływ na UI:**

- Wyświetlenie listy toastów w prawym górnym rogu
- Automatyczne usuwanie po określonym czasie
- Możliwość ręcznego zamknięcia

---

### Warunek 4: Responsywność nawigacji

**Komponent:** `<Navbar />`

**Warunek:**

```typescript
if (viewport.width < 1024px) {
  // Wyświetl menu mobilne (dropdown)
} else {
  // Wyświetl menu desktop (horizontal)
}
```

**Implementacja:**

```svelte
<!-- Desktop -->
<div class="navbar-center hidden lg:flex">
	<ul class="menu menu-horizontal">
		<!-- linki -->
	</ul>
</div>

<!-- Mobile -->
<div class="navbar-end lg:hidden">
	<div class="dropdown dropdown-end">
		<!-- hamburger menu -->
	</div>
</div>
```

**Wpływ na UI:**

- Na desktop: horizontal menu bar
- Na mobile: hamburger icon z dropdown
- Breakpoint: 1024px (Tailwind `lg:`)

## 10. Obsługa błędów

### Scenariusz 1: Błąd ładowania sesji

**Przyczyna:**

- Błąd połączenia z Supabase
- Nieprawidłowa konfiguracja
- Token wygasł i nie udało się odświeżyć

**Obsługa:**

```typescript
// +layout.server.ts
export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		const session = await locals.getSession();
		return { session };
	} catch (error) {
		console.error('Session loading error:', error);
		return { session: null }; // Traktuj jako niezalogowanego
	}
};
```

**Rezultat dla użytkownika:**

- Użytkownik widziany jako niezalogowany
- Nawigacja dla niezalogowanych
- Możliwość ponownego zalogowania

---

### Scenariusz 2: Błąd wylogowania

**Przyczyna:**

- Błąd połączenia z Supabase
- Sesja już wygasła
- Problem sieciowy

**Obsługa:**

```typescript
// +layout.server.ts
export const actions: Actions = {
	logout: async ({ locals }) => {
		try {
			const { error } = await locals.supabase.auth.signOut();

			if (error) throw error;

			throw redirect(303, '/');
		} catch (error) {
			console.error('Logout error:', error);

			// Opcja 1: Zwróć błąd do formularza
			return fail(500, {
				message: 'Nie udało się wylogować. Spróbuj ponownie.'
			});

			// Opcja 2: Wymuś redirect mimo błędu (wyczyść sesję lokalnie)
			// throw redirect(303, '/');
		}
	}
};
```

**Rezultat dla użytkownika:**

- Toast z komunikatem błędu
- Użytkownik pozostaje zalogowany
- Możliwość ponownej próby

---

### Scenariusz 3: Timeout generowania AI (45 sekund)

**Przyczyna:**

- Zbyt długi czas odpowiedzi API OpenAI
- Problem sieciowy
- Przeciążenie serwera

**Obsługa:**

```typescript
// W komponencie wywołującym generowanie (np. /generate)
async function generateStory() {
  loadingStore.start('Tworzymy Twoją mroczną historię...');

  // Timeout promise
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('timeout')), 45000);
  });

  try {
    const response = await Promise.race([
      fetch('/api/stories/generate', { method: 'POST', body: ... }),
      timeoutPromise
    ]);

    // obsługa sukcesu...
  } catch (error) {
    if (error.message === 'timeout') {
      toastStore.addToast(
        'Generowanie przekroczyło limit czasu (45s). Spróbuj ponownie.',
        'error'
      );
    } else {
      toastStore.addToast(
        'Wystąpił błąd podczas generowania historii.',
        'error'
      );
    }
  } finally {
    loadingStore.stop();
  }
}
```

**Rezultat dla użytkownika:**

- Loader znika po 45 sekundach
- Toast z komunikatem o timeout
- Możliwość ponownej próby

---

### Scenariusz 4: Błąd API (4xx, 5xx)

**Przyczyna:**

- Błąd serwera (500)
- Błąd walidacji (400)
- Brak autoryzacji (401)
- Brak dostępu (403)

**Obsługa:**

```typescript
// W komponencie wywołującym API
async function callApi() {
  try {
    const response = await fetch('/api/endpoint', { ... });

    if (!response.ok) {
      const errorData: ErrorDTO = await response.json();

      // Mapowanie błędów na komunikaty po polsku
      const errorMessages: Record<ErrorCode, string> = {
        'VALIDATION_ERROR': 'Nieprawidłowe dane. Sprawdź formularz.',
        'AUTHENTICATION_ERROR': 'Musisz być zalogowany.',
        'AUTHORIZATION_ERROR': 'Nie masz uprawnień do tej operacji.',
        'NOT_FOUND': 'Nie znaleziono zasobu.',
        'TIMEOUT_ERROR': 'Przekroczono limit czasu.',
        'EXTERNAL_API_ERROR': 'Błąd usługi AI. Spróbuj ponownie.',
        'INTERNAL_ERROR': 'Wystąpił błąd serwera.'
      };

      const message = errorMessages[errorData.error.code] || errorData.error.message;
      toastStore.addToast(message, 'error');

      return;
    }

    // sukces...
  } catch (error) {
    toastStore.addToast(
      'Błąd połączenia. Sprawdź internet i spróbuj ponownie.',
      'error'
    );
  }
}
```

**Rezultat dla użytkownika:**

- Toast z odpowiednim komunikatem błędu
- Możliwość ponownej próby
- Dane użytkownika nie zostają utracone (formularz zachowuje wartości)

---

### Scenariusz 5: Brak połączenia z internetem

**Przyczyna:**

- Użytkownik offline
- Problem z siecią

**Obsługa:**

```typescript
// Opcjonalnie: detekcja statusu online/offline
import { browser } from '$app/environment';

if (browser) {
	window.addEventListener('offline', () => {
		toastStore.addToast('Brak połączenia z internetem', 'warning');
	});

	window.addEventListener('online', () => {
		toastStore.addToast('Połączenie zostało przywrócone', 'success');
	});
}
```

**Rezultat dla użytkownika:**

- Toast informujący o braku połączenia
- Toast po przywróceniu połączenia
- Możliwość ponownej próby operacji

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

**Zadania:**

1. Utworzenie głównego layoutu: `src/routes/+layout.svelte`
2. Utworzenie server layout: `src/routes/+layout.server.ts`
3. Utworzenie folderu na store'y: `src/lib/stores/`
4. Utworzenie folderu na komponenty: `src/lib/components/`

**Struktura katalogów:**

```
src/
├── routes/
│   ├── +layout.svelte
│   └── +layout.server.ts
├── lib/
│   ├── stores/
│   │   ├── loading.ts
│   │   └── toasts.ts
│   └── components/
│       ├── Navbar.svelte
│       ├── GlobalLoader.svelte
│       └── ToastContainer.svelte
```

---

### Krok 2: Implementacja globalnych store'ów

**2.1. LoadingStore (`src/lib/stores/loading.ts`)**

```typescript
import { writable } from 'svelte/store';

interface LoadingState {
	isLoading: boolean;
	message?: string;
}

function createLoadingStore() {
	const { subscribe, set } = writable<LoadingState>({
		isLoading: false,
		message: undefined
	});

	return {
		subscribe,
		start: (message?: string) => set({ isLoading: true, message }),
		stop: () => set({ isLoading: false, message: undefined })
	};
}

export const loadingStore = createLoadingStore();
```

**2.2. ToastStore (`src/lib/stores/toasts.ts`)**

```typescript
import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'error' | 'success' | 'info' | 'warning';
	duration?: number;
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);
	const timeouts = new Map<string, number>();

	return {
		subscribe,

		addToast: (message: string, type: Toast['type'] = 'info', duration = 5000) => {
			const id = crypto.randomUUID();
			const toast: Toast = { id, message, type, duration };

			update((toasts) => [...toasts, toast]);

			const timeoutId = setTimeout(() => {
				removeToast(id);
			}, duration) as unknown as number;

			timeouts.set(id, timeoutId);
		},

		removeToast: (id: string) => {
			const timeoutId = timeouts.get(id);
			if (timeoutId) {
				clearTimeout(timeoutId);
				timeouts.delete(id);
			}
			update((toasts) => toasts.filter((t) => t.id !== id));
		}
	};
}

export const toastStore = createToastStore();
```

---

### Krok 3: Implementacja komponentu `<Navbar />`

**Plik:** `src/lib/components/Navbar.svelte`

```svelte
<script lang="ts">
	import type { Session } from '@supabase/supabase-js';

	export let session: Session | null;
</script>

<nav class="navbar bg-base-100 shadow-lg">
	<!-- Logo -->
	<div class="navbar-start">
		<a href="/" class="btn btn-ghost text-xl font-bold"> MroczneHistorie </a>
	</div>

	<!-- Desktop Menu -->
	<div class="navbar-center hidden lg:flex">
		<ul class="menu menu-horizontal px-1">
			{#if session}
				<li><a href="/">Moje Historie</a></li>
				<li><a href="/generate">Generuj (+)</a></li>
			{:else}
				<li><a href="/">Strona główna</a></li>
				<li><a href="/login">Zaloguj się</a></li>
				<li><a href="/register">Stwórz konto</a></li>
			{/if}
		</ul>
	</div>

	<!-- Desktop Logout -->
	{#if session}
		<div class="navbar-end hidden lg:flex">
			<form method="POST" action="?/logout">
				<button type="submit" class="btn btn-ghost"> Wyloguj </button>
			</form>
		</div>
	{/if}

	<!-- Mobile Menu -->
	<div class="navbar-end lg:hidden">
		<div class="dropdown dropdown-end">
			<label tabindex="0" class="btn btn-ghost">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</label>
			<ul
				tabindex="0"
				class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
			>
				{#if session}
					<li><a href="/">Moje Historie</a></li>
					<li><a href="/generate">Generuj (+)</a></li>
					<li>
						<form method="POST" action="?/logout">
							<button type="submit" class="w-full text-left"> Wyloguj </button>
						</form>
					</li>
				{:else}
					<li><a href="/">Strona główna</a></li>
					<li><a href="/login">Zaloguj się</a></li>
					<li><a href="/register">Stwórz konto</a></li>
				{/if}
			</ul>
		</div>
	</div>
</nav>
```

---

### Krok 4: Implementacja komponentu `<GlobalLoader />`

**Plik:** `src/lib/components/GlobalLoader.svelte`

```svelte
<script lang="ts">
	import { loadingStore } from '$lib/stores/loading';
</script>

{#if $loadingStore.isLoading}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-base-300/90 backdrop-blur-sm"
		role="alert"
		aria-live="polite"
		aria-busy="true"
	>
		<div class="flex flex-col items-center gap-4 p-8">
			<span class="loading loading-spinner loading-lg text-primary"></span>
			<p class="text-lg font-medium text-base-content text-center">
				{$loadingStore.message || 'Ładowanie...'}
			</p>
		</div>
	</div>
{/if}
```

---

### Krok 5: Implementacja komponentu `<ToastContainer />`

**Plik:** `src/lib/components/ToastContainer.svelte`

```svelte
<script lang="ts">
	import { toastStore } from '$lib/stores/toasts';
	import { fly } from 'svelte/transition';
</script>

<div class="toast toast-top toast-end z-50">
	{#each $toastStore as toast (toast.id)}
		<div
			class="alert alert-{toast.type} shadow-lg"
			transition:fly={{ y: -20, duration: 300 }}
			role="alert"
		>
			<div class="flex items-center justify-between w-full gap-2">
				<span class="flex-1">{toast.message}</span>
				<button
					class="btn btn-sm btn-ghost btn-square"
					on:click={() => toastStore.removeToast(toast.id)}
					aria-label="Zamknij powiadomienie"
				>
					✕
				</button>
			</div>
		</div>
	{/each}
</div>
```

---

### Krok 6: Implementacja `+layout.server.ts`

**Plik:** `src/routes/+layout.server.ts`

```typescript
import type { LayoutServerLoad } from './$types';
import type { Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	try {
		const session = await locals.getSession();
		return {
			session
		};
	} catch (error) {
		console.error('Error loading session:', error);
		return {
			session: null
		};
	}
};

export const actions: Actions = {
	logout: async ({ locals }) => {
		try {
			const { error } = await locals.supabase.auth.signOut();

			if (error) {
				console.error('Logout error:', error);
				return fail(500, {
					message: 'Nie udało się wylogować. Spróbuj ponownie.'
				});
			}

			throw redirect(303, '/');
		} catch (error) {
			if (error instanceof Error && error.message.includes('redirect')) {
				throw error; // Re-throw redirect
			}

			console.error('Unexpected logout error:', error);
			return fail(500, {
				message: 'Wystąpił nieoczekiwany błąd.'
			});
		}
	}
};
```

---

### Krok 7: Implementacja `+layout.svelte`

**Plik:** `src/routes/+layout.svelte`

```svelte
<script lang="ts">
	import type { LayoutData } from './$types';
	import Navbar from '$lib/components/Navbar.svelte';
	import GlobalLoader from '$lib/components/GlobalLoader.svelte';
	import ToastContainer from '$lib/components/ToastContainer.svelte';

	export let data: LayoutData;
</script>

<div class="min-h-screen bg-base-300" data-theme="dark">
	<Navbar session={data.session} />

	<main class="container mx-auto px-4 py-8">
		<slot />
	</main>

	<GlobalLoader />
	<ToastContainer />
</div>
```

---

### Krok 8: Konfiguracja Dark Mode

**8.1. Tailwind Configuration (`tailwind.config.js`)**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: [require('daisyui')],
	daisyui: {
		themes: ['dark'], // Tylko dark mode
		darkTheme: 'dark'
	}
};
```

**8.2. HTML Configuration (`src/app.html`)**

```html
<!DOCTYPE html>
<html lang="pl" data-theme="dark">
	<head>
		<meta charset="utf-8" />
		<link rel="icon" href="%sveltekit.assets%/favicon.png" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		%sveltekit.head%
	</head>
	<body data-sveltekit-preload-data="hover">
		<div style="display: contents">%sveltekit.body%</div>
	</body>
</html>
```

---

### Krok 9: Konfiguracja Supabase (hooks.server.ts)

**Plik:** `src/hooks.server.ts`

```typescript
import { createServerClient } from '@supabase/ssr';
import { type Handle } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, options) => {
				event.cookies.set(key, value, { ...options, path: '/' });
			},
			remove: (key, options) => {
				event.cookies.delete(key, { ...options, path: '/' });
			}
		}
	});

	event.locals.getSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		return session;
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range';
		}
	});
};
```

**Plik typów:** `src/app.d.ts`

```typescript
import type { SupabaseClient, Session } from '@supabase/supabase-js';
import type { Database } from '$lib/db/database.types';

declare global {
	namespace App {
		interface Locals {
			supabase: SupabaseClient<Database>;
			getSession(): Promise<Session | null>;
		}
		interface PageData {
			session: Session | null;
		}
	}
}

export {};
```

---

### Krok 10: Testowanie

**10.1. Test ładowania layoutu:**

- Sprawdź czy layout renderuje się poprawnie
- Sprawdź czy sesja jest ładowana i przekazywana do komponentów
- Sprawdź czy dark mode jest wymuszony

**10.2. Test nawigacji:**

- Zaloguj się i sprawdź czy widoczne są linki dla zalogowanych
- Wyloguj się i sprawdź czy widoczne są linki dla niezalogowanych
- Sprawdź responsywność (desktop vs mobile)

**10.3. Test GlobalLoader:**

```typescript
// Przykład użycia w innym komponencie
import { loadingStore } from '$lib/stores/loading';

loadingStore.start('Tworzymy Twoją mroczną historię...');
setTimeout(() => {
	loadingStore.stop();
}, 3000);
```

**10.4. Test ToastContainer:**

```typescript
// Przykład użycia
import { toastStore } from '$lib/stores/toasts';

toastStore.addToast('To jest toast błędu', 'error');
toastStore.addToast('To jest toast sukcesu', 'success');
```

**10.5. Test wylogowania:**

- Zaloguj się
- Kliknij "Wyloguj"
- Sprawdź czy następuje redirect na `/`
- Sprawdź czy sesja została wyczyszczona
- Sprawdź czy nawigacja zmieniła się na wersję dla niezalogowanych

---

### Krok 11: Optymalizacja i finalizacja

**11.1. Accessibility:**

- Dodaj `aria-label` do przycisków
- Dodaj `role="alert"` do toastów i loadera
- Sprawdź nawigację klawiaturą
- Sprawdź kontrast kolorów (WCAG AA)

**11.2. Performance:**

- Sprawdź czy store'y nie powodują memory leaks
- Sprawdź czy timeouty są prawidłowo czyszczone
- Sprawdź czy komponenty nie re-renderują się niepotrzebnie

**11.3. Error handling:**

- Przetestuj wszystkie scenariusze błędów
- Upewnij się że komunikaty są po polsku
- Upewnij się że błędy nie crashują aplikacji

**11.4. Documentation:**

- Dodaj komentarze JSDoc do store'ów
- Dodaj komentarze do nietypowych rozwiązań
- Zaktualizuj README jeśli potrzebne

---

### Krok 12: Deploy i monitoring

**12.1. Pre-deployment checklist:**

- [ ] Wszystkie testy przechodzą
- [ ] Dark mode działa poprawnie
- [ ] Nawigacja działa na desktop i mobile
- [ ] Loader blokuje UI podczas operacji
- [ ] Toasty pojawiają się i znikają poprawnie
- [ ] Wylogowanie działa prawidłowo
- [ ] Brak błędów w konsoli
- [ ] Accessibility jest na akceptowalnym poziomie

**12.2. Environment variables:**

- Upewnij się że `PUBLIC_SUPABASE_URL` jest ustawiony
- Upewnij się że `PUBLIC_SUPABASE_ANON_KEY` jest ustawiony
- Sprawdź konfigurację na produkcji (Cloudflare Pages)

**12.3. Monitoring:**

- Monitoruj błędy związane z ładowaniem sesji
- Monitoruj timeout'y podczas generowania AI
- Monitoruj błędy wylogowania
- Sprawdzaj logi w Supabase Dashboard

---

## Podsumowanie

Ten plan implementacji obejmuje wszystkie aspekty Globalnego Layoutu aplikacji MroczneHistorie. Kluczowe punkty:

1. **Layout jest fundamentem** - wszystkie inne widoki będą z niego korzystać
2. **Store'y są globalne** - `loadingStore` i `toastStore` będą używane przez wszystkie komponenty aplikacji
3. **Nawigacja jest warunkowa** - zależna od stanu sesji użytkownika
4. **Dark mode jest wymuszony** - zgodnie z wymaganiami PRD
5. **Mobile-first** - responsywny design z Tailwind i DaisyUI
6. **Bezpieczeństwo** - sesja ładowana server-side, RLS w Supabase
7. **UX** - loader blokuje UI, toasty informują o błędach, płynne przejścia

Implementacja powinna zająć około 4-6 godzin dla doświadczonego programisty frontend.
