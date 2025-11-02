# Plan implementacji widoku Strona Główna / Lista Historii

## 1. Przegląd

Widok Strona Główna (`/`) pełni podwójną rolę w aplikacji MroczneHistorie:

1. **Dla użytkowników niezalogowanych** - działa jako landing page prezentujący aplikację i zachęcający do rejestracji
2. **Dla użytkowników zalogowanych** - stanowi główny dashboard wyświetlający listę zapisanych mrocznych historii

Jest to kluczowy widok w aplikacji, ponieważ:

- Stanowi pierwszy punkt kontaktu z aplikacją dla nowych użytkowników
- Jest głównym hubem dla zalogowanych użytkowników, gdzie zarządzają swoimi historiami
- Implementuje wszystkie funkcje CRUD dla historii (tworzenie przez przekierowanie, odczyt, edycja przez przekierowanie, usuwanie)
- Zawiera funkcję losowania historii dla graczy potrzebujących szybkiego wyboru

Widok wykorzystuje warunkowe renderowanie w zależności od stanu uwierzytelnienia i dostępności danych, oferując trzy różne scenariusze:

- **Landing Page** - dla niezalogowanych
- **Empty State** - dla zalogowanych bez historii
- **Story List** - dla zalogowanych z historiami

## 2. Routing widoku

**Ścieżka główna:** `/`

**Pliki implementacji:**

- `src/routes/+page.svelte` - główny komponent widoku
- `src/routes/+page.server.ts` - server-side load function

**Dostępność:**

- Widok jest publicznie dostępny (nie wymaga uwierzytelnienia)
- Dla niezalogowanych: wyświetla landing page
- Dla zalogowanych: wyświetla listę historii lub empty state

**Przekierowania z tego widoku:**

- `/login` - logowanie (dla niezalogowanych)
- `/register` - rejestracja (dla niezalogowanych)
- `/generate` - generator historii (z empty state lub nawigacji)
- `/stories/[id]` - szczegóły/tryb gry (kliknięcie na pytanie lub losowanie)
- `/stories/[id]/edit` - edycja historii (kliknięcie ikony edycji)

**Przekierowania na ten widok:**

- Z `/register` po udanej rejestracji (PRD 1.5)
- Z `/generate` po zapisaniu historii
- Z `/stories/[id]/edit` po zapisaniu edycji

## 3. Struktura komponentów

```
+page.svelte (główny kontener widoku)
│
├── {#if !data.session}
│   │
│   └── <LandingPage />
│       ├── <div class="hero"> (DaisyUI Hero)
│       │   ├── <h1> "Zostań Mistrzem Mrocznych Historii."
│       │   ├── <p> Opis aplikacji
│       │   └── <div class="hero-actions">
│       │       ├── <a href="/login"> Zaloguj się
│       │       └── <a href="/register"> Stwórz konto
│       │
│       └── [Opcjonalnie] Sekcja z features/benefits
│
└── {#if data.session}
    │
    ├── {#if data.stories.length === 0}
    │   │
    │   └── <EmptyState />
    │       ├── <div class="hero">
    │       │   ├── Ikona lub ilustracja (pusta księga)
    │       │   ├── <h2> "Twoja księga mrocznych historii jest jeszcze pusta..."
    │       │   ├── <p> Zachęta do generowania
    │       │   └── <a href="/generate"> Wygeneruj nową historię
    │       │
    │       └── [Opcjonalnie] Krótka instrukcja
    │
    └── {#if data.stories.length > 0}
        │
        ├── <div class="page-header">
        │   ├── <h1> "Moje Mroczne Historie"
        │   └── <button on:click={handleRandomStory} disabled={isRandomizing}>
        │       └── "Losuj Historię"
        │
        ├── <StoryList stories={data.stories} on:delete={openDeleteModal}>
        │   │
        │   └── <div class="stories-grid">
        │       │
        │       └── {#each stories as story (story.id)}
        │           │
        │           └── <StoryCard story={story} on:delete />
        │               │
        │               ├── <a href="/stories/{story.id}" class="card-question">
        │               │   └── {story.question}
        │               │
        │               ├── <div class="card-metadata">
        │               │   ├── <span class="badge"> T: {story.difficulty}
        │               │   └── <span class="badge"> M: {story.darkness}
        │               │
        │               └── <div class="card-actions">
        │                   ├── <a href="/stories/{story.id}/edit" class="btn-icon">
        │                   │   └── Ikona edycji (✏️ lub SVG)
        │                   │
        │                   └── <button on:click={() => dispatch('delete', story.id)}>
        │                       └── Ikona usuwania (🗑️ lub SVG)
        │
        └── <ModalConfirmDelete
                bind:isOpen={deleteState.modalOpen}
                storyId={deleteState.storyId}
                isDeleting={deleteState.isDeleting}
                on:confirm={confirmDelete}
                on:cancel={cancelDelete}
            >
            │
            ├── <div class="modal-backdrop">
            │   └── <div class="modal-box">
            │       ├── <h3> "Czy na pewno chcesz usunąć?"
            │       ├── <p> "Ta operacja jest nieodwracalna."
            │       └── <div class="modal-actions">
            │           ├── <button on:click={onCancel}> Anuluj
            │           └── <button on:click={onConfirm} disabled={isDeleting}>
            │               └── {isDeleting ? 'Usuwanie...' : 'Usuń'}
```

## 4. Szczegóły komponentów

### Komponent: `+page.svelte` (główny plik widoku)

**Opis komponentu:**
Główny kontener widoku odpowiedzialny za warunkowe renderowanie trzech różnych stanów interfejsu w zależności od stanu uwierzytelnienia i dostępności danych. Zarządza logiką usuwania historii, losowania i obsługą stanów ładowania dla tych operacji.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { toastStore } from '$lib/stores/toasts';
	import { loadingStore } from '$lib/stores/loading';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import StoryList from '$lib/components/StoryList.svelte';
	import ModalConfirmDelete from '$lib/components/ModalConfirmDelete.svelte';
	import type { StoryDTO } from '../types';

	export let data: PageData;

	// Stan lokalny dla usuwania
	let deleteState = $state({
		modalOpen: false,
		storyId: null as string | null,
		isDeleting: false
	});

	// Stan dla losowania
	let isRandomizing = $state(false);

	// Funkcje obsługi zdarzeń...
</script>

<div class="container mx-auto px-4 py-8">
	{#if !data.session}
		<LandingPage />
	{:else if data.stories.length === 0}
		<EmptyState />
	{:else}
		<!-- Header z przyciskiem Losuj -->
		<div class="flex justify-between items-center mb-8">
			<h1 class="text-3xl font-bold">Moje Mroczne Historie</h1>
			<button
				class="btn btn-primary"
				disabled={isRandomizing || data.stories.length === 0}
				on:click={handleRandomStory}
			>
				{isRandomizing ? 'Losuję...' : 'Losuj Historię'}
			</button>
		</div>

		<StoryList stories={data.stories} on:delete={openDeleteModal} />
	{/if}
</div>

<ModalConfirmDelete
	bind:isOpen={deleteState.modalOpen}
	storyId={deleteState.storyId}
	isDeleting={deleteState.isDeleting}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>
```

**Obsługiwane zdarzenia:**

1. `openDeleteModal(id: string)` - Otwiera modal potwierdzenia usunięcia z podanym ID historii
2. `cancelDelete()` - Zamyka modal i resetuje stan usuwania
3. `confirmDelete()` - Wykonuje DELETE API call, zamyka modal i odświeża listę
4. `handleRandomStory()` - Wywołuje GET /api/stories/random i przekierowuje do wylosowanej historii

**Warunki walidacji:**

- Sprawdzenie czy `data.session` istnieje przed wyświetleniem zalogowanych widoków
- Sprawdzenie czy `data.stories.length > 0` przed wyświetleniem listy
- Walidacja `deleteState.storyId !== null` przed wywołaniem DELETE
- Walidacja UUID przed wywołaniem API (opcjonalnie, jako dodatkowe zabezpieczenie)

**Typy wymagane przez komponent:**

```typescript
import type { PageData } from './$types';
import type { StoryDTO } from '../types';

interface DeleteState {
	modalOpen: boolean;
	storyId: string | null;
	isDeleting: boolean;
}
```

**Propsy:**

```typescript
export let data: PageData; // Automatycznie dostarczane przez SvelteKit
```

---

### Komponent: `<LandingPage />`

**Opis komponentu:**
Komponent prezentacyjny wyświetlany dla użytkowników niezalogowanych. Wykorzystuje DaisyUI Hero component do stworzenia atrakcyjnej strony lądowania z opisem aplikacji i przyciskami call-to-action prowadzącymi do logowania i rejestracji.

**Główne elementy HTML i komponenty:**

```svelte
<div class="hero min-h-[80vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-2xl">
			<h1 class="text-5xl font-bold mb-6">Zostań Mistrzem Mrocznych Historii.</h1>

			<p class="text-lg mb-8 opacity-80">
				Twórz fascynujące zagadki w stylu "Czarnych Historii" z pomocą sztucznej inteligencji.
				Generuj, zapisuj i prowadź niezapomniane sesje gry ze znajomymi.
			</p>

			<div class="flex gap-4 justify-center flex-wrap">
				<a href="/login" class="btn btn-primary btn-lg"> Zaloguj się </a>
				<a href="/register" class="btn btn-outline btn-lg"> Stwórz konto </a>
			</div>
		</div>
	</div>
</div>
```

**Obsługiwane zdarzenia:**

- Brak (używa natywnych linków `<a>`)

**Warunki walidacji:**

- Brak (komponent jest czysto prezentacyjny)

**Typy wymagane przez komponent:**

- Brak (komponent nie przyjmuje propsów)

**Propsy:**

```typescript
// Brak propsów
```

---

### Komponent: `<EmptyState />`

**Opis komponentu:**
Komponent wyświetlany dla zalogowanych użytkowników, którzy nie mają jeszcze żadnych zapisanych historii. Zachęca do pierwszego użycia aplikacji poprzez wygenerowanie nowej historii. Implementuje wzorzec "empty state" zgodnie z najlepszymi praktykami UX.

**Główne elementy HTML i komponenty:**

```svelte
<div class="hero min-h-[60vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-xl">
			<!-- Ikona lub ilustracja -->
			<div class="text-6xl mb-4 opacity-50">📖</div>

			<h2 class="text-3xl font-bold mb-4">Twoja księga mrocznych historii jest jeszcze pusta...</h2>

			<p class="text-lg mb-6 opacity-80">
				Zacznij swoją przygodę z tworzeniem mrocznych zagadek. Wygeneruj pierwszą historię i zbuduj
				swoją kolekcję!
			</p>

			<a href="/generate" class="btn btn-primary btn-lg"> Wygeneruj nową historię </a>
		</div>
	</div>
</div>
```

**Obsługiwane zdarzenia:**

- Brak (używa natywnego linku `<a>`)

**Warunki walidacji:**

- Brak (komponent jest czysto prezentacyjny)

**Typy wymagane przez komponent:**

- Brak (komponent nie przyjmuje propsów)

**Propsy:**

```typescript
// Brak propsów
```

---

### Komponent: `<StoryList />`

**Opis komponentu:**
Kontener odpowiedzialny za renderowanie listy kart historii w responsywnym layoutcie grid. Przekazuje zdarzenie usuwania z dzieci (`<StoryCard />`) do rodzica (`+page.svelte`). Zapewnia spójny spacing i responsywność dla różnych rozmiarów ekranów.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		stories: StoryDTO[];
	}

	let { stories }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string; // story ID
	}>();

	function handleDelete(event: CustomEvent<string>) {
		dispatch('delete', event.detail);
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{#each stories as story (story.id)}
		<StoryCard {story} on:delete={handleDelete} />
	{/each}
</div>

{#if stories.length === 0}
	<div class="text-center py-12 opacity-60">
		<p>Brak historii do wyświetlenia</p>
	</div>
{/if}
```

**Obsługiwane zdarzenia:**

- `on:delete` - Propaguje zdarzenie usuwania z `<StoryCard />` do `+page.svelte`
- Parametr: `string` (ID historii do usunięcia)

**Warunki walidacji:**

- Sprawdzenie czy `stories` jest niepustą tablicą przed renderowaniem grid
- Fallback na komunikat gdy tablica jest pusta (dodatkowe zabezpieczenie)

**Typy wymagane przez komponent:**

```typescript
import type { StoryDTO } from '../../types';

interface StoryListProps {
	stories: StoryDTO[];
}
```

**Propsy:**

```typescript
let { stories }: StoryListProps = $props();
```

---

### Komponent: `<StoryCard />`

**Opis komponentu:**
Karta reprezentująca pojedynczą historię na liście. Zawiera pytanie (jako link do trybu gry), metadata badges (trudność i mroczność) oraz akcje (edycja i usuwanie). Implementuje PRD 3.2 zawierający wszystkie wymagane elementy karty historii.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		story: StoryDTO;
	}

	let { story }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string;
	}>();

	function handleDeleteClick() {
		dispatch('delete', story.id);
	}

	// Etykiety dla difficulty i darkness
	const difficultyLabels = {
		1: 'Łatwa',
		2: 'Średnia',
		3: 'Trudna'
	};

	const darknessLabels = {
		1: 'Tajemnicza',
		2: 'Niepokojąca',
		3: 'Brutalna'
	};
</script>

<div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
	<div class="card-body">
		<!-- Pytanie jako link -->
		<a
			href="/stories/{story.id}"
			class="card-title text-lg hover:text-primary transition-colors cursor-pointer line-clamp-3"
		>
			{story.question}
		</a>

		<!-- Metadata badges -->
		<div class="flex gap-2 mt-3">
			<div class="badge badge-outline" title="Trudność">
				T: {story.difficulty} - {difficultyLabels[story.difficulty]}
			</div>
			<div class="badge badge-outline" title="Mroczność">
				M: {story.darkness} - {darknessLabels[story.darkness]}
			</div>
		</div>

		<!-- Temat (subject) -->
		<p class="text-sm opacity-60 mt-2">
			Temat: {story.subject}
		</p>

		<!-- Akcje -->
		<div class="card-actions justify-end mt-4">
			<a href="/stories/{story.id}/edit" class="btn btn-sm btn-ghost" title="Edytuj historię">
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
				Edytuj
			</a>

			<button
				class="btn btn-sm btn-ghost text-error"
				on:click={handleDeleteClick}
				title="Usuń historię"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Usuń
			</button>
		</div>

		<!-- Data utworzenia (opcjonalnie) -->
		<div class="text-xs opacity-40 mt-2">
			Utworzono: {new Date(story.created_at).toLocaleDateString('pl-PL')}
		</div>
	</div>
</div>
```

**Obsługiwane zdarzenia:**

1. `on:delete` - Emitowane gdy użytkownik kliknie przycisk "Usuń"
   - Parametr: `string` (story.id)
2. Nawigacja przez linki (natywne `<a>` - brak custom event)

**Warunki walidacji:**

- Sprawdzenie czy `story.id` istnieje przed renderowaniem linków
- Sprawdzenie czy `story.difficulty` i `story.darkness` są w zakresie 1-3
- Fallback dla brakujących labels (opcjonalnie)

**Typy wymagane przez komponent:**

```typescript
import type { StoryDTO } from '../../types';

interface StoryCardProps {
	story: StoryDTO;
}
```

**Propsy:**

```typescript
let { story }: StoryCardProps = $props();
```

---

### Komponent: `<ModalConfirmDelete />`

**Opis komponentu:**
Modal potwierdzenia usuwania historii wykorzystujący DaisyUI Modal component. Zapewnia bezpieczne usuwanie poprzez wymuszenie dodatkowego potwierdzenia od użytkownika (PRD 3.7). Wyświetla stan ładowania podczas operacji DELETE i blokuje interakcję podczas przetwarzania.

**Główne elementy HTML i komponenty:**

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		isOpen: boolean;
		storyId: string | null;
		isDeleting: boolean;
	}

	let { isOpen = $bindable(false), storyId, isDeleting }: Props = $props();

	const dispatch = createEventDispatcher<{
		confirm: void;
		cancel: void;
	}>();

	function handleConfirm() {
		if (!isDeleting && storyId) {
			dispatch('confirm');
		}
	}

	function handleCancel() {
		if (!isDeleting) {
			dispatch('cancel');
		}
	}

	// Zamknięcie modalu przy kliknięciu tła (tylko gdy nie trwa usuwanie)
	function handleBackdropClick() {
		if (!isDeleting) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Czy na pewno chcesz usunąć tę historię?</h3>

			<p class="py-4 opacity-80">
				Ta operacja jest <strong>nieodwracalna</strong>. Historia zostanie trwale usunięta z twojej
				kolekcji.
			</p>

			<div class="modal-action">
				<button class="btn btn-ghost" on:click={handleCancel} disabled={isDeleting}>
					Anuluj
				</button>

				<button class="btn btn-error" on:click={handleConfirm} disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner loading-sm"></span>
						Usuwanie...
					{:else}
						Usuń historię
					{/if}
				</button>
			</div>
		</div>

		<div class="modal-backdrop" on:click={handleBackdropClick}></div>
	</div>
{/if}
```

**Obsługiwane zdarzenia:**

1. `on:confirm` - Emitowane gdy użytkownik potwierdzi usunięcie
2. `on:cancel` - Emitowane gdy użytkownik anuluje lub kliknie tło
3. `handleBackdropClick()` - Zamyka modal przy kliknięciu tła (jeśli nie trwa usuwanie)

**Warunki walidacji:**

- `isOpen === true` - modal jest widoczny
- `storyId !== null` - przed wywołaniem confirm
- `isDeleting === false` - przyciski są aktywne
- Blokada interakcji podczas `isDeleting === true`

**Typy wymagane przez komponent:**

```typescript
interface ModalConfirmDeleteProps {
	isOpen: boolean;
	storyId: string | null;
	isDeleting: boolean;
}
```

**Propsy:**

```typescript
let { isOpen = $bindable(false), storyId, isDeleting }: ModalConfirmDeleteProps = $props();
```

---

### Plik: `+page.server.ts`

**Opis:**
Server-side load function odpowiedzialna za pobieranie listy historii użytkownika z API oraz przekazanie stanu sesji. Wykonuje się przed renderowaniem strony, zapewniając dostępność danych podczas SSR.

**Load function:**

```typescript
import type { PageServerLoad } from './$types';
import type { ListStoriesDTO, StoryDTO } from '../types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// 1. Sprawdzenie sesji (dostępne z +layout.server.ts)
	if (!locals.user) {
		// Użytkownik niezalogowany - zwróć pustą listę
		return {
			stories: [] as StoryDTO[],
			total: 0
		};
	}

	// 2. Pobierz historie użytkownika
	try {
		const response = await fetch('/api/stories?limit=100&offset=0');

		if (!response.ok) {
			console.error('Failed to fetch stories', {
				status: response.status,
				statusText: response.statusText,
				userId: locals.user.id
			});

			// Zwróć pustą listę w przypadku błędu
			// Toast będzie wyświetlony na poziomie klienta
			return {
				stories: [] as StoryDTO[],
				total: 0,
				error: 'Nie udało się pobrać historii'
			};
		}

		const data: ListStoriesDTO = await response.json();

		return {
			stories: data.stories,
			total: data.total
		};
	} catch (error) {
		console.error('Error fetching stories', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: locals.user.id
		});

		return {
			stories: [] as StoryDTO[],
			total: 0,
			error: 'Wystąpił błąd podczas ładowania historii'
		};
	}
};
```

## 5. Typy

### Istniejące typy (z `src/types.ts`)

**StoryDTO** - Kompletny obiekt historii z bazy danych

```typescript
export type StoryDTO = Tables<'stories'>;

// Struktura (z database.types.ts):
interface StoryDTO {
	id: string; // UUID
	user_id: string; // UUID właściciela
	subject: string; // Temat (1-150 znaków)
	difficulty: 1 | 2 | 3; // Poziom trudności
	darkness: 1 | 2 | 3; // Poziom mroczności
	question: string; // Pytanie zagadki
	answer: string; // Odpowiedź/rozwiązanie
	created_at: string; // ISO timestamp
}
```

**ListStoriesDTO** - Odpowiedź z listy historii

```typescript
export interface ListStoriesDTO {
	stories: StoryDTO[]; // Tablica historii
	total: number; // Całkowita liczba zwróconych historii
}
```

**ErrorDTO** - Standardowy format błędów API

```typescript
export interface ErrorDTO {
	error: {
		code: ErrorCode; // Kod błędu (np. 'NOT_FOUND')
		message: string; // Wiadomość po polsku
		field?: string; // Opcjonalne pole dla błędów walidacji
	};
}

export type ErrorCode =
	| 'VALIDATION_ERROR'
	| 'AUTHENTICATION_ERROR'
	| 'AUTHORIZATION_ERROR'
	| 'NOT_FOUND'
	| 'TIMEOUT_ERROR'
	| 'EXTERNAL_API_ERROR'
	| 'INTERNAL_ERROR';
```

### Nowe typy do stworzenia

**PageData** - Dane przekazywane z +page.server.ts do +page.svelte

```typescript
// src/routes/+page.server.ts (typ generowany automatycznie przez SvelteKit)
// Dostępny jako import type { PageData } from './$types';

interface PageData {
	/** Tablica historii użytkownika (pusta dla niezalogowanych) */
	stories: StoryDTO[];

	/** Całkowita liczba historii */
	total: number;

	/** Opcjonalny komunikat błędu */
	error?: string;
}
```

**DeleteState** - Stan lokalny zarządzania usuwaniem w +page.svelte

```typescript
// src/routes/+page.svelte (lokalny typ)
interface DeleteState {
	/** Czy modal jest otwarty */
	modalOpen: boolean;

	/** ID historii do usunięcia (null gdy modal zamknięty) */
	storyId: string | null;

	/** Czy trwa operacja usuwania */
	isDeleting: boolean;
}
```

**StoryListProps** - Props komponentu StoryList

```typescript
// src/lib/components/StoryList.svelte
interface StoryListProps {
	/** Tablica historii do wyświetlenia */
	stories: StoryDTO[];
}
```

**StoryCardProps** - Props komponentu StoryCard

```typescript
// src/lib/components/StoryCard.svelte
interface StoryCardProps {
	/** Pojedyncza historia do wyświetlenia */
	story: StoryDTO;
}
```

**ModalConfirmDeleteProps** - Props komponentu ModalConfirmDelete

```typescript
// src/lib/components/ModalConfirmDelete.svelte
interface ModalConfirmDeleteProps {
	/** Czy modal jest widoczny (bindable) */
	isOpen: boolean;

	/** ID historii do usunięcia */
	storyId: string | null;

	/** Czy trwa operacja usuwania (wyświetla spinner) */
	isDeleting: boolean;
}
```

**RandomStoryResponse** - Odpowiedź z GET /api/stories/random

```typescript
// Typ tożsamy z StoryDTO (pojedyncza historia)
type RandomStoryResponse = StoryDTO;
```

## 6. Zarządzanie stanem

### Stan globalny (Svelte Stores)

Widok korzysta z globalnych store'ów zdefiniowanych w Widoku 1 (Globalny Layout):

**1. toastStore** - Powiadomienia o błędach i sukcesach

```typescript
// Użycie w +page.svelte
import { toastStore } from '$lib/stores/toasts';

// Wyświetlenie błędu
toastStore.addToast('Nie udało się usunąć historii', 'error');

// Wyświetlenie sukcesu
toastStore.addToast('Historia została usunięta', 'success');
```

**2. loadingStore** - Globalny loader (opcjonalnie)

```typescript
// Użycie w +page.svelte (jeśli chcemy globalny loader dla losowania)
import { loadingStore } from '$lib/stores/loading';

// Rozpoczęcie ładowania
loadingStore.start('Losuję historię...');

// Zakończenie
loadingStore.stop();
```

### Stan lokalny (Svelte 5 runes)

**1. deleteState - Zarządzanie modałem usuwania**

```typescript
// src/routes/+page.svelte
let deleteState = $state<DeleteState>({
	modalOpen: false,
	storyId: null,
	isDeleting: false
});

// Funkcje manipulacji
function openDeleteModal(id: string) {
	deleteState = {
		modalOpen: true,
		storyId: id,
		isDeleting: false
	};
}

function cancelDelete() {
	deleteState = {
		modalOpen: false,
		storyId: null,
		isDeleting: false
	};
}

async function confirmDelete() {
	if (!deleteState.storyId) return;

	deleteState.isDeleting = true;

	try {
		// DELETE API call...
	} finally {
		deleteState = {
			modalOpen: false,
			storyId: null,
			isDeleting: false
		};
	}
}
```

**2. isRandomizing - Stan losowania historii**

```typescript
// src/routes/+page.svelte
let isRandomizing = $state(false);

async function handleRandomStory() {
	if (isRandomizing || data.stories.length === 0) return;

	isRandomizing = true;

	try {
		// GET random API call...
	} finally {
		isRandomizing = false;
	}
}
```

### Stan z PageData (SvelteKit)

**Reaktywne dane z load function:**

```typescript
// src/routes/+page.svelte
export let data: PageData;

// Dane automatycznie reactive:
// - data.session (z layout)
// - data.stories
// - data.total

// Odświeżenie danych po mutacji:
import { invalidateAll } from '$app/navigation';
await invalidateAll(); // Ponownie wywołuje load function
```

### Nie używamy custom hooks

W Svelte 5 z runes używamy:

- `$state()` - dla lokalnego reaktywnego stanu
- `$derived()` - dla computed values (jeśli potrzebne)
- `$effect()` - dla side effects (jeśli potrzebne)
- Svelte stores - dla globalnego stanu

Przykład użycia `$derived` (opcjonalnie):

```typescript
let hasStories = $derived(data.stories.length > 0);
let canRandomize = $derived(hasStories && !isRandomizing);
```

## 7. Integracja API

### API 1: Pobieranie listy historii

**Endpoint:** `GET /api/stories`

**Kiedy:** Automatycznie w `+page.server.ts` load function

**Typ żądania:**

```typescript
// Query params
interface ListStoriesQueryParams {
  limit?: number;   // default: 25, max: 100
  offset?: number;  // default: 0
}

// Przykład URL
GET /api/stories?limit=100&offset=0
```

**Typ odpowiedzi:**

```typescript
// Success (200)
interface ListStoriesDTO {
	stories: StoryDTO[];
	total: number;
}

// Error (401, 500)
interface ErrorDTO {
	error: {
		code: 'AUTHENTICATION_ERROR' | 'INTERNAL_ERROR';
		message: string;
	};
}
```

**Implementacja w +page.server.ts:**

```typescript
export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		return { stories: [], total: 0 };
	}

	try {
		const response = await fetch('/api/stories?limit=100');

		if (!response.ok) {
			return {
				stories: [],
				total: 0,
				error: 'Nie udało się pobrać historii'
			};
		}

		const data: ListStoriesDTO = await response.json();
		return {
			stories: data.stories,
			total: data.total
		};
	} catch (error) {
		return {
			stories: [],
			total: 0,
			error: 'Wystąpił błąd podczas ładowania'
		};
	}
};
```

**Obsługa w +page.svelte:**

```typescript
export let data: PageData;

// Wyświetlenie błędu jeśli wystąpił
$effect(() => {
	if (data.error) {
		toastStore.addToast(data.error, 'error');
	}
});
```

---

### API 2: Usuwanie historii

**Endpoint:** `DELETE /api/stories/:id`

**Kiedy:** Po potwierdzeniu w modalu usuwania

**Typ żądania:**

```typescript
// URL param
DELETE /api/stories/{story-uuid}

// Brak body
```

**Typ odpowiedzi:**

```typescript
// Success (204 No Content)
// Brak body

// Error (400, 401, 404, 500)
interface ErrorDTO {
	error: {
		code: ErrorCode;
		message: string;
	};
}
```

**Implementacja w +page.svelte:**

```typescript
async function confirmDelete() {
	if (!deleteState.storyId) return;

	deleteState.isDeleting = true;

	try {
		const response = await fetch(`/api/stories/${deleteState.storyId}`, {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json'
			}
		});

		if (!response.ok) {
			const errorData: ErrorDTO = await response.json();
			toastStore.addToast(errorData.error.message || 'Nie udało się usunąć historii', 'error');
			return;
		}

		// Sukces
		toastStore.addToast('Historia została usunięta', 'success');

		// Zamknij modal
		deleteState = {
			modalOpen: false,
			storyId: null,
			isDeleting: false
		};

		// Odśwież listę
		await invalidateAll();
	} catch (error) {
		console.error('Delete error:', error);
		toastStore.addToast('Błąd połączenia. Sprawdź internet.', 'error');
	} finally {
		deleteState.isDeleting = false;
	}
}
```

---

### API 3: Losowa historia

**Endpoint:** `GET /api/stories/random`

**Kiedy:** Po kliknięciu przycisku "Losuj Historię"

**Typ żądania:**

```typescript
// Brak parametrów
GET / api / stories / random;
```

**Typ odpowiedzi:**

```typescript
// Success (200)
type RandomStoryResponse = StoryDTO;

// Error (401, 404, 500)
interface ErrorDTO {
	error: {
		code: 'AUTHENTICATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR';
		message: string;
	};
}
```

**Implementacja w +page.svelte:**

```typescript
import { goto } from '$app/navigation';

async function handleRandomStory() {
	if (isRandomizing || data.stories.length === 0) return;

	isRandomizing = true;

	try {
		const response = await fetch('/api/stories/random');

		if (!response.ok) {
			if (response.status === 404) {
				toastStore.addToast('Brak historii do wylosowania', 'warning');
				return;
			}

			const errorData: ErrorDTO = await response.json();
			toastStore.addToast(errorData.error.message || 'Nie udało się wylosować historii', 'error');
			return;
		}

		const story: StoryDTO = await response.json();

		// Przekieruj do wylosowanej historii
		await goto(`/stories/${story.id}`);
	} catch (error) {
		console.error('Random story error:', error);
		toastStore.addToast('Błąd połączenia. Sprawdź internet.', 'error');
	} finally {
		isRandomizing = false;
	}
}
```

## 8. Interakcje użytkownika

### Interakcja 1: Kliknięcie "Zaloguj się" (Landing Page)

**Akcja użytkownika:** Kliknięcie przycisku "Zaloguj się"

**Komponent:** `<LandingPage />`

**Ścieżka przepływu:**

1. Użytkownik klika przycisk
2. Natywna nawigacja SvelteKit → `/login`
3. Wyświetlenie widoku logowania

**Implementacja:**

```svelte
<a href="/login" class="btn btn-primary btn-lg"> Zaloguj się </a>
```

**Oczekiwany rezultat:**

- Płynne przejście na stronę logowania
- Brak przeładowania strony (SPA navigation)

---

### Interakcja 2: Kliknięcie "Stwórz konto" (Landing Page)

**Akcja użytkownika:** Kliknięcie przycisku "Stwórz konto"

**Komponent:** `<LandingPage />`

**Ścieżka przepływu:**

1. Użytkownik klika przycisk
2. Natywna nawigacja SvelteKit → `/register`
3. Wyświetlenie widoku rejestracji

**Implementacja:**

```svelte
<a href="/register" class="btn btn-outline btn-lg"> Stwórz konto </a>
```

**Oczekiwany rezultat:**

- Płynne przejście na stronę rejestracji

---

### Interakcja 3: Kliknięcie "Wygeneruj nową historię" (Empty State)

**Akcja użytkownika:** Kliknięcie przycisku w pustym stanie

**Komponent:** `<EmptyState />`

**Ścieżka przepływu:**

1. Użytkownik klika przycisk
2. Nawigacja → `/generate`
3. Wyświetlenie formularza generowania

**Implementacja:**

```svelte
<a href="/generate" class="btn btn-primary btn-lg"> Wygeneruj nową historię </a>
```

**Oczekiwany rezultat:**

- Przejście do generatora historii
- Rozpoczęcie głównej pętli wartości aplikacji

---

### Interakcja 4: Kliknięcie pytania na karcie historii

**Akcja użytkownika:** Kliknięcie tekstu pytania

**Komponent:** `<StoryCard />`

**Ścieżka przepływu:**

1. Użytkownik klika na pytanie
2. Nawigacja → `/stories/{story.id}`
3. Wyświetlenie trybu gry (Widok 6)

**Implementacja:**

```svelte
<a
	href="/stories/{story.id}"
	class="card-title hover:text-primary transition-colors cursor-pointer"
>
	{story.question}
</a>
```

**Oczekiwany rezultat:**

- Przejście do widoku trybu gry
- Wyświetlenie pytania w dużym formacie
- Przycisk "Odkryj odpowiedź"

---

### Interakcja 5: Kliknięcie ikony edycji

**Akcja użytkownika:** Kliknięcie przycisku/ikony "Edytuj"

**Komponent:** `<StoryCard />`

**Ścieżka przepływu:**

1. Użytkownik klika ikonę edycji
2. Nawigacja → `/stories/{story.id}/edit`
3. Wyświetlenie formularza edycji (Widok 7)

**Implementacja:**

```svelte
<a href="/stories/{story.id}/edit" class="btn btn-sm btn-ghost" title="Edytuj historię">
	<svg>...</svg>
	Edytuj
</a>
```

**Oczekiwany rezultat:**

- Przejście do widoku edycji
- Formularz wypełniony danymi historii
- Pola T i M zablokowane (read-only)

---

### Interakcja 6: Kliknięcie ikony usuwania

**Akcja użytkownika:** Kliknięcie przycisku/ikony "Usuń"

**Komponent:** `<StoryCard />`

**Ścieżka przepływu:**

1. Użytkownik klika ikonę usuwania
2. Event `on:delete` emitowany z story.id
3. `+page.svelte` odbiera event
4. Wywołanie `openDeleteModal(story.id)`
5. Ustawienie `deleteState.modalOpen = true`
6. Wyświetlenie `<ModalConfirmDelete />`

**Implementacja:**

```svelte
<!-- StoryCard.svelte -->
<button
  class="btn btn-sm btn-ghost text-error"
  on:click={handleDeleteClick}
>
  <svg>...</svg>
  Usuń
</button>

<script>
function handleDeleteClick() {
  dispatch('delete', story.id);
}
</script>

<!-- +page.svelte -->
<StoryList on:delete={openDeleteModal} />

<script>
function openDeleteModal(event: CustomEvent<string>) {
  deleteState = {
    modalOpen: true,
    storyId: event.detail,
    isDeleting: false
  };
}
</script>
```

**Oczekiwany rezultat:**

- Wyświetlenie modalu potwierdzenia
- UI nieaktywne (modal blokuje tło)
- Pytanie "Czy na pewno chcesz usunąć?"

---

### Interakcja 7: Potwierdzenie usunięcia w modalu

**Akcja użytkownika:** Kliknięcie "Usuń historię" w modalu

**Komponent:** `<ModalConfirmDelete />`

**Ścieżka przepływu:**

1. Użytkownik klika "Usuń historię"
2. Event `on:confirm` emitowany
3. `+page.svelte` wywołuje `confirmDelete()`
4. Ustawienie `deleteState.isDeleting = true`
5. Przyciski disabled, wyświetlenie spinnera
6. Wywołanie `DELETE /api/stories/:id`
7. Obsługa odpowiedzi:
   - Sukces (204) → Toast sukcesu, zamknięcie modalu, `invalidateAll()`
   - Błąd → Toast błędu, modal pozostaje otwarty
8. Reset `deleteState.isDeleting = false`

**Implementacja:**

```svelte
<!-- ModalConfirmDelete.svelte -->
<button
  class="btn btn-error"
  on:click={handleConfirm}
  disabled={isDeleting}
>
  {#if isDeleting}
    <span class="loading loading-spinner"></span>
    Usuwanie...
  {:else}
    Usuń historię
  {/if}
</button>

<!-- +page.svelte -->
async function confirmDelete() {
  if (!deleteState.storyId) return;

  deleteState.isDeleting = true;

  try {
    const response = await fetch(`/api/stories/${deleteState.storyId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      // Obsługa błędu...
      return;
    }

    toastStore.addToast('Historia została usunięta', 'success');
    deleteState = { modalOpen: false, storyId: null, isDeleting: false };
    await invalidateAll();
  } catch (error) {
    toastStore.addToast('Błąd połączenia', 'error');
  } finally {
    deleteState.isDeleting = false;
  }
}
```

**Oczekiwany rezultat:**

- Wyświetlenie spinnera podczas usuwania
- Przyciski nieaktywne
- Po sukcesie: toast + zamknięcie modalu + odświeżona lista
- Po błędzie: toast + modal pozostaje otwarty

---

### Interakcja 8: Anulowanie usunięcia w modalu

**Akcja użytkownika:** Kliknięcie "Anuluj" lub tła modalu

**Komponent:** `<ModalConfirmDelete />`

**Ścieżka przepływu:**

1. Użytkownik klika "Anuluj" lub tło
2. Event `on:cancel` emitowany
3. `+page.svelte` wywołuje `cancelDelete()`
4. Reset `deleteState` do wartości domyślnych
5. Modal znika

**Implementacja:**

```svelte
<!-- ModalConfirmDelete.svelte -->
<button
  class="btn btn-ghost"
  on:click={handleCancel}
  disabled={isDeleting}
>
  Anuluj
</button>

<div class="modal-backdrop" on:click={handleBackdropClick}></div>

<!-- +page.svelte -->
function cancelDelete() {
  deleteState = {
    modalOpen: false,
    storyId: null,
    isDeleting: false
  };
}
```

**Oczekiwany rezultat:**

- Modal znika z animacją
- Lista pozostaje niezmieniona
- Brak wywołań API

---

### Interakcja 9: Kliknięcie "Losuj Historię"

**Akcja użytkownika:** Kliknięcie przycisku "Losuj Historię"

**Komponent:** `+page.svelte` (header section)

**Ścieżka przepływu:**

1. Użytkownik klika przycisk
2. Sprawdzenie warunków: `!isRandomizing && stories.length > 0`
3. Ustawienie `isRandomizing = true`
4. Przycisk disabled, tekst "Losuję..."
5. Wywołanie `GET /api/stories/random`
6. Obsługa odpowiedzi:
   - Sukces (200) → Pobranie `story.id`, nawigacja do `/stories/{id}`
   - 404 → Toast "Brak historii"
   - Błąd → Toast błędu
7. Reset `isRandomizing = false`

**Implementacja:**

```svelte
<script>
	async function handleRandomStory() {
		if (isRandomizing || data.stories.length === 0) return;

		isRandomizing = true;

		try {
			const response = await fetch('/api/stories/random');

			if (!response.ok) {
				if (response.status === 404) {
					toastStore.addToast('Brak historii do wylosowania', 'warning');
					return;
				}
				throw new Error('Failed to fetch random story');
			}

			const story: StoryDTO = await response.json();
			await goto(`/stories/${story.id}`);
		} catch (error) {
			toastStore.addToast('Nie udało się wylosować historii', 'error');
		} finally {
			isRandomizing = false;
		}
	}
</script>

<button
	class="btn btn-primary"
	disabled={isRandomizing || data.stories.length === 0}
	on:click={handleRandomStory}
>
	{isRandomizing ? 'Losuję...' : 'Losuj Historię'}
</button>
```

**Oczekiwany rezultat:**

- Przycisk disabled podczas ładowania
- Tekst zmienia się na "Losuję..."
- Po sukcesie: nawigacja do wylosowanej historii
- Po błędzie: toast + pozostanie na liście

## 9. Warunki i walidacja

### Warunek 1: Wyświetlanie Landing Page vs Dashboard

**Warunek:**

```typescript
if (data.session === null) {
	// Wyświetl Landing Page
} else {
	// Wyświetl Dashboard (EmptyState lub StoryList)
}
```

**Komponent:** `+page.svelte`

**Implementacja:**

```svelte
{#if !data.session}
	<LandingPage />
{:else}
	<!-- Dashboard content -->
{/if}
```

**Wpływ na UI:**

- Użytkownik niezalogowany widzi hero section z opisem i CTA
- Użytkownik zalogowany widzi swoje historie lub empty state
- Nawigacja już jest warunkowa (z Widoku 1)

---

### Warunek 2: Empty State vs Story List

**Warunek:**

```typescript
if (data.session !== null && data.stories.length === 0) {
	// Wyświetl Empty State
} else if (data.session !== null && data.stories.length > 0) {
	// Wyświetl Story List
}
```

**Komponent:** `+page.svelte`

**Implementacja:**

```svelte
{#if data.session}
	{#if data.stories.length === 0}
		<EmptyState />
	{:else}
		<!-- Header + StoryList -->
		<div class="flex justify-between items-center mb-8">
			<h1>Moje Mroczne Historie</h1>
			<button on:click={handleRandomStory}>Losuj</button>
		</div>
		<StoryList stories={data.stories} on:delete={openDeleteModal} />
	{/if}
{/if}
```

**Wpływ na UI:**

- Pusta lista → EmptyState z CTA do generowania
- Niepusta lista → Wyświetlenie kart historii + przycisk losuj

---

### Warunek 3: Disabled przycisk "Losuj Historię"

**Warunek:**

```typescript
if (data.stories.length === 0 || isRandomizing) {
	// Przycisk disabled
}
```

**Komponent:** `+page.svelte`

**Implementacja:**

```svelte
<button disabled={isRandomizing || data.stories.length === 0} on:click={handleRandomStory}>
	{isRandomizing ? 'Losuję...' : 'Losuj Historię'}
</button>
```

**Wpływ na UI:**

- Przycisk nieaktywny (szary, brak hover) gdy pusta lista
- Przycisk nieaktywny podczas ładowania
- Tekst zmienia się na "Losuję..." podczas operacji
- Zapobiega wielokrotnym kliknięciom

---

### Warunek 4: Wyświetlanie modalu usuwania

**Warunek:**

```typescript
if (deleteState.modalOpen === true && deleteState.storyId !== null) {
	// Wyświetl modal
}
```

**Komponent:** `<ModalConfirmDelete />`

**Implementacja:**

```svelte
{#if isOpen}
	<div class="modal modal-open">
		<!-- Modal content -->
	</div>
{/if}
```

**Wpływ na UI:**

- Modal pojawia się nad contentem
- Tło zaciemnione i nieinteraktywne
- Focus na modalu

---

### Warunek 5: Disabled przyciski w modalu podczas usuwania

**Warunek:**

```typescript
if (deleteState.isDeleting === true) {
	// Przyciski disabled
	// Wyświetl spinner
}
```

**Komponent:** `<ModalConfirmDelete />`

**Implementacja:**

```svelte
<button disabled={isDeleting} on:click={handleCancel}> Anuluj </button>

<button disabled={isDeleting} on:click={handleConfirm}>
	{#if isDeleting}
		<span class="loading loading-spinner"></span>
		Usuwanie...
	{:else}
		Usuń historię
	{/if}
</button>
```

**Wpływ na UI:**

- Oba przyciski nieaktywne podczas operacji
- Przycisk "Usuń" wyświetla spinner i tekst "Usuwanie..."
- Zapobiega wielokrotnym wywołaniom DELETE
- Użytkownik nie może zamknąć modalu klikając tło

---

### Warunek 6: Walidacja UUID przed DELETE

**Warunek:**

```typescript
if (deleteState.storyId === null || !isValidUUID(deleteState.storyId)) {
	// Nie wywołuj API
}
```

**Komponent:** `+page.svelte` (funkcja `confirmDelete`)

**Implementacja:**

```typescript
async function confirmDelete() {
	if (!deleteState.storyId) {
		console.error('Cannot delete: storyId is null');
		return;
	}

	// Opcjonalnie: dodatkowa walidacja UUID
	if (!isValidUUID(deleteState.storyId)) {
		toastStore.addToast('Nieprawidłowy identyfikator historii', 'error');
		cancelDelete();
		return;
	}

	// Wykonaj DELETE...
}
```

**Wpływ na UI:**

- Zapobiega wywołaniu API z nieprawidłowym ID
- Toast błędu jeśli walidacja nie przejdzie
- Automatyczne zamknięcie modalu

---

### Warunek 7: Responsywny grid kart historii

**Warunek:**

```css
/* Tailwind breakpoints */
- Mobile (< 768px): 1 kolumna
- Tablet (768px - 1024px): 2 kolumny
- Desktop (>= 1024px): 3 kolumny
```

**Komponent:** `<StoryList />`

**Implementacja:**

```svelte
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{#each stories as story (story.id)}
		<StoryCard {story} on:delete />
	{/each}
</div>
```

**Wpływ na UI:**

- Na mobile: karty ułożone pionowo (1 kolumna)
- Na tablet: 2 karty obok siebie
- Na desktop: 3 karty obok siebie
- Gap pozostaje stały (24px)

---

### Warunek 8: Wyświetlanie etykiet dla difficulty i darkness

**Warunek:**

```typescript
const difficultyLabels = {
	1: 'Łatwa',
	2: 'Średnia',
	3: 'Trudna'
};

const darknessLabels = {
	1: 'Tajemnicza',
	2: 'Niepokojąca',
	3: 'Brutalna'
};
```

**Komponent:** `<StoryCard />`

**Implementacja:**

```svelte
<div class="badge badge-outline">
	T: {story.difficulty} - {difficultyLabels[story.difficulty]}
</div>
<div class="badge badge-outline">
	M: {story.darkness} - {darknessLabels[story.darkness]}
</div>
```

**Wpływ na UI:**

- Wyświetla zarówno cyfrę jak i nazwę
- Pomaga użytkownikowi szybko ocenić poziom
- Zgodne z PRD 3.2

## 10. Obsługa błędów

### Scenariusz 1: Błąd ładowania listy historii (GET /api/stories)

**Przyczyna:**

- Błąd serwera (500)
- Błąd połączenia sieciowego
- Timeout

**Obsługa:**

```typescript
// +page.server.ts
export const load: PageServerLoad = async ({ locals, fetch }) => {
	if (!locals.user) {
		return { stories: [], total: 0 };
	}

	try {
		const response = await fetch('/api/stories?limit=100');

		if (!response.ok) {
			console.error('Failed to fetch stories', {
				status: response.status,
				userId: locals.user.id
			});

			return {
				stories: [],
				total: 0,
				error: 'Nie udało się pobrać historii. Odśwież stronę.'
			};
		}

		const data: ListStoriesDTO = await response.json();
		return { stories: data.stories, total: data.total };
	} catch (error) {
		console.error('Error fetching stories', error);
		return {
			stories: [],
			total: 0,
			error: 'Wystąpił błąd podczas ładowania historii.'
		};
	}
};
```

**Rezultat dla użytkownika:**

- Wyświetlenie EmptyState (lista pusta)
- Toast z błędem (jeśli `data.error` istnieje)
- Możliwość odświeżenia strony
- Aplikacja nie crashuje

---

### Scenariusz 2: Błąd usuwania historii (DELETE /api/stories/:id)

**Przyczyna:**

- 404 Not Found (historia już usunięta lub brak dostępu)
- 500 Internal Server Error
- Błąd sieci

**Obsługa:**

```typescript
// +page.svelte
async function confirmDelete() {
	if (!deleteState.storyId) return;

	deleteState.isDeleting = true;

	try {
		const response = await fetch(`/api/stories/${deleteState.storyId}`, {
			method: 'DELETE'
		});

		if (!response.ok) {
			// Parsuj błąd z API
			const errorData: ErrorDTO = await response.json();

			// Mapuj kody błędów na komunikaty
			const errorMessages: Record<number, string> = {
				404: 'Historia nie istnieje lub została już usunięta',
				401: 'Sesja wygasła. Zaloguj się ponownie',
				500: 'Błąd serwera. Spróbuj ponownie za chwilę'
			};

			const message = errorMessages[response.status] || errorData.error.message;
			toastStore.addToast(message, 'error');

			// Jeśli 404, zamknij modal i odśwież listę (historia już nie istnieje)
			if (response.status === 404) {
				cancelDelete();
				await invalidateAll();
			}

			return;
		}

		// Sukces
		toastStore.addToast('Historia została usunięta', 'success');
		deleteState = { modalOpen: false, storyId: null, isDeleting: false };
		await invalidateAll();
	} catch (error) {
		console.error('Delete error:', error);
		toastStore.addToast('Błąd połączenia. Sprawdź internet i spróbuj ponownie.', 'error');
	} finally {
		deleteState.isDeleting = false;
	}
}
```

**Rezultat dla użytkownika:**

- Toast z odpowiednim komunikatem błędu
- Modal pozostaje otwarty (poza przypadkiem 404)
- Możliwość ponownej próby
- Przy 404: automatyczne zamknięcie i odświeżenie listy

---

### Scenariusz 3: Błąd losowania historii (GET /api/stories/random)

**Przyczyna:**

- 404 Not Found (użytkownik nie ma historii - nie powinno się zdarzyć, bo przycisk disabled)
- 500 Internal Server Error
- Błąd sieci

**Obsługa:**

```typescript
// +page.svelte
async function handleRandomStory() {
	if (isRandomizing || data.stories.length === 0) return;

	isRandomizing = true;

	try {
		const response = await fetch('/api/stories/random');

		if (!response.ok) {
			// 404 - brak historii
			if (response.status === 404) {
				toastStore.addToast('Brak historii do wylosowania', 'warning');
				return;
			}

			// 401 - sesja wygasła
			if (response.status === 401) {
				toastStore.addToast('Sesja wygasła. Zaloguj się ponownie', 'error');
				await goto('/login');
				return;
			}

			// Inne błędy
			const errorData: ErrorDTO = await response.json();
			toastStore.addToast(errorData.error.message || 'Nie udało się wylosować historii', 'error');
			return;
		}

		const story: StoryDTO = await response.json();
		await goto(`/stories/${story.id}`);
	} catch (error) {
		console.error('Random story error:', error);
		toastStore.addToast('Błąd połączenia. Sprawdź internet.', 'error');
	} finally {
		isRandomizing = false;
	}
}
```

**Rezultat dla użytkownika:**

- Toast z odpowiednim komunikatem
- Pozostanie na stronie listy
- Możliwość ponownej próby
- Przy 401: automatyczne przekierowanie na login

---

### Scenariusz 4: Pusta lista po zalogowaniu (prawidłowy stan)

**Przyczyna:**

- Nowy użytkownik nie ma jeszcze żadnych historii
- Użytkownik usunął wszystkie historie

**Obsługa:**

```svelte
<!-- +page.svelte -->
{#if data.session && data.stories.length === 0}
	<EmptyState />
{/if}
```

**Rezultat dla użytkownika:**

- Wyświetlenie EmptyState
- Komunikat zachęcający do wygenerowania pierwszej historii
- Przycisk CTA → `/generate`
- To nie jest błąd, ale prawidłowy stan aplikacji

---

### Scenariusz 5: Utrata połączenia podczas przeglądania listy

**Przyczyna:**

- Użytkownik traci internet

**Obsługa:**

```typescript
// Opcjonalnie: detekcja offline (z Widoku 1)
// hooks są już zaimplementowane w +layout.svelte

// W +page.svelte - obsługa błędów fetch automatycznie catchuje network errors
```

**Rezultat dla użytkownika:**

- Lista pozostaje widoczna (dane już załadowane)
- Próba usunięcia/losowania → catch error → toast "Sprawdź połączenie"
- Dane nie są tracone

---

### Scenariusz 6: Race condition - wielokrotne kliknięcie "Usuń"

**Przyczyna:**

- Użytkownik wielokrotnie klika przycisk przed odpowiedzią API

**Obsługa:**

```typescript
// +page.svelte
async function confirmDelete() {
	// Guard clause - zapobiega wielokrotnym wywołaniom
	if (!deleteState.storyId || deleteState.isDeleting) {
		return;
	}

	deleteState.isDeleting = true;

	// ... reszta logiki
}
```

```svelte
<!-- ModalConfirmDelete.svelte -->
<button disabled={isDeleting} on:click={handleConfirm}> Usuń </button>
```

**Rezultat dla użytkownika:**

- Przycisk disabled po pierwszym kliknięciu
- Niemożność wielokrotnego wywołania DELETE
- Spinner informuje o trwającej operacji

---

### Scenariusz 7: Nieprawidłowy ID historii (security)

**Przyczyna:**

- Manipulacja kodu przez deweloperskie narzędzia
- Bug w aplikacji

**Obsługa:**

```typescript
// +page.svelte
import { isValidUUID } from '../types';

async function confirmDelete() {
	if (!deleteState.storyId) return;

	// Dodatkowa walidacja UUID
	if (!isValidUUID(deleteState.storyId)) {
		console.error('Invalid UUID:', deleteState.storyId);
		toastStore.addToast('Nieprawidłowy identyfikator historii', 'error');
		cancelDelete();
		return;
	}

	// ... reszta logiki
}
```

**Rezultat dla użytkownika:**

- Toast z błędem
- Modal się zamyka
- Brak wywołania API z nieprawidłowymi danymi
- Log błędu w konsoli (dla debugowania)

---

### Scenariusz 8: Błąd parsowania JSON z API

**Przyczyna:**

- API zwróciło nieprawidłowy JSON
- Błąd serwera

**Obsługa:**

```typescript
// +page.svelte
try {
	const response = await fetch('/api/stories/random');

	if (!response.ok) {
		// ... obsługa błędów HTTP
	}

	// Obsługa błędów parsowania JSON
	try {
		const story: StoryDTO = await response.json();
		await goto(`/stories/${story.id}`);
	} catch (parseError) {
		console.error('JSON parse error:', parseError);
		toastStore.addToast('Otrzymano nieprawidłowe dane z serwera', 'error');
	}
} catch (error) {
	// ... obsługa błędów sieci
}
```

**Rezultat dla użytkownika:**

- Toast z komunikatem błędu
- Pozostanie na stronie
- Log błędu w konsoli

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

**Zadania:**

1. Utworzenie plików widoku
2. Utworzenie folderów na komponenty
3. Przygotowanie podstawowej struktury

**Struktura katalogów:**

```
src/
├── routes/
│   ├── +page.svelte                    (główny widok)
│   └── +page.server.ts                 (load function)
├── lib/
│   └── components/
│       ├── LandingPage.svelte          (nowy)
│       ├── EmptyState.svelte           (nowy)
│       ├── StoryList.svelte            (nowy)
│       ├── StoryCard.svelte            (nowy - w lib/components)
│       └── ModalConfirmDelete.svelte   (nowy - w lib/components)
```

**Polecenia:**

```bash
# Utwórz pliki widoku (jeśli nie istnieją)
touch src/routes/+page.svelte
touch src/routes/+page.server.ts

# Utwórz komponenty
touch src/lib/components/LandingPage.svelte
touch src/lib/components/EmptyState.svelte
touch src/lib/components/StoryList.svelte
touch src/lib/components/StoryCard.svelte
touch src/lib/components/ModalConfirmDelete.svelte
```

---

### Krok 2: Implementacja +page.server.ts

**2.1. Utworzenie load function:**

```typescript
// src/routes/+page.server.ts
import type { PageServerLoad } from './$types';
import type { ListStoriesDTO, StoryDTO } from '../types';

export const load: PageServerLoad = async ({ locals, fetch }) => {
	// 1. Sprawdzenie czy użytkownik zalogowany
	if (!locals.user) {
		return {
			stories: [] as StoryDTO[],
			total: 0
		};
	}

	// 2. Pobranie listy historii
	try {
		const response = await fetch('/api/stories?limit=100&offset=0');

		if (!response.ok) {
			console.error('Failed to fetch stories', {
				status: response.status,
				statusText: response.statusText,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});

			return {
				stories: [] as StoryDTO[],
				total: 0,
				error: 'Nie udało się pobrać historii. Spróbuj odświeżyć stronę.'
			};
		}

		const data: ListStoriesDTO = await response.json();

		return {
			stories: data.stories,
			total: data.total
		};
	} catch (error) {
		console.error('Error fetching stories', {
			error: error instanceof Error ? error.message : 'Unknown error',
			userId: locals.user.id,
			timestamp: new Date().toISOString()
		});

		return {
			stories: [] as StoryDTO[],
			total: 0,
			error: 'Wystąpił błąd podczas ładowania historii.'
		};
	}
};
```

**2.2. Testowanie:**

```bash
# Uruchom dev server
npm run dev

# Sprawdź czy load function się wykonuje
# Otwórz devtools → Network → sprawdź request do /api/stories
```

---

### Krok 3: Implementacja komponentu `<LandingPage />`

**Plik:** `src/lib/components/LandingPage.svelte`

```svelte
<script lang="ts">
	// Brak logiki - komponent czysto prezentacyjny
</script>

<div class="hero min-h-[80vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-2xl">
			<h1 class="text-5xl font-bold mb-6">Zostań Mistrzem Mrocznych Historii.</h1>

			<p class="text-lg mb-8 opacity-80">
				Twórz fascynujące zagadki w stylu "Czarnych Historii" z pomocą sztucznej inteligencji.
				Generuj, zapisuj i prowadź niezapomniane sesje gry ze znajomymi.
			</p>

			<div class="flex gap-4 justify-center flex-wrap">
				<a href="/login" class="btn btn-primary btn-lg"> Zaloguj się </a>
				<a href="/register" class="btn btn-outline btn-lg"> Stwórz konto </a>
			</div>

			<!-- Opcjonalnie: dodatkowe sekcje z features -->
			<div class="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
				<div class="text-center">
					<div class="text-4xl mb-2">🤖</div>
					<h3 class="font-bold mb-2">AI-Powered</h3>
					<p class="text-sm opacity-70">
						Zaawansowana sztuczna inteligencja tworzy unikalne, logiczne i angażujące zagadki.
					</p>
				</div>

				<div class="text-center">
					<div class="text-4xl mb-2">📚</div>
					<h3 class="font-bold mb-2">Twoja Kolekcja</h3>
					<p class="text-sm opacity-70">
						Zapisuj wygenerowane historie i buduj własną bibliotekę mrocznych zagadek.
					</p>
				</div>

				<div class="text-center">
					<div class="text-4xl mb-2">🎮</div>
					<h3 class="font-bold mb-2">Tryb Gry</h3>
					<p class="text-sm opacity-70">
						Prowadź sesje gry w dedykowanym interfejsie bez rozpraszaczy.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
```

---

### Krok 4: Implementacja komponentu `<EmptyState />`

**Plik:** `src/lib/components/EmptyState.svelte`

```svelte
<script lang="ts">
	// Brak logiki - komponent czysto prezentacyjny
</script>

<div class="hero min-h-[60vh] bg-base-200 rounded-lg">
	<div class="hero-content text-center">
		<div class="max-w-xl">
			<!-- Ikona lub ilustracja -->
			<div class="text-6xl mb-4 opacity-50">📖</div>

			<h2 class="text-3xl font-bold mb-4">Twoja księga mrocznych historii jest jeszcze pusta...</h2>

			<p class="text-lg mb-6 opacity-80">
				Zacznij swoją przygodę z tworzeniem mrocznych zagadek. Wygeneruj pierwszą historię i zbuduj
				swoją kolekcję!
			</p>

			<a href="/generate" class="btn btn-primary btn-lg"> Wygeneruj nową historię </a>

			<!-- Opcjonalnie: krótka instrukcja -->
			<div class="mt-8 text-sm opacity-60">
				<p>
					💡 Podaj temat, wybierz poziom trudności i mroczności, a AI stworzy dla Ciebie unikalną
					zagadkę!
				</p>
			</div>
		</div>
	</div>
</div>
```

---

### Krok 5: Implementacja komponentu `<StoryCard />`

**Plik:** `src/lib/components/StoryCard.svelte`

```svelte
<script lang="ts">
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		story: StoryDTO;
	}

	let { story }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string;
	}>();

	function handleDeleteClick() {
		dispatch('delete', story.id);
	}

	// Etykiety dla difficulty i darkness
	const difficultyLabels: Record<1 | 2 | 3, string> = {
		1: 'Łatwa',
		2: 'Średnia',
		3: 'Trudna'
	};

	const darknessLabels: Record<1 | 2 | 3, string> = {
		1: 'Tajemnicza',
		2: 'Niepokojąca',
		3: 'Brutalna'
	};
</script>

<div class="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
	<div class="card-body">
		<!-- Pytanie jako link do trybu gry -->
		<a
			href="/stories/{story.id}"
			class="card-title text-lg hover:text-primary transition-colors cursor-pointer line-clamp-3"
			title="Kliknij aby otworzyć w trybie gry"
		>
			{story.question}
		</a>

		<!-- Metadata badges -->
		<div class="flex gap-2 mt-3 flex-wrap">
			<div class="badge badge-outline" title="Trudność: {difficultyLabels[story.difficulty]}">
				T: {story.difficulty}
			</div>
			<div class="badge badge-outline" title="Mroczność: {darknessLabels[story.darkness]}">
				M: {story.darkness}
			</div>
		</div>

		<!-- Temat -->
		<p class="text-sm opacity-60 mt-2 line-clamp-1" title={story.subject}>
			Temat: {story.subject}
		</p>

		<!-- Akcje -->
		<div class="card-actions justify-end mt-4">
			<a href="/stories/{story.id}/edit" class="btn btn-sm btn-ghost" title="Edytuj historię">
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
				Edytuj
			</a>

			<button
				class="btn btn-sm btn-ghost text-error"
				on:click={handleDeleteClick}
				title="Usuń historię"
			>
				<svg
					class="w-4 h-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				Usuń
			</button>
		</div>

		<!-- Data utworzenia -->
		<div class="text-xs opacity-40 mt-2">
			Utworzono: {new Date(story.created_at).toLocaleDateString('pl-PL', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})}
		</div>
	</div>
</div>
```

---

### Krok 6: Implementacja komponentu `<StoryList />`

**Plik:** `src/lib/components/StoryList.svelte`

```svelte
<script lang="ts">
	import StoryCard from './StoryCard.svelte';
	import type { StoryDTO } from '../../types';
	import { createEventDispatcher } from 'svelte';

	interface Props {
		stories: StoryDTO[];
	}

	let { stories }: Props = $props();

	const dispatch = createEventDispatcher<{
		delete: string;
	}>();

	function handleDelete(event: CustomEvent<string>) {
		dispatch('delete', event.detail);
	}
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
	{#each stories as story (story.id)}
		<StoryCard {story} on:delete={handleDelete} />
	{/each}
</div>

{#if stories.length === 0}
	<div class="text-center py-12 opacity-60">
		<p>Brak historii do wyświetlenia</p>
	</div>
{/if}
```

---

### Krok 7: Implementacja komponentu `<ModalConfirmDelete />`

**Plik:** `src/lib/components/ModalConfirmDelete.svelte`

```svelte
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	interface Props {
		isOpen: boolean;
		storyId: string | null;
		isDeleting: boolean;
	}

	let { isOpen = $bindable(false), storyId, isDeleting }: Props = $props();

	const dispatch = createEventDispatcher<{
		confirm: void;
		cancel: void;
	}>();

	function handleConfirm() {
		if (!isDeleting && storyId) {
			dispatch('confirm');
		}
	}

	function handleCancel() {
		if (!isDeleting) {
			dispatch('cancel');
		}
	}

	function handleBackdropClick() {
		if (!isDeleting) {
			handleCancel();
		}
	}
</script>

{#if isOpen}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="font-bold text-lg mb-4">Czy na pewno chcesz usunąć tę historię?</h3>

			<p class="py-4 opacity-80">
				Ta operacja jest <strong class="text-error">nieodwracalna</strong>. Historia zostanie trwale
				usunięta z twojej kolekcji i nie będzie możliwości jej odzyskania.
			</p>

			<div class="modal-action">
				<button class="btn btn-ghost" on:click={handleCancel} disabled={isDeleting}>
					Anuluj
				</button>

				<button class="btn btn-error" on:click={handleConfirm} disabled={isDeleting}>
					{#if isDeleting}
						<span class="loading loading-spinner loading-sm"></span>
						Usuwanie...
					{:else}
						Usuń historię
					{/if}
				</button>
			</div>
		</div>

		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="modal-backdrop bg-black/50" on:click={handleBackdropClick}></div>
	</div>
{/if}
```

---

### Krok 8: Implementacja głównego widoku `+page.svelte`

**Plik:** `src/routes/+page.svelte`

```svelte
<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll, goto } from '$app/navigation';
	import { toastStore } from '$lib/stores/toasts';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import EmptyState from '$lib/components/EmptyState.svelte';
	import StoryList from '$lib/components/StoryList.svelte';
	import ModalConfirmDelete from '$lib/components/ModalConfirmDelete.svelte';
	import type { StoryDTO, ErrorDTO } from '../types';

	export let data: PageData;

	// Stan lokalny dla usuwania
	interface DeleteState {
		modalOpen: boolean;
		storyId: string | null;
		isDeleting: boolean;
	}

	let deleteState = $state<DeleteState>({
		modalOpen: false,
		storyId: null,
		isDeleting: false
	});

	// Stan dla losowania
	let isRandomizing = $state(false);

	// Wyświetlenie błędu ładowania (jeśli wystąpił)
	$effect(() => {
		if (data.error) {
			toastStore.addToast(data.error, 'error');
		}
	});

	// === FUNKCJE OBSŁUGI USUWANIA ===

	function openDeleteModal(event: CustomEvent<string>) {
		deleteState = {
			modalOpen: true,
			storyId: event.detail,
			isDeleting: false
		};
	}

	function cancelDelete() {
		deleteState = {
			modalOpen: false,
			storyId: null,
			isDeleting: false
		};
	}

	async function confirmDelete() {
		if (!deleteState.storyId) {
			console.error('Cannot delete: storyId is null');
			return;
		}

		deleteState.isDeleting = true;

		try {
			const response = await fetch(`/api/stories/${deleteState.storyId}`, {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (!response.ok) {
				// Parsuj błąd z API
				const errorData: ErrorDTO = await response.json();

				// Mapuj kody błędów
				const errorMessages: Record<number, string> = {
					404: 'Historia nie istnieje lub została już usunięta',
					401: 'Sesja wygasła. Zaloguj się ponownie',
					500: 'Błąd serwera. Spróbuj ponownie za chwilę'
				};

				const message = errorMessages[response.status] || errorData.error.message;
				toastStore.addToast(message, 'error');

				// Jeśli 404, zamknij modal i odśwież listę
				if (response.status === 404) {
					cancelDelete();
					await invalidateAll();
				}

				return;
			}

			// Sukces
			toastStore.addToast('Historia została usunięta', 'success');

			// Zamknij modal
			deleteState = {
				modalOpen: false,
				storyId: null,
				isDeleting: false
			};

			// Odśwież listę
			await invalidateAll();
		} catch (error) {
			console.error('Delete error:', error);
			toastStore.addToast('Błąd połączenia. Sprawdź internet i spróbuj ponownie.', 'error');
		} finally {
			deleteState.isDeleting = false;
		}
	}

	// === FUNKCJA OBSŁUGI LOSOWANIA ===

	async function handleRandomStory() {
		if (isRandomizing || data.stories.length === 0) return;

		isRandomizing = true;

		try {
			const response = await fetch('/api/stories/random');

			if (!response.ok) {
				// 404 - brak historii
				if (response.status === 404) {
					toastStore.addToast('Brak historii do wylosowania', 'warning');
					return;
				}

				// 401 - sesja wygasła
				if (response.status === 401) {
					toastStore.addToast('Sesja wygasła. Zaloguj się ponownie', 'error');
					await goto('/login');
					return;
				}

				// Inne błędy
				const errorData: ErrorDTO = await response.json();
				toastStore.addToast(errorData.error.message || 'Nie udało się wylosować historii', 'error');
				return;
			}

			const story: StoryDTO = await response.json();

			// Przekieruj do wylosowanej historii
			await goto(`/stories/${story.id}`);
		} catch (error) {
			console.error('Random story error:', error);
			toastStore.addToast('Błąd połączenia. Sprawdź internet.', 'error');
		} finally {
			isRandomizing = false;
		}
	}
</script>

<svelte:head>
	<title>MroczneHistorie - Twórz mroczne zagadki z AI</title>
	<meta
		name="description"
		content="Generuj unikalne Czarne Historie z pomocą sztucznej inteligencji"
	/>
</svelte:head>

<div class="container mx-auto px-4 py-8">
	{#if !data.session}
		<!-- Landing Page dla niezalogowanych -->
		<LandingPage />
	{:else if data.stories.length === 0}
		<!-- Empty State dla zalogowanych bez historii -->
		<EmptyState />
	{:else}
		<!-- Lista historii dla zalogowanych z historiami -->
		<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
			<h1 class="text-3xl md:text-4xl font-bold">Moje Mroczne Historie</h1>

			<button
				class="btn btn-primary"
				class:btn-disabled={isRandomizing || data.stories.length === 0}
				disabled={isRandomizing || data.stories.length === 0}
				on:click={handleRandomStory}
			>
				{#if isRandomizing}
					<span class="loading loading-spinner loading-sm"></span>
					Losuję...
				{:else}
					<svg
						class="w-5 h-5 mr-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					Losuj Historię
				{/if}
			</button>
		</div>

		<StoryList stories={data.stories} on:delete={openDeleteModal} />

		<!-- Info o liczbie historii -->
		<div class="mt-8 text-center text-sm opacity-60">
			Łącznie historii: {data.total}
		</div>
	{/if}
</div>

<!-- Modal usuwania (zawsze renderowany, ale ukryty) -->
<ModalConfirmDelete
	bind:isOpen={deleteState.modalOpen}
	storyId={deleteState.storyId}
	isDeleting={deleteState.isDeleting}
	on:confirm={confirmDelete}
	on:cancel={cancelDelete}
/>
```

---

### Krok 9: Testowanie funkcjonalności

**9.1. Test Landing Page (niezalogowany):**

```bash
# Wyloguj się (jeśli zalogowany)
# Otwórz http://localhost:5173/

# Sprawdź:
- [ ] Hero section się wyświetla
- [ ] H1 "Zostań Mistrzem Mrocznych Historii."
- [ ] Przyciski "Zaloguj się" i "Stwórz konto"
- [ ] Kliknięcie przenosi na /login i /register
- [ ] Responsywność (mobile, tablet, desktop)
```

**9.2. Test Empty State (zalogowany, brak historii):**

```bash
# Zaloguj się na konto bez historii

# Sprawdź:
- [ ] EmptyState się wyświetla
- [ ] Komunikat "Twoja księga..."
- [ ] Przycisk "Wygeneruj nową historię"
- [ ] Kliknięcie przenosi na /generate
```

**9.3. Test listy historii (zalogowany, z historiami):**

```bash
# Zaloguj się na konto z historiami

# Sprawdź:
- [ ] Tytuł "Moje Mroczne Historie"
- [ ] Przycisk "Losuj Historię"
- [ ] Lista kart się wyświetla
- [ ] Sortowanie (najnowsze pierwsze)
- [ ] Responsywny grid (1/2/3 kolumny)
- [ ] Wszystkie dane na karcie poprawne
```

**9.4. Test StoryCard:**

```bash
# Na liście historii

# Sprawdź:
- [ ] Pytanie się wyświetla
- [ ] Badges T i M
- [ ] Temat się wyświetla
- [ ] Data utworzenia
- [ ] Ikony edycji i usuwania
- [ ] Hover effects
- [ ] Kliknięcie pytania → /stories/[id]
- [ ] Kliknięcie edycji → /stories/[id]/edit
```

**9.5. Test usuwania:**

```bash
# Kliknij ikonę usuwania na karcie

# Sprawdź:
- [ ] Modal się otwiera
- [ ] Komunikat potwierdzenia
- [ ] Przyciski "Anuluj" i "Usuń"
- [ ] Kliknięcie "Anuluj" zamyka modal
- [ ] Kliknięcie tła zamyka modal
- [ ] Kliknięcie "Usuń" wyświetla spinner
- [ ] Przyciski disabled podczas usuwania
- [ ] Toast sukcesu po usunięciu
- [ ] Modal się zamyka
- [ ] Lista się odświeża
- [ ] Historia znika z listy
```

**9.6. Test losowania:**

```bash
# Kliknij "Losuj Historię"

# Sprawdź:
- [ ] Przycisk disabled jeśli lista pusta
- [ ] Tekst zmienia się na "Losuję..."
- [ ] Przycisk disabled podczas ładowania
- [ ] Nawigacja do /stories/[random-id]
- [ ] Obsługa błędów (toast)
```

**9.7. Test obsługi błędów:**

```bash
# Symuluj błędy:

# 1. Brak internetu podczas usuwania
# Sprawdź: Toast "Błąd połączenia"

# 2. Brak internetu podczas losowania
# Sprawdź: Toast "Błąd połączenia"

# 3. Usunięcie nieistniejącej historii (404)
# Sprawdź: Toast + zamknięcie modalu + odświeżenie

# 4. Błąd API (500)
# Sprawdź: Toast z komunikatem
```

---

### Krok 10: Optymalizacja i accessibility

**10.1. Accessibility:**

```svelte
<!-- Dodaj odpowiednie atrybuty ARIA -->

<!-- StoryCard.svelte -->
<a href="/stories/{story.id}" aria-label="Otwórz historię: {story.question.substring(0, 50)}...">
	{story.question}
</a>

<button
	on:click={handleDeleteClick}
	aria-label="Usuń historię: {story.question.substring(0, 30)}..."
>
	Usuń
</button>

<!-- ModalConfirmDelete.svelte -->
<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
	<h3 id="modal-title">Czy na pewno chcesz usunąć?</h3>
	...
</div>
```

**10.2. Keyboard navigation:**

```bash
# Sprawdź:
- [ ] Tab przełącza między elementami interaktywnymi
- [ ] Enter otwiera linki i aktywuje przyciski
- [ ] Escape zamyka modal
- [ ] Focus visible na wszystkich elementach
```

**10.3. Loading states:**

```bash
# Sprawdź:
- [ ] Spinner podczas usuwania
- [ ] Disabled buttons podczas operacji
- [ ] Komunikaty "Usuwanie...", "Losuję..."
- [ ] Brak możliwości wielokrotnego kliknięcia
```

**10.4. Performance:**

```bash
# Sprawdź:
- [ ] Brak niepotrzebnych re-renderów
- [ ] Smooth animations
- [ ] Fast navigation (SPA)
- [ ] Lazy loading obrazów (jeśli dodane)
```

---

### Krok 11: Edge cases i corner cases

**11.1. Pusta lista po usunięciu ostatniej historii:**

```bash
# Mając tylko 1 historię, usuń ją

# Sprawdź:
- [ ] Po usunięciu wyświetla się EmptyState
- [ ] Przycisk "Losuj" już nie jest widoczny
- [ ] Toast sukcesu się wyświetla
```

**11.2. Race condition przy usuwaniu:**

```bash
# Szybko kliknij "Usuń" wiele razy

# Sprawdź:
- [ ] Tylko jedno wywołanie DELETE
- [ ] Przyciski disabled po pierwszym kliknięciu
```

**11.3. Długie teksty:**

```bash
# Utwórz historię z bardzo długim pytaniem (>500 znaków)

# Sprawdź:
- [ ] Tekst się przycina (line-clamp)
- [ ] Karta zachowuje stały rozmiar
- [ ] Tooltip pokazuje pełny tekst (opcjonalnie)
```

**11.4. Bardzo dużo historii (100+):**

```bash
# Wygeneruj wiele historii

# Sprawdź:
- [ ] Performance pozostaje dobra
- [ ] Grid się prawidłowo układa
- [ ] Scroll działa płynnie
- [ ] Rozważenie wirtualizacji (jeśli > 200 kart)
```

---

### Krok 12: Finalizacja i dokumentacja

**12.1. Code review checklist:**

```bash
- [ ] Wszystkie typy są poprawne
- [ ] Brak console.log (poza error handling)
- [ ] Brak unused imports
- [ ] Nazwy zmiennych są jasne
- [ ] Komentarze dodane gdzie potrzebne
- [ ] Error handling wszędzie gdzie fetch
- [ ] Accessibility attributes
```

**12.2. Dokumentacja:**

```typescript
// Dodaj JSDoc comments do funkcji

/**
 * Otwiera modal potwierdzenia usunięcia historii
 * @param event - Custom event z ID historii do usunięcia
 */
function openDeleteModal(event: CustomEvent<string>) {
	// ...
}

/**
 * Wykonuje DELETE API call i odświeża listę
 * Obsługuje błędy i wyświetla odpowiednie toasty
 */
async function confirmDelete() {
	// ...
}
```

**12.3. README update (jeśli potrzebne):**

```markdown
## Widok: Strona Główna / Lista Historii

### Funkcjonalności:

- Landing page dla niezalogowanych
- Empty state dla zalogowanych bez historii
- Lista historii z kartami
- Usuwanie z modalem potwierdzenia
- Losowanie historii
- Responsywny design (mobile-first)

### Komponenty:

- `+page.svelte` - główny widok
- `<LandingPage />` - hero section
- `<EmptyState />` - pusty stan
- `<StoryList />` - kontener listy
- `<StoryCard />` - karta pojedynczej historii
- `<ModalConfirmDelete />` - modal usuwania

### API:

- GET /api/stories - lista historii
- DELETE /api/stories/:id - usuwanie
- GET /api/stories/random - losowa historia
```

**12.4. Pre-deployment checklist:**

```bash
- [ ] Wszystkie testy przechodzą
- [ ] Build się kompiluje bez błędów (npm run build)
- [ ] Preview działa poprawnie (npm run preview)
- [ ] Responsywność sprawdzona na wszystkich breakpointach
- [ ] Accessibility checked (Lighthouse, axe DevTools)
- [ ] Error handling przetestowany
- [ ] Edge cases covered
- [ ] Performance OK (Lighthouse score > 90)
- [ ] No console errors w production
```

**12.5. Deployment:**

```bash
# 1. Commit changes
git add .
git commit -m "Implement Story List view with all features"

# 2. Push to repository
git push origin main

# 3. Cloudflare Pages auto-deploy triggered

# 4. Monitor deployment logs

# 5. Post-deployment verification:
- [ ] Landing page loads
- [ ] Login works
- [ ] List loads
- [ ] Delete works
- [ ] Random works
- [ ] No errors in browser console
```

---

## Podsumowanie

Ten plan implementacji obejmuje kompleksowo Widok 2: Strona Główna / Lista Historii aplikacji MroczneHistorie. Kluczowe aspekty:

### Funkcjonalności:

1. **Warunkowe renderowanie** - 3 różne stany UI
2. **Lista historii** - grid z responsywnymi kartami
3. **Usuwanie** - modal z potwierdzeniem i loading state
4. **Losowanie** - nawigacja do losowej historii
5. **Empty state** - zachęta do pierwszego użycia
6. **Landing page** - marketing dla niezalogowanych

### Komponenty:

- 5 nowych komponentów reużywalnych
- Czysty podział odpowiedzialności
- Event bubbling dla delete
- Bindable props dla modal

### Integracja:

- 3 endpointy API (GET list, DELETE, GET random)
- Proper error handling dla wszystkich
- Toast notifications
- Automatic data revalidation

### UX:

- Loading states dla wszystkich operacji
- Disabled buttons zapobiegają błędom
- Toasty informują o sukcesie/błędzie
- Smooth transitions i animations
- Mobile-first responsive design

Szacowany czas implementacji: **6-10 godzin** dla doświadczonego programisty frontend.
