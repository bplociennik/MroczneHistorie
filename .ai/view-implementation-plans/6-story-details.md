# Plan implementacji widoku Trybu Gry (szczegóły historii)

## 1. Przegląd

Widok Trybu Gry (`/stories/[id]`) to ultra-minimalistyczny interfejs zaprojektowany dla Mistrza Gry prowadzącego zagadkę "Czarnej Historii". Widok wyświetla wyłącznie pytanie zagadki oraz przycisk umożliwiający odkrycie/ukrycie odpowiedzi. Głównym celem jest eliminacja wszelkich rozpraszaczy i zapewnienie komfortowego środowiska do prowadzenia gry towarzyskiej.

## 2. Routing widoku

- **Ścieżka**: `/stories/[id]`
- **Parametr dynamiczny**: `id` (UUID historii)
- **Ochrona**: Wymaga uwierzytelnienia (obsługiwane przez `hooks.server.ts`)
- **Struktura plików**:
  ```
  src/routes/stories/[id]/
  ├── +page.server.ts    (server load function)
  └── +page.svelte       (komponent strony)
  ```

## 3. Struktura komponentów

Widok składa się z pojedynczego komponentu strony bez dodatkowych podkomponentów:

```
+page.svelte (główny komponent strony)
├── <Navbar /> (komponent globalny)
├── Kontener z pytaniem
├── Przycisk toggle
└── Kontener z odpowiedzią (renderowany warunkowo)
```

Architektura jest celowo płaska i minimalistyczna - nie ma potrzeby tworzenia osobnych komponentów dla tak prostego widoku.

## 4. Szczegóły komponentów

### +page.svelte (Główny komponent strony)

**Opis komponentu:**
Komponent strony renderujący ultra-minimalistyczny interfejs gry. Wyświetla pytanie zagadki w dużej, czytelnej czcionce oraz przycisk umożliwiający przełączanie widoczności odpowiedzi. Odpowiedź pojawia się z animacją `fade` po kliknięciu przycisku.

**Główne elementy HTML:**
- `<main>` - główny kontener strony
- `<section>` - kontener dla pytania (z dużą czcionką, centrowany)
- `<button>` - przycisk toggle do odkrywania/ukrywania odpowiedzi
- `<section>` - kontener dla odpowiedzi (renderowany warunkowo z `{#if}`)
- Użycie dyrektywy `transition:fade` dla animacji odpowiedzi

**Obsługiwane zdarzenia:**
- `onclick` na przycisku toggle - przełącza stan zmiennej `showAnswer`

**Warunki walidacji:**
- Brak walidacji na poziomie komponentu (wszystkie warunki sprawdzane w `+page.server.ts`)
- Komponent zakłada, że otrzymuje poprawne dane typu `StoryDTO`

**Typy:**
- `StoryDTO` - props otrzymywane z funkcji `load`
- Typ danych zwracanych przez load: `{ story: StoryDTO }`

**Propsy:**
- `data` - obiekt zawierający pole `story` typu `StoryDTO` (automatycznie przekazywane przez SvelteKit z funkcji `load`)

**Stan lokalny:**
- `showAnswer: boolean` - stan kontrolujący widoczność odpowiedzi (zarządzany przez `$state` rune)

### +page.server.ts (Server Load Function)

**Opis komponentu:**
Funkcja serwerowa odpowiedzialna za pobieranie danych historii z bazy danych przed renderowaniem strony. Waliduje UUID, sprawdza dostęp użytkownika (poprzez RLS) i zwraca dane historii lub rzuca odpowiedni błąd.

**Główne elementy:**
- Eksport funkcji `load` typu `PageServerLoad`
- Walidacja formatu UUID
- Zapytanie do Supabase: `locals.supabase.from('stories').select('*').eq('id', id).single()`
- Obsługa błędów z użyciem `error()` helper z SvelteKit

**Obsługiwane scenariusze:**
- Pomyślne pobranie danych → zwrócenie `{ story: StoryDTO }`
- Nieprawidłowy UUID → `error(400, 'Nieprawidłowy format identyfikatora historii')`
- Brak uwierzytelnienia → przekierowanie do logowania (obsłużone przez hooks)
- Historia nie istnieje / brak dostępu → `error(404, 'Nie znaleziono historii lub nie masz do niej dostępu')`
- Błąd bazy danych → `error(500, 'Nie udało się pobrać historii')`

**Typy:**
- `PageServerLoad` z `@sveltejs/kit`
- `StoryDTO` z `$lib/types` lub `../../../types`
- Zwracany typ: `{ story: StoryDTO }`

## 5. Typy

### Istniejące typy (z `src/types.ts`)

```typescript
/**
 * Kompletny obiekt historii zwracany z bazy danych
 */
export type StoryDTO = Tables<'stories'>;
// Struktura:
// {
//   id: string (UUID)
//   user_id: string (UUID)
//   subject: string
//   difficulty: 1 | 2 | 3
//   darkness: 1 | 2 | 3
//   question: string
//   answer: string
//   created_at: string (ISO timestamp)
// }
```

### Nowe typy (do zdefiniowania w `+page.server.ts`)

```typescript
/**
 * Typ danych zwracanych przez funkcję load
 */
interface PageData {
  story: StoryDTO;
}
```

**Uwaga**: Nie są potrzebne żadne dodatkowe ViewModele - używamy bezpośrednio `StoryDTO`, ponieważ widok wyświetla dane w czystej formie bez transformacji.

## 6. Zarządzanie stanem

### Stan lokalny komponentu (`+page.svelte`)

```typescript
let showAnswer = $state(false);
```

- **Typ**: `boolean`
- **Cel**: Kontrola widoczności sekcji z odpowiedzią
- **Wartość początkowa**: `false` (odpowiedź ukryta)
- **Aktualizacja**: Toggle przy kliknięciu przycisku

### Brak globalnego stanu

Widok nie wymaga:
- Stores (Svelte stores)
- Context API
- Customowych hooków
- Współdzielenia stanu między komponentami

Cały stan jest lokalny i prosty (pojedyncza zmienna boolean).

## 7. Integracja API

### Podejście do pobierania danych

Dane są pobierane **bezpośrednio z Supabase w funkcji `load`** w pliku `+page.server.ts`, a nie przez dedykowany endpoint API `/api/stories/:id`.

**Uzasadnienie**:
- Dane są potrzebne do renderowania strony SSR
- SvelteKit load functions są optymalne do pobierania danych przed renderowaniem
- Eliminujemy zbędny dodatkowy request HTTP
- RLS w Supabase automatycznie zapewnia bezpieczeństwo

### Implementacja w `+page.server.ts`

```typescript
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { isValidUUID } from '../../../types';
import type { StoryDTO } from '../../../types';

export const load: PageServerLoad = async ({ params, locals }) => {
  // 1. Walidacja UUID
  if (!isValidUUID(params.id)) {
    throw error(400, 'Nieprawidłowy format identyfikatora historii');
  }

  // 2. Pobranie historii z Supabase
  const { data: story, error: dbError } = await locals.supabase
    .from('stories')
    .select('*')
    .eq('id', params.id)
    .single();

  // 3. Obsługa błędów
  if (dbError) {
    console.error('[DB_ERROR] GET story failed', {
      code: dbError.code,
      message: dbError.message,
      storyId: params.id,
      userId: locals.user?.id,
      timestamp: new Date().toISOString()
    });

    // PGRST116 = PostgREST "not found"
    if (dbError.code === 'PGRST116') {
      throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
    }

    throw error(500, 'Nie udało się pobrać historii');
  }

  // 4. Dodatkowa walidacja (na wypadek null przez RLS)
  if (!story) {
    throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
  }

  // 5. Zwrócenie danych
  return {
    story: story as StoryDTO
  };
};
```

**Typy żądania**: Brak (parametr URL)
**Typy odpowiedzi**: `{ story: StoryDTO }`

## 8. Interakcje użytkownika

### Interakcja 1: Odkrywanie odpowiedzi

**Trigger**: Kliknięcie przycisku "Odkryj odpowiedź"

**Przebieg**:
1. Użytkownik klika przycisk z tekstem "Odkryj odpowiedź"
2. Zmienna `showAnswer` zmienia wartość z `false` na `true`
3. Tekst przycisku zmienia się na "Ukryj odpowiedź"
4. Sekcja z odpowiedzią pojawia się z animacją `fade` (300ms)
5. Odpowiedź wyświetlana jest w czytelnej czcionce

**Implementacja**:
```svelte
<button onclick={() => showAnswer = !showAnswer}>
  {showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
</button>

{#if showAnswer}
  <section transition:fade={{ duration: 300 }}>
    <p>{data.story.answer}</p>
  </section>
{/if}
```

### Interakcja 2: Ukrywanie odpowiedzi

**Trigger**: Kliknięcie przycisku "Ukryj odpowiedź" (gdy odpowiedź jest widoczna)

**Przebieg**:
1. Użytkownik klika przycisk z tekstem "Ukryj odpowiedź"
2. Zmienna `showAnswer` zmienia wartość z `true` na `false`
3. Tekst przycisku zmienia się na "Odkryj odpowiedź"
4. Sekcja z odpowiedzią znika z animacją `fade` (300ms)

### Interakcja 3: Nawigacja (przez globalną Navbar)

**Trigger**: Kliknięcie linków w Navbar

**Dostępne akcje**:
- Powrót do listy historii (`/`)
- Generowanie nowej historii (`/generate`)
- Wylogowanie

## 9. Warunki i walidacja

### Walidacja po stronie serwera (`+page.server.ts`)

**Warunek 1: Format UUID**
- **Lokalizacja**: Funkcja `load` w `+page.server.ts`
- **Sprawdzenie**: `isValidUUID(params.id)`
- **Wpływ na UI**: Błąd 400 → Wyświetlenie strony błędu SvelteKit
- **Komunikat**: "Nieprawidłowy format identyfikatora historii"

**Warunek 2: Uwierzytelnienie użytkownika**
- **Lokalizacja**: `hooks.server.ts` (globalna middleware)
- **Sprawdzenie**: Obecność `locals.user`
- **Wpływ na UI**: Przekierowanie do `/login` dla niezalogowanych użytkowników
- **Implementacja**: Obsłużone automatycznie przez istniejące hooki

**Warunek 3: Istnienie historii**
- **Lokalizacja**: Zapytanie Supabase w funkcji `load`
- **Sprawdzenie**: `data !== null` po zapytaniu `.single()`
- **Wpływ na UI**: Błąd 404 → Wyświetlenie strony błędu
- **Komunikat**: "Nie znaleziono historii lub nie masz do niej dostępu"

**Warunek 4: Własność historii (RLS)**
- **Lokalizacja**: Polityka RLS w Supabase (`stories_select_own`)
- **Sprawdzenie**: Automatyczne filtrowanie przez `WHERE user_id = auth.uid()`
- **Wpływ na UI**: Błąd 404 dla historii należących do innych użytkowników
- **Bezpieczeństwo**: Użytkownik nie może rozróżnić czy historia nie istnieje, czy należy do kogoś innego

### Brak walidacji po stronie klienta

Komponent `+page.svelte` nie wykonuje żadnej walidacji - zakłada, że otrzymuje poprawne dane z funkcji `load`.

## 10. Obsługa błędów

### Scenariusz 1: Nieprawidłowy UUID w URL

**Przyczyna**: Użytkownik wpisał lub kliknął link z nieprawidłowym UUID

**Obsługa**:
```typescript
if (!isValidUUID(params.id)) {
  throw error(400, 'Nieprawidłowy format identyfikatora historii');
}
```

**Wynik**: SvelteKit wyświetli domyślną stronę błędu 400 (lub customową `+error.svelte` jeśli istnieje)

### Scenariusz 2: Historia nie istnieje

**Przyczyna**: Historia została usunięta lub nigdy nie istniała

**Obsługa**:
```typescript
if (dbError?.code === 'PGRST116' || !story) {
  throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
}
```

**Wynik**: Strona błędu 404

### Scenariusz 3: Próba dostępu do cudzej historii

**Przyczyna**: Użytkownik próbuje obejrzeć historię innego użytkownika

**Obsługa**: RLS automatycznie zwraca pusty wynik, który jest traktowany jak 404

**Wynik**: Strona błędu 404 (bez ujawniania informacji czy historia istnieje)

### Scenariusz 4: Błąd bazy danych

**Przyczyna**: Problem z połączeniem, timeout, błąd SQL

**Obsługa**:
```typescript
if (dbError) {
  console.error('[DB_ERROR] GET story failed', { /* ... */ });
  throw error(500, 'Nie udało się pobrać historii');
}
```

**Wynik**: Strona błędu 500

### Scenariusz 5: Brak uwierzytelnienia

**Przyczyna**: Sesja wygasła lub użytkownik nie jest zalogowany

**Obsługa**: Globalne hooki w `hooks.server.ts` przekierowują do `/login`

**Wynik**: Przekierowanie przed wywołaniem funkcji `load`

### Customowa strona błędu (opcjonalnie)

Można stworzyć `src/routes/stories/[id]/+error.svelte` dla lepszego UX:

```svelte
<script lang="ts">
  import { page } from '$app/stores';
</script>

<div class="error-container">
  <h1>{$page.status}</h1>
  <p>{$page.error?.message}</p>
  <a href="/">Wróć do listy historii</a>
</div>
```

## 11. Kroki implementacji

### Krok 1: Utworzenie struktury plików

```bash
mkdir -p src/routes/stories/[id]
touch src/routes/stories/[id]/+page.server.ts
touch src/routes/stories/[id]/+page.svelte
```

### Krok 2: Implementacja funkcji `load` w `+page.server.ts`

1. Zaimportować wymagane typy i helpery:
   - `PageServerLoad` z `./$types`
   - `error` z `@sveltejs/kit`
   - `isValidUUID` i `StoryDTO` z `../../../types`

2. Zdefiniować i wyeksportować funkcję `load`:
   ```typescript
   export const load: PageServerLoad = async ({ params, locals }) => {
     // Implementacja zgodnie z sekcją 7
   };
   ```

3. Dodać walidację UUID

4. Zaimplementować zapytanie do Supabase

5. Dodać obsługę błędów (4 scenariusze)

6. Dodać logowanie dla debugowania

### Krok 3: Implementacja komponentu `+page.svelte`

1. Zdefiniować blok `<script>`:
   ```svelte
   <script lang="ts">
     import { fade } from 'svelte/transition';
     import type { PageData } from './$types';

     let { data }: { data: PageData } = $props();
     let showAnswer = $state(false);
   </script>
   ```

2. Utworzyć strukturę HTML z mobile-first podejściem

3. Dodać kontener dla pytania z dużą czcionką

4. Zaimplementować przycisk toggle

5. Dodać warunkowo renderowaną sekcję odpowiedzi z `transition:fade`

### Krok 4: Stylizacja z Tailwind CSS

1. Zastosować dark mode klasy (DaisyUI domyślnie wspiera dark mode)

2. Mobile-first: Zacząć od podstawowych klas bez prefiksów responsywnych

3. Duża, czytelna czcionka dla pytania:
   ```html
   <p class="text-3xl md:text-4xl lg:text-5xl font-bold leading-relaxed">
   ```

4. Stylizacja przycisku:
   ```html
   <button class="btn btn-primary btn-lg w-full max-w-md">
   ```

5. Centrowanie i padding:
   ```html
   <main class="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
   ```

6. Stylizacja odpowiedzi (podobnie jak pytania, możliwe mniejsza czcionka):
   ```html
   <p class="text-xl md:text-2xl lg:text-3xl leading-relaxed">
   ```

### Krok 5: Testowanie funkcjonalności

**Test 1: Poprawne ładowanie historii**
- Zaloguj się jako użytkownik
- Przejdź do `/stories/{valid-uuid-of-own-story}`
- Sprawdź, czy pytanie się wyświetla
- Sprawdź, czy odpowiedź jest ukryta

**Test 2: Toggle odpowiedzi**
- Kliknij "Odkryj odpowiedź"
- Sprawdź animację fade-in
- Sprawdź, czy odpowiedź się wyświetla
- Sprawdź, czy przycisk zmienił tekst
- Kliknij "Ukryj odpowiedź"
- Sprawdź animację fade-out

**Test 3: Nieprawidłowy UUID**
- Przejdź do `/stories/invalid-uuid`
- Sprawdź, czy wyświetla się strona błędu 400

**Test 4: Nieistniejąca historia**
- Przejdź do `/stories/{valid-uuid-but-nonexistent}`
- Sprawdź, czy wyświetla się strona błędu 404

**Test 5: Cudza historia**
- Zaloguj się jako User A
- Pobierz UUID historii User B
- Jako User A przejdź do `/stories/{user-b-story-uuid}`
- Sprawdź, czy wyświetla się 404 (RLS blokuje)

**Test 6: Brak uwierzytelnienia**
- Wyloguj się
- Przejdź do `/stories/{any-uuid}`
- Sprawdź, czy następuje przekierowanie do `/login`

### Krok 6: Testowanie responsywności

1. Otwórz Chrome DevTools (F12)

2. Przełącz na widok urządzeń mobilnych (Ctrl+Shift+M)

3. Przetestuj na różnych rozmiarach:
   - iPhone SE (375px)
   - iPhone 12 Pro (390px)
   - iPad (768px)
   - Desktop (1920px)

4. Sprawdź:
   - Czy tekst jest czytelny na małych ekranach
   - Czy przycisk jest łatwy do kliknięcia (minimum 44x44px)
   - Czy padding jest odpowiedni
   - Czy nie ma horizontal scroll

### Krok 7: Testowanie dostępności

1. Sprawdź kontrast kolorów (WCAG AA minimum 4.5:1):
   - Użyj Chrome Lighthouse lub WebAIM Contrast Checker

2. Sprawdź nawigację klawiaturą:
   - Tab → przycisk powinien otrzymać focus
   - Enter/Space → przycisk powinien się aktywować

3. Sprawdź screen reader:
   - Przycisk powinien mieć zrozumiałą etykietę
   - Stan przycisku powinien być komunikowany

4. Opcjonalnie dodać atrybuty ARIA:
   ```html
   <button
     onclick={() => showAnswer = !showAnswer}
     aria-expanded={showAnswer}
   >
     {showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
   </button>
   ```

### Krok 8: Optymalizacja wydajności

1. Sprawdź SSR:
   - Pytanie powinno być widoczne już w HTML-u (View Source)

2. Sprawdź rozmiar bundle'a:
   - Brak dodatkowych zależności poza Svelte core

3. Sprawdź czas ładowania:
   - Funkcja `load` powinna wykonać się szybko (< 200ms)

### Krok 9: Code review i refaktoryzacja

1. Sprawdź zgodność z CLAUDE.md:
   - Używanie `$state` zamiast `$` prefix ✓
   - Server-side load functions ✓
   - Tailwind utility classes ✓

2. Sprawdź type safety:
   - Wszystkie typy poprawnie zdefiniowane
   - Brak `any` types

3. Sprawdź error handling:
   - Wszystkie scenariusze obsłużone
   - Odpowiednie logowanie

### Krok 10: Dokumentacja

1. Dodać komentarze JSDoc do funkcji `load`:
   ```typescript
   /**
    * Story Details Page - Game Mode
    *
    * @description Ultra-minimalistic interface for Game Master
    * @route /stories/[id]
    * @auth Required
    *
    * @throws {400} Invalid UUID format
    * @throws {404} Story not found or no access (RLS)
    * @throws {500} Database error
    */
   ```

2. Zaktualizować dokumentację projektu (jeśli istnieje)