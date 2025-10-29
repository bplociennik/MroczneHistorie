# Plan implementacji widoku Edycja Historii

## 1. Przegląd

Widok **Edycja Historii** umożliwia użytkownikowi poprawienie treści historii wygenerowanej przez AI. Użytkownik może edytować teksty pytania i odpowiedzi, natomiast parametry Trudności i Mroczności pozostają zablokowane (tylko do odczytu) zgodnie z ograniczeniami API. Po zapisaniu zmian użytkownik jest automatycznie przekierowywany na listę historii (`/`), gdzie może zobaczyć zaktualizowaną treść.

## 2. Routing widoku

**Ścieżka:** `/stories/[id]/edit`

**Struktura plików w SvelteKit:**
- `src/routes/stories/[id]/edit/+page.svelte` - główny komponent widoku
- `src/routes/stories/[id]/edit/+page.server.ts` - server load function i akcja serwerowa
- `src/routes/stories/[id]/edit/+page.ts` (opcjonalnie, jeśli potrzebna logika kliencka)

**Parametry:**
- `id` - UUID historii do edycji (wymagany, walidowany)

**Ochrona:**
- Strona wymaga uwierzytelnienia (przekierowanie na `/login` dla niezalogowanych użytkowników)
- Dostęp do historii chroniony przez RLS (Row Level Security) na poziomie bazy danych

## 3. Struktura komponentów

```
+page.svelte (EditStoryView)
├── Navigation (współdzielony komponent)
├── EditStoryForm
│   ├── FormField (Pytanie - textarea)
│   ├── FormField (Odpowiedź - textarea)
│   ├── ReadOnlyField (Trudność - disabled select)
│   ├── ReadOnlyField (Mroczność - disabled select)
│   └── SubmitButton
└── ErrorToast (warunkowe renderowanie)
```

## 4. Szczegóły komponentów

### EditStoryView (`+page.svelte`)

**Opis komponentu:**
Główny kontener widoku edycji historii. Odpowiada za pobranie danych historii z serwera, wyświetlenie formularza edycji oraz obsługę akcji zapisania zmian.

**Główne elementy:**
- `<Navigation>` - współdzielony komponent nawigacji
- `<form method="POST">` - natywny formularz HTML z progressive enhancement
- Sekcje formularza z polami edytowalnymi i tylko do odczytu
- Toast/alert dla komunikatów błędów

**Obsługiwane interakcje:**
- Submit formularza (zapisanie zmian)
- Nawigacja przez górny pasek (wyjście bez zapisywania)

**Warunki walidacji:**
- Załadowanie danych: sprawdzenie czy historia istnieje i czy użytkownik ma do niej dostęp (404 w przeciwnym przypadku)
- Przed submitem: przynajmniej jedno pole (pytanie lub odpowiedź) musi być wypełnione (min 1 znak)
- Ochrona przed próbą edycji read-only fields na poziomie UI (pola disabled)

**Typy:**
- `StoryDTO` - dla danych historii pobranych z load function
- `ActionData` - dla wyniku akcji serwerowej (sukces/błąd)
- `PageData` - typ danych zwracanych z load function

**Propsy:**
- `data: PageData` - dane z load function (zawiera `story: StoryDTO`)
- `form: ActionData | null` - wynik akcji formularza (błędy walidacji, komunikaty)

### EditStoryForm (część `+page.svelte`)

**Opis komponentu:**
Główny formularz edycji zawierający wszystkie pola. Wykorzystuje natywny `<form>` z metodą POST dla progressive enhancement i może być wzbogacony funkcją `enhance` z SvelteKit.

**Główne elementy:**
- `<textarea name="question">` - pole edycji pytania
- `<textarea name="answer">` - pole edycji odpowiedzi
- `<select disabled name="difficulty">` - wyświetlacz trudności (read-only)
- `<select disabled name="darkness">` - wyświetlacz mroczności (read-only)
- `<button type="submit">` - przycisk "Zapisz zmiany"

**Obsługiwane interakcje:**
- Zmiana treści w textarea (question, answer)
- Submit formularza
- Brak przycisku "Anuluj" - użytkownik wychodzi przez nawigację

**Warunki walidacji:**
- `question`: min 1 znak (jeśli wypełnione)
- `answer`: min 1 znak (jeśli wypełnione)
- Przynajmniej jedno z pól musi być niepuste
- Trudność i Mroczność są disabled - nie można ich edytować

**Typy:**
- `StoryDTO` - dla początkowych wartości formularza
- `UpdateStoryCommand` - dla danych wysyłanych do API

**Propsy:**
- `story: StoryDTO` - dane historii do wypełnienia formularza
- `errors?: { field?: string, message: string }` - błędy walidacji z akcji serwerowej

### FormField (Textarea)

**Opis komponentu:**
Reużywalny komponent pola tekstowego z etykietą, polem textarea i opcjonalnym komunikatem błędu. Stylizowany zgodnie z DaisyUI w dark mode.

**Główne elementy:**
- `<label>` - etykieta pola
- `<textarea>` - pole wieloliniowe
- `<span class="error">` - komunikat błędu (warunkowy)

**Obsługiwane interakcje:**
- Zmiana wartości textarea
- Focus/blur dla efektów wizualnych

**Warunki walidacji:**
- Minimalny wymagany znak: 1 (jeśli pole jest wypełnione)
- Inline walidacja (opcjonalnie przez `:invalid` CSS lub JS)

**Typy:**
- `string` - wartość textarea
- `{ field: string, message: string } | undefined` - błąd walidacji

**Propsy:**
```typescript
interface FormFieldProps {
  name: string;           // nazwa HTML input
  label: string;          // tekst etykiety
  value: string;          // początkowa wartość
  placeholder?: string;   // placeholder textarea
  rows?: number;          // liczba wierszy (default: 6)
  error?: string;         // komunikat błędu
  required?: boolean;     // czy pole wymagane
}
```

### ReadOnlyField (Select)

**Opis komponentu:**
Pole tylko do odczytu wyświetlające poziom Trudności lub Mroczności. Wykorzystuje `<select disabled>` dla spójności z resztą formularza.

**Główne elementy:**
- `<label>` - etykieta pola
- `<select disabled>` - lista rozwijana (zablokowana)
- `<option selected>` - wybrana wartość

**Obsługiwane interakcje:**
- Brak (pole disabled)

**Warunki walidacji:**
- Brak (pole tylko do odczytu, nie jest walidowane ani wysyłane)

**Typy:**
- `1 | 2 | 3` - wartość poziomu (StoryDifficulty lub StoryDarkness)

**Propsy:**
```typescript
interface ReadOnlyFieldProps {
  label: string;                          // "Trudność" lub "Mroczność"
  value: 1 | 2 | 3;                      // wybrany poziom
  options: { value: number, label: string }[];  // lista opcji do wyświetlenia
}
```

### SubmitButton

**Opis komponentu:**
Przycisk zatwierdzający formularz. Może wyświetlać stan ładowania podczas wysyłania żądania.

**Główne elementy:**
- `<button type="submit">` - przycisk HTML
- Opcjonalny spinner/loader podczas submitu

**Obsługiwane interakcje:**
- Kliknięcie (submit formularza)
- Wyłączenie podczas ładowania (disabled)

**Warunki walidacji:**
- Disabled podczas wysyłania formularza (zapobiega wielokrotnemu submitowi)

**Typy:**
- `boolean` - stan ładowania

**Propsy:**
```typescript
interface SubmitButtonProps {
  loading?: boolean;      // czy formularz jest wysyłany
  disabled?: boolean;     // czy przycisk wyłączony
  label?: string;         // tekst przycisku (default: "Zapisz zmiany")
}
```

## 5. Typy

### Typy istniejące (z `src/types.ts`):

```typescript
// Kompletna historia z bazy danych
export type StoryDTO = Tables<'stories'>;
// Zawiera: id, user_id, subject, difficulty, darkness, question, answer, created_at

// Komenda aktualizacji historii (tylko question i/lub answer)
export type UpdateStoryCommand = Pick<
  TablesUpdate<'stories'>,
  'question' | 'answer'
>;

// Standardowa odpowiedź błędu
export interface ErrorDTO {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
  };
}
```

### Nowe typy ViewModel (do stworzenia):

```typescript
// Dane zwracane przez load function
export interface EditStoryPageData {
  story: StoryDTO;
}

// Wynik akcji serwerowej (sukces lub błąd)
export type EditStoryActionData =
  | { success: true }
  | {
      success: false;
      error: {
        code: string;
        message: string;
        field?: string;
      }
    };

// Opcje dla select boxes (Trudność/Mroczność)
export interface SelectOption {
  value: number;
  label: string;
}

// Konfiguracja dla pól formularza
export interface FormFieldConfig {
  name: 'question' | 'answer';
  label: string;
  placeholder: string;
  rows: number;
}

// Stan formularza podczas edycji
export interface EditFormState {
  question: string;
  answer: string;
  isSubmitting: boolean;
  isDirty: boolean;  // czy formularz został zmieniony
}
```

### Stałe konfiguracyjne:

```typescript
// Etykiety dla poziomów trudności
export const DIFFICULTY_LABELS: Record<1 | 2 | 3, string> = {
  1: '1 - Łatwa',
  2: '2 - Średnia',
  3: '3 - Trudna'
};

// Etykiety dla poziomów mroczności
export const DARKNESS_LABELS: Record<1 | 2 | 3, string> = {
  1: '1 - Tajemnicza',
  2: '2 - Niepokojąca',
  3: '3 - Brutalna'
};

// Konfiguracja pól formularza
export const FORM_FIELDS: FormFieldConfig[] = [
  {
    name: 'question',
    label: 'Pytanie',
    placeholder: 'Wpisz pytanie historii...',
    rows: 6
  },
  {
    name: 'answer',
    label: 'Odpowiedź',
    placeholder: 'Wpisz odpowiedź historii...',
    rows: 8
  }
];
```

## 6. Zarządzanie stanem

### Stan serwerowy (SvelteKit stores):

**`$page.data`** - dane z load function:
- `story: StoryDTO` - aktualne dane edytowanej historii

**`$page.form`** - wynik akcji serwerowej:
- `success: boolean` - czy akcja się powiodła
- `error?: ErrorDTO['error']` - szczegóły błędu (jeśli wystąpił)

### Stan lokalny (Svelte runes):

```typescript
// Stan formularza
let formState = $state<EditFormState>({
  question: data.story.question,
  answer: data.story.answer,
  isSubmitting: false,
  isDirty: false
});

// Śledzenie zmian w formularzu
$effect(() => {
  formState.isDirty =
    formState.question !== data.story.question ||
    formState.answer !== data.story.answer;
});
```

### Nie wymaga custom hooka:
Stan jest prosty i zarządzany przez:
1. SvelteKit page stores (`$page`)
2. Wbudowane runes Svelte (`$state`, `$effect`)
3. Natywny formularz z progressive enhancement (`enhance` function)

## 7. Integracja API

### Endpoint:
**PATCH** `/api/stories/:id`

### Load Function (`+page.server.ts`):

```typescript
import type { PageServerLoad } from './$types';
import type { StoryDTO, ErrorDTO } from '$lib/types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
  // 1. Sprawdź uwierzytelnienie
  if (!locals.user) {
    throw redirect(302, '/login');
  }

  // 2. Walidacja UUID
  if (!isValidUUID(params.id)) {
    throw error(400, 'Nieprawidłowy format identyfikatora historii');
  }

  // 3. Pobierz historię z bazy
  const { data: story, error: dbError } = await locals.supabase
    .from('stories')
    .select('*')
    .eq('id', params.id)
    .single();

  // 4. Obsłuż błędy
  if (dbError || !story) {
    throw error(404, 'Nie znaleziono historii lub nie masz do niej dostępu');
  }

  // 5. Zwróć dane
  return {
    story: story as StoryDTO
  };
};
```

**Typ żądania:** Brak (GET wykonywany automatycznie przez SvelteKit)

**Typ odpowiedzi:** `{ story: StoryDTO }`

### Server Action (`+page.server.ts`):

```typescript
import type { Actions } from './$types';
import type { UpdateStoryCommand } from '$lib/types';

export const actions: Actions = {
  default: async ({ params, request, locals, fetch }) => {
    // 1. Sprawdź uwierzytelnienie
    if (!locals.user) {
      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
        }
      };
    }

    // 2. Pobierz dane z formularza
    const formData = await request.formData();
    const question = formData.get('question')?.toString().trim();
    const answer = formData.get('answer')?.toString().trim();

    // 3. Walidacja po stronie serwera
    if (!question && !answer) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Musisz podać przynajmniej jedno pole do aktualizacji'
        }
      };
    }

    if (question !== undefined && question.length < 1) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Pytanie musi mieć przynajmniej 1 znak',
          field: 'question'
        }
      };
    }

    if (answer !== undefined && answer.length < 1) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Odpowiedź musi mieć przynajmniej 1 znak',
          field: 'answer'
        }
      };
    }

    // 4. Przygotuj payload
    const updatePayload: UpdateStoryCommand = {};
    if (question) updatePayload.question = question;
    if (answer) updatePayload.answer = answer;

    // 5. Wywołaj API endpoint
    const response = await fetch(`/api/stories/${params.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updatePayload)
    });

    // 6. Obsłuż odpowiedź
    if (!response.ok) {
      const errorData: ErrorDTO = await response.json();
      return {
        success: false,
        error: errorData.error
      };
    }

    // 7. Sukces - przekieruj na listę
    throw redirect(303, '/');
  }
};
```

**Typ żądania:** `UpdateStoryCommand` (zawiera `question?: string` i/lub `answer?: string`)

**Typ odpowiedzi:** `StoryDTO` (sukces) lub `ErrorDTO` (błąd)

**Kody statusu:**
- `200` - Sukces, historia zaktualizowana
- `400` - Błąd walidacji (puste pola, próba edycji read-only fields)
- `401` - Brak uwierzytelnienia
- `404` - Historia nie istnieje lub brak dostępu (RLS)
- `500` - Błąd serwera

## 8. Interakcje użytkownika

### Załadowanie strony:
1. Użytkownik klika ikonę "Edytuj" na liście historii (`/`)
2. Nawigacja do `/stories/[id]/edit`
3. Load function pobiera dane historii z bazy
4. Formularz renderuje się z wypełnionymi polami:
   - Pytanie (textarea, edytowalne)
   - Odpowiedź (textarea, edytowalne)
   - Trudność (select, disabled)
   - Mroczność (select, disabled)

### Edycja treści:
1. Użytkownik modyfikuje tekst w polu "Pytanie" lub "Odpowiedź"
2. Stan `isDirty` zmienia się na `true` (opcjonalne, do wizualizacji)
3. Zmienione wartości są przechowywane w lokalnym stanie komponentu

### Próba edycji zablokowanych pól:
1. Użytkownik widzi pola "Trudność" i "Mroczność"
2. Pola są wizualnie wyłączone (disabled, wyszarzone)
3. Użytkownik nie może zmienić ich wartości (zablokowane na poziomie HTML)

### Zapisanie zmian:
1. Użytkownik klika przycisk "Zapisz zmiany"
2. Formularz jest wysyłany (POST) do akcji serwerowej
3. Przycisk pokazuje stan ładowania (`isSubmitting: true`, disabled, spinner)
4. Akcja serwerowa:
   - Waliduje dane
   - Wywołuje PATCH `/api/stories/:id`
   - Obsługuje odpowiedź
5. W przypadku sukcesu:
   - Przekierowanie na `/` (lista historii)
   - Użytkownik widzi zaktualizowaną historię na liście
6. W przypadku błędu:
   - Pozostanie na stronie edycji
   - Wyświetlenie komunikatu błędu (toast lub inline)
   - `isSubmitting: false`, przycisk ponownie aktywny

### Wyjście bez zapisywania:
1. Użytkownik klika link w nawigacji (np. "Moje Historie")
2. Natywna nawigacja SvelteKit
3. Zmiany nie są zapisywane (brak potwierdzenia w MVP)
4. Nawigacja do wybranej strony

### Scenariusz błędu 404:
1. Użytkownik próbuje otworzyć `/stories/[invalid-id]/edit`
2. Load function wykrywa błąd (nieprawidłowe UUID lub brak dostępu)
3. SvelteKit renderuje stronę błędu 404
4. Użytkownik może wrócić do głównej strony przez nawigację

## 9. Warunki i walidacja

### Walidacja po stronie serwera (Server Action):

**Warunek 1: Uwierzytelnienie**
- Komponent: Cała strona
- Warunek: Użytkownik musi być zalogowany (`locals.user` istnieje)
- Wpływ: Brak dostępu → przekierowanie na `/login`
- Implementacja: Load function sprawdza `locals.user`

**Warunek 2: Prawidłowy UUID**
- Komponent: URL parameter
- Warunek: `params.id` musi być prawidłowym UUID v4
- Wpływ: Nieprawidłowy format → błąd 400
- Implementacja: `isValidUUID(params.id)` w load function

**Warunek 3: Dostęp do historii**
- Komponent: Pobieranie danych
- Warunek: Historia musi istnieć i należeć do zalogowanego użytkownika (RLS)
- Wpływ: Brak dostępu → błąd 404
- Implementacja: Query do Supabase z RLS policy

**Warunek 4: Przynajmniej jedno pole**
- Komponent: Formularz (akcja serwerowa)
- Warunek: `question` lub `answer` musi być wypełnione
- Wpływ: Oba puste → błąd walidacji
- Implementacja: Sprawdzenie w akcji przed wywołaniem API

**Warunek 5: Minimalna długość pytania**
- Komponent: Textarea "Pytanie"
- Warunek: Jeśli wypełnione, min 1 znak (po trim)
- Wpływ: Puste → błąd walidacji z `field: 'question'`
- Implementacja: Walidacja w akcji serwerowej

**Warunek 6: Minimalna długość odpowiedzi**
- Komponent: Textarea "Odpowiedź"
- Warunek: Jeśli wypełnione, min 1 znak (po trim)
- Wpływ: Puste → błąd walidacji z `field: 'answer'`
- Implementacja: Walidacja w akcji serwerowej

**Warunek 7: Read-only fields**
- Komponent: Select "Trudność" i "Mroczność"
- Warunek: Pola nie mogą być edytowane
- Wpływ: Próba edycji na poziomie API → błąd 400 (zabezpieczenie po stronie API)
- Implementacja: `disabled` attribute na `<select>`, weryfikacja w API

### Walidacja po stronie klienta (opcjonalna, dla UX):

**Inline validation:**
- Komponent: Textarea fields
- Warunek: Required attribute lub custom JS validation
- Wpływ: Wizualna informacja o błędzie przed submitem
- Implementacja: HTML5 validation lub Svelte reactive statements

**Dirty state tracking:**
- Komponent: Cały formularz
- Warunek: Czy wartości się zmieniły od załadowania
- Wpływ: Wizualizacja (opcjonalnie: ostrzeżenie przed wyjściem)
- Implementacja: `$effect` porównujący obecne wartości z początkowymi

## 10. Obsługa błędów

### Błędy podczas ładowania (Load Function):

**Błąd 1: Brak uwierzytelnienia**
- Przyczyna: `locals.user` nie istnieje
- Kod: 401 (ale przekierowanie na `/login`)
- Komunikat: Brak (automatyczne przekierowanie)
- Obsługa: `throw redirect(302, '/login')` w load function

**Błąd 2: Nieprawidłowy UUID**
- Przyczyna: `params.id` nie jest prawidłowym UUID
- Kod: 400
- Komunikat: "Nieprawidłowy format identyfikatora historii"
- Obsługa: `throw error(400, message)` → renderowanie `+error.svelte`

**Błąd 3: Historia nie znaleziona**
- Przyczyna: Historia nie istnieje lub użytkownik nie ma dostępu (RLS)
- Kod: 404
- Komunikat: "Nie znaleziono historii lub nie masz do niej dostępu"
- Obsługa: `throw error(404, message)` → renderowanie `+error.svelte`

**Błąd 4: Błąd bazy danych**
- Przyczyna: Błąd Supabase podczas pobierania danych
- Kod: 500
- Komunikat: "Nie udało się załadować historii. Spróbuj ponownie później"
- Obsługa: `throw error(500, message)` → renderowanie `+error.svelte`

### Błędy podczas zapisywania (Server Action):

**Błąd 5: Puste pola**
- Przyczyna: Użytkownik nie wypełnił żadnego pola (lub tylko whitespace)
- Kod: 400 (VALIDATION_ERROR)
- Komunikat: "Musisz podać przynajmniej jedno pole do aktualizacji"
- Obsługa:
  - Return `{ success: false, error }` z akcji
  - Wyświetlenie toastu lub inline error w formularzu
  - `{#if form?.error} <Alert>{form.error.message}</Alert> {/if}`

**Błąd 6: Za krótkie pole**
- Przyczyna: Pytanie lub odpowiedź ma 0 znaków po trim
- Kod: 400 (VALIDATION_ERROR)
- Komunikat: "Pytanie/Odpowiedź musi mieć przynajmniej 1 znak"
- Obsługa:
  - Return `{ success: false, error: { field, message } }`
  - Wyświetlenie błędu przy konkretnym polu
  - `{#if form?.error?.field === 'question'} <span class="error">{form.error.message}</span> {/if}`

**Błąd 7: Próba edycji read-only fields**
- Przyczyna: (teoretyczna) Manipulacja żądania, próba edycji subject/difficulty/darkness
- Kod: 400 (VALIDATION_ERROR)
- Komunikat: "Pole '{field}' jest tylko do odczytu i nie może być aktualizowane"
- Obsługa: Jak błąd 5 (nie powinno się zdarzyć przy prawidłowym UI)

**Błąd 8: Błąd API/bazy podczas zapisu**
- Przyczyna: Supabase zwrócił błąd podczas PATCH
- Kod: 500 (INTERNAL_ERROR)
- Komunikat: "Nie udało się zaktualizować historii. Spróbuj ponownie później"
- Obsługa: Toast z komunikatem błędu, możliwość ponownej próby

**Błąd 9: Historia nie istnieje (podczas zapisu)**
- Przyczyna: Historia została usunięta w międzyczasie lub użytkownik stracił dostęp
- Kod: 404 (NOT_FOUND)
- Komunikat: "Nie znaleziono historii lub nie masz do niej dostępu"
- Obsługa: Toast + przekierowanie na `/` po 2 sekundach

### Przypadki brzegowe:

**Przypadek 1: Bardzo długi tekst**
- Scenariusz: Użytkownik wpisuje ekstremalnie długi tekst (>10000 znaków)
- Obsługa:
  - Textarea może mieć `maxlength` (opcjonalnie)
  - Backend nie ma limitu górnego w MVP
  - Postgres obsługuje bardzo długie stringi (text type)

**Przypadek 2: Równoczesna edycja**
- Scenariusz: Użytkownik otwiera edycję w dwóch kartach
- Obsługa:
  - Last write wins (standard dla RESTful API)
  - Brak mechanizmu optimistic locking w MVP
  - Późniejszy zapis nadpisuje wcześniejszy

**Przypadek 3: Utrata połączenia**
- Scenariusz: Brak internetu podczas submitu
- Obsługa:
  - Fetch API zwróci błąd sieciowy
  - Wyświetlenie toastu "Sprawdź połączenie internetowe"
  - Dane formularza zachowane w stanie komponentu (można spróbować ponownie)

**Przypadek 4: Session timeout**
- Scenariusz: Token Supabase wygasł podczas edycji
- Obsługa:
  - API zwróci 401 AUTHENTICATION_ERROR
  - Przekierowanie na `/login` z komunikatem
  - Supabase może automatycznie odświeżyć token (jeśli skonfigurowane)

## 11. Kroki implementacji

### Krok 1: Przygotowanie typów i stałych
- [ ] Zdefiniować nowe typy ViewModel w `src/lib/types/viewModels.ts`:
  - `EditStoryPageData`
  - `EditStoryActionData`
  - `FormFieldConfig`
  - `EditFormState`
- [ ] Stworzyć stałe konfiguracyjne w `src/lib/constants/forms.ts`:
  - `DIFFICULTY_LABELS`
  - `DARKNESS_LABELS`
  - `FORM_FIELDS`

### Krok 2: Utworzenie struktury routingu
- [ ] Utworzyć folder `src/routes/stories/[id]/edit/`
- [ ] Stworzyć pusty plik `+page.svelte`
- [ ] Stworzyć plik `+page.server.ts`

### Krok 3: Implementacja Load Function
- [ ] W `+page.server.ts` zaimportować wymagane typy
- [ ] Zaimplementować `load: PageServerLoad`:
  - Sprawdzenie uwierzytelnienia
  - Walidacja UUID z `params.id`
  - Pobranie historii z Supabase
  - Obsługa błędów (404, 500)
  - Zwrócenie `{ story: StoryDTO }`
- [ ] Przetestować load function (otwarcie strony, błędne UUID, cudza historia)

### Krok 4: Implementacja Server Action
- [ ] W `+page.server.ts` zaimplementować `actions: Actions`:
  - Default action do obsługi submitu formularza
  - Pobranie danych z `formData`
  - Walidacja po stronie serwera (puste pola, min długość)
  - Przygotowanie `UpdateStoryCommand`
  - Wywołanie fetch do `/api/stories/:id` z metodą PATCH
  - Obsługa odpowiedzi (sukces → redirect, błąd → return error)
- [ ] Przetestować action (różne scenariusze walidacji)

### Krok 5: Stworzenie komponentu FormField
- [ ] Utworzyć `src/lib/components/forms/FormField.svelte`
- [ ] Zdefiniować interface props: `name`, `label`, `value`, `placeholder`, `rows`, `error`, `required`
- [ ] Zaimplementować strukturę HTML:
  - `<label>` z odpowiednią stylizacją DaisyUI
  - `<textarea>` z bindowaniem wartości
  - Warunkowe wyświetlenie `<span class="error">`
- [ ] Dodać stylizację Tailwind (dark mode, focus states)
- [ ] Przetestować komponent w izolacji (Storybook lub osobna strona)

### Krok 6: Stworzenie komponentu ReadOnlyField
- [ ] Utworzyć `src/lib/components/forms/ReadOnlyField.svelte`
- [ ] Zdefiniować interface props: `label`, `value`, `options`
- [ ] Zaimplementować strukturę HTML:
  - `<label>` z stylizacją DaisyUI
  - `<select disabled>` z opcjami
  - `<option selected>` odpowiadający wartości
- [ ] Stylizacja Tailwind dla disabled state (wyszarzenie, cursor not-allowed)
- [ ] Przetestować komponent z różnymi wartościami (1, 2, 3)

### Krok 7: Stworzenie komponentu SubmitButton
- [ ] Utworzyć `src/lib/components/forms/SubmitButton.svelte`
- [ ] Zdefiniować interface props: `loading`, `disabled`, `label`
- [ ] Zaimplementować strukturę HTML:
  - `<button type="submit">` z DaisyUI classes
  - Warunkowe wyświetlenie spinnera podczas loading
  - Disabled state gdy loading lub explicitly disabled
- [ ] Stylizacja Tailwind (primary button, dark mode)
- [ ] Przetestować różne stany (normal, loading, disabled)

### Krok 8: Implementacja głównego widoku (+page.svelte)
- [ ] W `+page.svelte` zaimportować:
  - Komponenty: `Navigation`, `FormField`, `ReadOnlyField`, `SubmitButton`
  - Typy: `PageData`, `ActionData`
  - Stałe: `DIFFICULTY_LABELS`, `DARKNESS_LABELS`, `FORM_FIELDS`
  - Funkcje: `enhance` z SvelteKit
- [ ] Zdefiniować props: `data`, `form`
- [ ] Zaimplementować stan lokalny z runami:
  ```svelte
  <script lang="ts">
    let { data, form } = $props();
    let isSubmitting = $state(false);
  </script>
  ```
- [ ] Zbudować strukturę HTML:
  - Komponent `<Navigation>`
  - Główny kontener z padding i max-width
  - Nagłówek "Edytuj Historię"
  - `<form method="POST" use:enhance>`
- [ ] Dodać pola formularza używając komponentów:
  - Dwa `<FormField>` dla pytania i odpowiedzi
  - Dwa `<ReadOnlyField>` dla trudności i mroczności
  - `<SubmitButton>`
- [ ] Zaimplementować funkcję `enhance`:
  ```javascript
  use:enhance={() => {
    isSubmitting = true;
    return async ({ update }) => {
      await update();
      isSubmitting = false;
    };
  }}
  ```
- [ ] Dodać wyświetlanie błędów globalnych (jeśli `form?.error`)

### Krok 9: Stylizacja i responsive design
- [ ] Zastosować klasy Tailwind dla mobile-first:
  - Główny kontener: `px-4 py-6 max-w-2xl mx-auto`
  - Formularz: `space-y-6`
  - Przycisk: `w-full sm:w-auto`
- [ ] Upewnić się, że dark mode działa poprawnie (wszystkie elementy)
- [ ] Przetestować na różnych rozmiarach ekranu (mobile, tablet, desktop)
- [ ] Sprawdzić accessibility:
  - Wszystkie pola mają `<label>`
  - Focus states są widoczne
  - Textarea ma odpowiedni contrast ratio

### Krok 10: Obsługa błędów i edge cases
- [ ] Zaimplementować wyświetlanie błędów walidacji:
  - Błędy globalne jako toast lub alert na górze formularza
  - Błędy pól jako inline messages przy textarea
- [ ] Dodać obsługę przypadku "historia nie istnieje":
  - Strona `+error.svelte` (jeśli nie istnieje)
  - Customowy komunikat dla 404
- [ ] Przetestować wszystkie scenariusze błędów:
  - Puste pola
  - Nieprawidłowe UUID
  - Brak dostępu do historii
  - Błąd sieciowy

### Krok 11: Testowanie integracyjne
- [ ] Przetestować pełny flow:
  1. Wejście na `/` (lista historii)
  2. Kliknięcie ikony edycji
  3. Załadowanie strony edycji z danymi
  4. Modyfikacja pytania/odpowiedzi
  5. Zapisanie zmian
  6. Przekierowanie na `/`
  7. Weryfikacja zaktualizowanych danych na liście
- [ ] Przetestować scenariusze negatywne:
  - Submit bez zmian
  - Submit z pustymi polami
  - Wyjście bez zapisywania (przez nawigację)
  - Próba edycji cudzej historii (przez zmianę URL)

### Krok 12: Testy E2E (Playwright)
- [ ] Utworzyć plik `tests/edit-story.spec.ts`
- [ ] Zaimplementować testy:
  - Test 1: Załadowanie strony edycji z poprawnymi danymi
  - Test 2: Udana edycja i zapis historii
  - Test 3: Walidacja pustych pól
  - Test 4: Redirect po sukcesie
  - Test 5: Obsługa 404 dla nieistniejącej historii
  - Test 6: Zabezpieczenie przed niezalogowanymi użytkownikami
- [ ] Uruchomić testy: `npm run test:e2e`
- [ ] Upewnić się, że wszystkie testy przechodzą

### Krok 13: Code review i refactoring
- [ ] Przejrzeć kod pod kątem:
  - Zgodności z ESLint rules
  - Formatowania (Prettier)
  - TypeScript errors
  - Duplikacji kodu
  - Best practices SvelteKit
- [ ] Uruchomić `npm run check` i naprawić wszystkie błędy
- [ ] Uruchomić `npm run lint` i naprawić wszystkie warningi
- [ ] Sformatować kod: `npm run format`

### Krok 14: Dokumentacja
- [ ] Dodać komentarze JSDoc do komponentów
- [ ] Zaktualizować README (jeśli potrzebne)
- [ ] Dodać komentarze do skomplikowanych części kodu
- [ ] Udokumentować nowe typy i interfejsy
