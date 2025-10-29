# Plan implementacji widoku Generator Historii

## 1. Przegląd

Widok Generator Historii (`/generate`) stanowi **rdzeń aplikacji MroczneHistorie** - realizuje główną pętlę wartości (value loop), pozwalając użytkownikom na:
1. Konfigurację parametrów historii (temat, trudność, mroczność)
2. Generowanie unikalnej zagadki przez AI (OpenAI)
3. Podgląd wygenerowanej historii
4. Zapisanie historii do kolekcji lub wygenerowanie nowej

Jest to widok **dwustanowy** (state machine):
- **Stan 1: Formularz** - użytkownik konfiguruje parametry generowania
- **Stan 2: Podgląd** - użytkownik przegląda wygenerowaną historię i decyduje o dalszych krokach

Kluczowe cechy:
- **Protected route** - wymaga uwierzytelnienia (redirect → `/login`)
- **AI-powered** - integracja z OpenAI API przez backend
- **Progressive enhancement** - działa z i bez JavaScript (SvelteKit Form Actions)
- **Long-running operation** - timeout 45 sekund z pełnoekranowym loaderem
- **Error resilient** - obsługa timeout, rate limits, błędów API
- **UX-focused** - wyraźny feedback, disabled states, loading indicators

Widok wykorzystuje globalny loader i toast system zaimplementowane w Widoku 1 (Globalny Layout).

## 2. Routing widoku

**Ścieżka główna:** `/generate`

**Pliki implementacji:**
- `src/routes/generate/+page.svelte` - główny komponent widoku
- `src/routes/generate/+page.server.ts` - server-side logic, actions, guards

**Ochrona dostępu:**
```typescript
// +page.server.ts - load function
export const load: PageServerLoad = async ({ locals }) => {
  // Guard: redirect niezalogowanych na /login
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {
    // Dane początkowe jeśli potrzebne
  };
};
```

**Form Actions:**
- `?/generate` - generuje historię przez OpenAI API
- `?/save` - zapisuje wygenerowaną historię do bazy danych

**Nawigacja z tego widoku:**
- `/` - po zapisaniu historii (action ?/save)
- Pozostanie na `/generate` - po błędzie lub "Wygeneruj ponownie"

**Nawigacja na ten widok:**
- Z `<EmptyState />` w Widoku 2 (przycisk CTA)
- Z nawigacji (link "Generuj (+)")
- Z listy historii (przycisk "Wygeneruj nową historię")

## 3. Struktura komponentów

```
+page.svelte (główny kontener)
│
├── <script>
│   ├── data: PageData (z +page.server.ts)
│   ├── form: ActionData (z form action response)
│   ├── showAnswer: boolean (lokalny stan)
│   └── enhance (SvelteKit progressive enhancement)
│
├── {#if !data.generatedStory && !form?.generatedStory}
│   │
│   └── Stan 1: Formularz Generowania
│       │
│       ├── <div class="page-header">
│       │   └── <h1> Wygeneruj Nową Historię
│       │
│       └── <form method="POST" action="?/generate" use:enhance>
│           │
│           ├── <div class="form-group">
│           │   ├── <label for="subject"> Temat historii
│           │   ├── <div class="input-with-button">
│           │   │   ├── <input
│           │   │   │       type="text"
│           │   │   │       name="subject"
│           │   │   │       id="subject"
│           │   │   │       required
│           │   │   │       maxlength="150"
│           │   │   │       value={form?.formData?.subject || ''}
│           │   │   │   />
│           │   │   └── <button
│           │   │           type="button"
│           │   │           on:click={randomizeSubject}
│           │   │       >
│           │   │       Losuj
│           │   │
│           │   └── {#if form?.errors?.subject}
│           │       └── <span class="error"> {form.errors.subject}
│           │
│           ├── <div class="form-group">
│           │   ├── <label for="difficulty"> Trudność
│           │   └── <select name="difficulty" id="difficulty">
│           │       ├── <option value="1"> 1 - Łatwa
│           │       ├── <option value="2"> 2 - Średnia
│           │       └── <option value="3"> 3 - Trudna
│           │
│           ├── <div class="form-group">
│           │   ├── <label for="darkness"> Mroczność
│           │   └── <select name="darkness" id="darkness">
│           │       ├── <option value="1"> 1 - Tajemnicza
│           │       ├── <option value="2"> 2 - Niepokojąca
│           │       └── <option value="3"> 3 - Brutalna
│           │
│           └── <button type="submit" class="btn btn-primary btn-lg">
│               Generuj Historię
│
└── {#if data.generatedStory || form?.generatedStory}
    │
    └── Stan 2: Podgląd Wygenerowanej Historii
        │
        ├── <div class="page-header">
        │   └── <h1> Twoja Nowa Historia
        │
        ├── <div class="story-preview-card">
        │   │
        │   ├── <div class="story-section">
        │   │   ├── <h2> Pytanie:
        │   │   └── <p class="story-question">
        │   │       {story.question}
        │   │
        │   ├── <button
        │   │       type="button"
        │   │       on:click={toggleAnswer}
        │   │       class="btn btn-secondary"
        │   │   >
        │   │   {showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
        │   │
        │   └── {#if showAnswer}
        │       └── <div class="story-section" transition:slide>
        │           ├── <h2> Odpowiedź:
        │           └── <p class="story-answer">
        │               {story.answer}
        │
        ├── <div class="story-metadata">
        │   ├── <span class="badge"> T: {formData.difficulty}
        │   ├── <span class="badge"> M: {formData.darkness}
        │   └── <span class="badge"> {formData.subject}
        │
        └── <div class="action-buttons">
            │
            ├── <form method="POST" action="?/save" use:enhance>
            │   ├── <input type="hidden" name="subject" value={formData.subject}>
            │   ├── <input type="hidden" name="difficulty" value={formData.difficulty}>
            │   ├── <input type="hidden" name="darkness" value={formData.darkness}>
            │   ├── <input type="hidden" name="question" value={story.question}>
            │   ├── <input type="hidden" name="answer" value={story.answer}>
            │   └── <button type="submit" class="btn btn-primary btn-lg">
            │       Zapisz na mojej liście
            │
            └── <form method="POST" action="?/generate" use:enhance>
                ├── <input type="hidden" name="subject" value={formData.subject}>
                ├── <input type="hidden" name="difficulty" value={formData.difficulty}>
                ├── <input type="hidden" name="darkness" value={formData.darkness}>
                └── <button type="submit" class="btn btn-outline btn-lg">
                    Wygeneruj ponownie
```

## 4. Szczegóły komponentów

### Komponent: `+page.svelte` (główny plik widoku)

**Opis komponentu:**
Główny kontener widoku odpowiedzialny za renderowanie dwóch stanów: formularza generowania i podglądu wygenerowanej historii. Wykorzystuje SvelteKit Form Actions z progressive enhancement, co oznacza że działa zarówno z włączonym jak i wyłączonym JavaScript. Zarządza lokalnym stanem widoczności odpowiedzi oraz logiką losowania tematu.

**Główne elementy HTML i komponenty:**
```svelte
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { loadingStore } from '$lib/stores/loading';
  import { toastStore } from '$lib/stores/toasts';
  import { slide } from 'svelte/transition';
  import type { GeneratedStoryDTO } from '../../types';

  export let data: PageData;
  export let form: ActionData;

  // Stan lokalny
  let showAnswer = $state(false);

  // Lista 50 losowych słów (PRD 2.3)
  const randomSubjects = [
    'Tajemnicza latarnia morska',
    'Znikający autostopowicz',
    'Opuszczony psychiatryk',
    'Stary zegarmistrz',
    'Mroczny las',
    // ... 45 więcej
  ];

  // Funkcje pomocnicze
  function randomizeSubject() {
    const input = document.getElementById('subject') as HTMLInputElement;
    if (input) {
      const randomIndex = Math.floor(Math.random() * randomSubjects.length);
      input.value = randomSubjects[randomIndex];
      input.focus();
    }
  }

  function toggleAnswer() {
    showAnswer = !showAnswer;
  }

  // Reactive derived values
  $: story = (form?.generatedStory || data.generatedStory) as GeneratedStoryDTO | undefined;
  $: formData = form?.formData || data.formData || { difficulty: 1, darkness: 1, subject: '' };
</script>

<svelte:head>
  <title>Generuj Historię - MroczneHistorie</title>
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  {#if !story}
    <!-- Stan 1: Formularz -->
    <div class="page-header mb-8">
      <h1 class="text-4xl font-bold">Wygeneruj Nową Historię</h1>
      <p class="text-lg opacity-80 mt-2">
        Podaj temat i dostosuj parametry, a AI stworzy dla Ciebie unikalną mroczną zagadkę.
      </p>
    </div>

    <form
      method="POST"
      action="?/generate"
      class="card bg-base-100 shadow-xl"
      use:enhance={() => {
        loadingStore.start('Tworzymy Twoją mroczną historię...');

        return async ({ result, update }) => {
          loadingStore.stop();

          if (result.type === 'failure') {
            // Form action zwróciło błąd
            toastStore.addToast(
              result.data?.error || 'Nie udało się wygenerować historii',
              'error'
            );
          }

          if (result.type === 'success') {
            // Resetuj stan odpowiedzi przy nowym generowaniu
            showAnswer = false;
          }

          await update();
        };
      }}
    >
      <div class="card-body">
        <!-- Pole Temat -->
        <div class="form-control">
          <label for="subject" class="label">
            <span class="label-text text-lg font-semibold">Temat historii</span>
            <span class="label-text-alt text-error">*wymagane</span>
          </label>

          <div class="join w-full">
            <input
              type="text"
              name="subject"
              id="subject"
              class="input input-bordered join-item flex-1"
              class:input-error={form?.errors?.subject}
              placeholder="np. Tajemnicza latarnia morska"
              required
              maxlength="150"
              value={formData.subject}
            />
            <button
              type="button"
              class="btn btn-secondary join-item"
              on:click={randomizeSubject}
            >
              Losuj
            </button>
          </div>

          {#if form?.errors?.subject}
            <label class="label">
              <span class="label-text-alt text-error">{form.errors.subject}</span>
            </label>
          {/if}

          <label class="label">
            <span class="label-text-alt">Maksymalnie 150 znaków</span>
          </label>
        </div>

        <!-- Trudność -->
        <div class="form-control">
          <label for="difficulty" class="label">
            <span class="label-text text-lg font-semibold">Trudność</span>
          </label>

          <select
            name="difficulty"
            id="difficulty"
            class="select select-bordered w-full"
            value={formData.difficulty}
          >
            <option value="1">1 - Łatwa (proste, oczywiste wskazówki)</option>
            <option value="2">2 - Średnia (wymaga pytań, zawiera fałszywe tropy)</option>
            <option value="3">3 - Trudna (nieoczywista, wymaga myślenia \"outside the box\")</option>
          </select>
        </div>

        <!-- Mroczność -->
        <div class="form-control">
          <label for="darkness" class="label">
            <span class="label-text text-lg font-semibold">Mroczność</span>
          </label>

          <select
            name="darkness"
            id="darkness"
            class="select select-bordered w-full"
            value={formData.darkness}
          >
            <option value="1">1 - Tajemnicza (atmosferyczna, bez przemocy)</option>
            <option value="2">2 - Niepokojąca (sugerowana przemoc, niepokojący ton)</option>
            <option value="3">3 - Brutalna (explicita przemoc, gore, silny wpływ)</option>
          </select>
        </div>

        <!-- Submit button -->
        <div class="form-control mt-6">
          <button type="submit" class="btn btn-primary btn-lg">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generuj Historię
          </button>
        </div>
      </div>
    </form>
  {:else}
    <!-- Stan 2: Podgląd -->
    <div class="page-header mb-8">
      <h1 class="text-4xl font-bold">Twoja Nowa Historia</h1>
      <p class="text-lg opacity-80 mt-2">
        Przejrzyj wygenerowaną zagadkę i zdecyduj, czy chcesz ją zapisać.
      </p>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body">
        <!-- Pytanie -->
        <div class="story-section mb-6">
          <h2 class="text-2xl font-bold mb-3 flex items-center gap-2">
            <span>❓</span>
            Pytanie:
          </h2>
          <p class="text-lg leading-relaxed whitespace-pre-wrap">
            {story.question}
          </p>
        </div>

        <!-- Przełącznik odpowiedzi -->
        <button
          type="button"
          class="btn btn-secondary btn-lg w-full mb-4"
          on:click={toggleAnswer}
        >
          {#if showAnswer}
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Ukryj odpowiedź
          {:else}
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Odkryj odpowiedź
          {/if}
        </button>

        <!-- Odpowiedź (warunkowa) -->
        {#if showAnswer}
          <div class="story-section mb-6" transition:slide>
            <h2 class="text-2xl font-bold mb-3 flex items-center gap-2">
              <span>💡</span>
              Odpowiedź:
            </h2>
            <p class="text-lg leading-relaxed whitespace-pre-wrap">
              {story.answer}
            </p>
          </div>
        {/if}

        <!-- Metadata -->
        <div class="divider"></div>

        <div class="flex flex-wrap gap-2 mb-6">
          <div class="badge badge-lg badge-outline">
            Temat: {formData.subject}
          </div>
          <div class="badge badge-lg badge-outline">
            Trudność: {formData.difficulty}
          </div>
          <div class="badge badge-lg badge-outline">
            Mroczność: {formData.darkness}
          </div>
        </div>

        <!-- Akcje -->
        <div class="flex flex-col sm:flex-row gap-3">
          <!-- Zapisz -->
          <form
            method="POST"
            action="?/save"
            class="flex-1"
            use:enhance={() => {
              loadingStore.start('Zapisuję historię...');

              return async ({ result, update }) => {
                loadingStore.stop();

                if (result.type === 'redirect') {
                  toastStore.addToast('Historia została zapisana!', 'success');
                  await goto(result.location);
                }

                if (result.type === 'failure') {
                  toastStore.addToast(
                    result.data?.error || 'Nie udało się zapisać historii',
                    'error'
                  );
                }

                await update();
              };
            }}
          >
            <input type="hidden" name="subject" value={formData.subject} />
            <input type="hidden" name="difficulty" value={formData.difficulty} />
            <input type="hidden" name="darkness" value={formData.darkness} />
            <input type="hidden" name="question" value={story.question} />
            <input type="hidden" name="answer" value={story.answer} />

            <button type="submit" class="btn btn-primary btn-lg w-full">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Zapisz na mojej liście
            </button>
          </form>

          <!-- Wygeneruj ponownie -->
          <form
            method="POST"
            action="?/generate"
            class="flex-1"
            use:enhance={() => {
              loadingStore.start('Tworzymy nową historię...');
              showAnswer = false;

              return async ({ result, update }) => {
                loadingStore.stop();

                if (result.type === 'failure') {
                  toastStore.addToast(
                    result.data?.error || 'Nie udało się wygenerować historii',
                    'error'
                  );
                }

                await update();
              };
            }}
          >
            <input type="hidden" name="subject" value={formData.subject} />
            <input type="hidden" name="difficulty" value={formData.difficulty} />
            <input type="hidden" name="darkness" value={formData.darkness} />

            <button type="submit" class="btn btn-outline btn-lg w-full">
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Wygeneruj ponownie
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
```

**Obsługiwane zdarzenia:**
1. `submit` (formularz generowania) - wywołuje action `?/generate`
2. `submit` (formularz zapisu) - wywołuje action `?/save`
3. `submit` (formularz ponownego generowania) - wywołuje action `?/generate` z tymi samymi parametrami
4. `click` (przycisk "Losuj") - ustawia losowy temat z listy 50 słów
5. `click` (przycisk "Odkryj/Ukryj odpowiedź") - toggle `showAnswer`

**Warunki walidacji:**
1. **Subject:**
   - Required: pole musi być wypełnione
   - Max length: 150 znaków (HTML5 + backend validation)
   - Min length: 1 znak (implicit przez required)

2. **Difficulty:**
   - Wartość: 1, 2, lub 3
   - Default: 1
   - Backend validation przez Zod

3. **Darkness:**
   - Wartość: 1, 2, lub 3
   - Default: 1
   - Backend validation przez Zod

**Typy wymagane przez komponent:**
```typescript
import type { PageData, ActionData } from './$types';
import type { GeneratedStoryDTO, GenerateStoryCommand } from '../../types';

// PageData generowane przez SvelteKit z +page.server.ts
interface PageData {
  generatedStory?: GeneratedStoryDTO;
  formData?: GenerateStoryCommand;
}

// ActionData z form action response
interface ActionData {
  generatedStory?: GeneratedStoryDTO;
  formData?: GenerateStoryCommand;
  error?: string;
  errors?: {
    subject?: string;
    difficulty?: string;
    darkness?: string;
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
Server-side logic zawierający load function (redirect guard dla niezalogowanych) oraz dwie Form Actions: `?/generate` (generuje historię przez AI) i `?/save` (zapisuje do bazy danych). Obsługuje timeout 45 sekund, błędy API i walidację danych.

**Load function:**
```typescript
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import type { GeneratedStoryDTO, GenerateStoryCommand, ErrorDTO } from '../../types';

export const load: PageServerLoad = async ({ locals }) => {
  // Guard: tylko zalogowani użytkownicy
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  // Możemy zwrócić puste dane lub dane początkowe
  return {};
};
```

**Form Actions:**

```typescript
export const actions: Actions = {
  // Action: Generowanie historii
  generate: async ({ request, locals, fetch }) => {
    if (!locals.user) {
      return fail(401, {
        error: 'Musisz być zalogowany aby generować historie'
      });
    }

    try {
      const formData = await request.formData();
      const subject = formData.get('subject') as string;
      const difficulty = parseInt(formData.get('difficulty') as string, 10);
      const darkness = parseInt(formData.get('darkness') as string, 10);

      // Walidacja podstawowa (backend też waliduje)
      if (!subject || subject.length > 150 || subject.length < 1) {
        return fail(400, {
          formData: { subject, difficulty, darkness },
          errors: {
            subject: 'Temat jest wymagany i musi mieć od 1 do 150 znaków'
          }
        });
      }

      if (![1, 2, 3].includes(difficulty) || ![1, 2, 3].includes(darkness)) {
        return fail(400, {
          formData: { subject, difficulty, darkness },
          error: 'Nieprawidłowe wartości trudności lub mroczności'
        });
      }

      // Wywołanie API z timeout 45s
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch('/api/stories/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            subject,
            difficulty,
            darkness
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: ErrorDTO = await response.json();

          // Mapowanie błędów API na komunikaty użytkownika
          const errorMessages: Record<number, string> = {
            400: 'Nieprawidłowe dane formularza',
            401: 'Sesja wygasła. Zaloguj się ponownie',
            408: 'Przekroczono limit czasu (45s). Spróbuj ponownie',
            500: 'Błąd serwera. Spróbuj ponownie później',
            503: 'Usługa AI jest tymczasowo niedostępna. Spróbuj za chwilę'
          };

          return fail(response.status, {
            formData: { subject, difficulty, darkness },
            error: errorMessages[response.status] || errorData.error.message
          });
        }

        const generatedStory: GeneratedStoryDTO = await response.json();

        // Sukces - zwróć wygenerowaną historię i dane formularza
        return {
          generatedStory,
          formData: { subject, difficulty, darkness }
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        // Timeout error
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return fail(408, {
            formData: { subject, difficulty, darkness },
            error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
          });
        }

        throw fetchError;
      }
    } catch (error) {
      console.error('Generate action error:', error);
      return fail(500, {
        error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie'
      });
    }
  },

  // Action: Zapisywanie historii
  save: async ({ request, locals, fetch }) => {
    if (!locals.user) {
      return fail(401, {
        error: 'Musisz być zalogowany aby zapisać historię'
      });
    }

    try {
      const formData = await request.formData();
      const subject = formData.get('subject') as string;
      const difficulty = parseInt(formData.get('difficulty') as string, 10);
      const darkness = parseInt(formData.get('darkness') as string, 10);
      const question = formData.get('question') as string;
      const answer = formData.get('answer') as string;

      // Walidacja podstawowa
      if (!subject || !question || !answer) {
        return fail(400, {
          error: 'Brakujące dane historii'
        });
      }

      // Wywołanie API
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          subject,
          difficulty,
          darkness,
          question,
          answer
        })
      });

      if (!response.ok) {
        const errorData: ErrorDTO = await response.json();

        return fail(response.status, {
          error: errorData.error.message || 'Nie udało się zapisać historii'
        });
      }

      // Sukces - przekieruj na listę historii
      throw redirect(303, '/');
    } catch (error) {
      // Re-throw redirect
      if (error instanceof Error && error.message.includes('redirect')) {
        throw error;
      }

      console.error('Save action error:', error);
      return fail(500, {
        error: 'Wystąpił nieoczekiwany błąd podczas zapisywania'
      });
    }
  }
};
```

## 5. Typy

### Istniejące typy (z `src/types.ts`)

**GenerateStoryCommand** - Dane do generowania historii
```typescript
export type GenerateStoryCommand = Pick<
  TablesInsert<'stories'>,
  'subject' | 'difficulty' | 'darkness'
>;

// Struktura:
interface GenerateStoryCommand {
  subject: string;      // 1-150 znaków, wymagane
  difficulty: 1 | 2 | 3; // Wymagane
  darkness: 1 | 2 | 3;   // Wymagane
}
```

**GeneratedStoryDTO** - Odpowiedź z API generowania
```typescript
export type GeneratedStoryDTO = Pick<Tables<'stories'>, 'question' | 'answer'>;

// Struktura:
interface GeneratedStoryDTO {
  question: string;  // Pytanie zagadki
  answer: string;    // Odpowiedź/rozwiązanie
}
```

**CreateStoryCommand** - Dane do zapisu historii
```typescript
export type CreateStoryCommand = Pick<
  TablesInsert<'stories'>,
  'subject' | 'difficulty' | 'darkness' | 'question' | 'answer'
>;

// Struktura:
interface CreateStoryCommand {
  subject: string;
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
  question: string;
  answer: string;
}
```

**StoryDTO** - Pełny obiekt historii (odpowiedź z POST /api/stories)
```typescript
export type StoryDTO = Tables<'stories'>;

// Struktura:
interface StoryDTO {
  id: string;              // UUID
  user_id: string;         // UUID
  subject: string;
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
  question: string;
  answer: string;
  created_at: string;      // ISO timestamp
}
```

**ErrorDTO** - Standardowy format błędów
```typescript
export interface ErrorDTO {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
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

### Nowe typy (specyficzne dla widoku)

**PageData** - Dane z load function
```typescript
// src/routes/generate/+page.server.ts
// Automatycznie generowane przez SvelteKit jako ./$types

interface PageData {
  /** Wygenerowana historia (jeśli istnieje z poprzedniej akcji) */
  generatedStory?: GeneratedStoryDTO;

  /** Dane formularza (zachowane przy błędzie lub ponownym generowaniu) */
  formData?: GenerateStoryCommand;
}
```

**ActionData** - Odpowiedź z form actions
```typescript
// src/routes/generate/+page.server.ts
// Automatycznie generowane przez SvelteKit jako ./$types

interface ActionData {
  /** Wygenerowana historia (z action ?/generate) */
  generatedStory?: GeneratedStoryDTO;

  /** Dane formularza (zwrócone przy błędzie lub sukcesie) */
  formData?: GenerateStoryCommand;

  /** Ogólny komunikat błędu */
  error?: string;

  /** Błędy walidacji dla poszczególnych pól */
  errors?: {
    subject?: string;
    difficulty?: string;
    darkness?: string;
  };
}
```

**FormState** - Lokalny stan formularza (jeśli potrzebny)
```typescript
// Lokalny typ w +page.svelte (opcjonalny)
interface FormState {
  subject: string;
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
}
```

**PreviewState** - Stan widoku podglądu
```typescript
// Lokalny typ w +page.svelte
interface PreviewState {
  /** Czy odpowiedź jest widoczna */
  showAnswer: boolean;
}
```

## 6. Zarządzanie stanem

### Stan globalny (Svelte Stores)

Widok wykorzystuje globalne store'y z Widoku 1:

**1. loadingStore** - Pełnoekranowy loader podczas generowania
```typescript
import { loadingStore } from '$lib/stores/loading';

// Użycie w enhance callback
use:enhance={() => {
  loadingStore.start('Tworzymy Twoją mroczną historię...');

  return async ({ result, update }) => {
    loadingStore.stop();
    // ... obsługa wyniku
    await update();
  };
}}
```

**2. toastStore** - Powiadomienia o błędach i sukcesach
```typescript
import { toastStore } from '$lib/stores/toasts';

// Wyświetlenie błędu
if (result.type === 'failure') {
  toastStore.addToast(
    result.data?.error || 'Nie udało się wygenerować historii',
    'error'
  );
}

// Wyświetlenie sukcesu
if (result.type === 'redirect') {
  toastStore.addToast('Historia została zapisana!', 'success');
}
```

### Stan lokalny (Svelte 5 runes)

**1. showAnswer - Widoczność odpowiedzi w podglądzie**
```typescript
// src/routes/generate/+page.svelte
let showAnswer = $state(false);

function toggleAnswer() {
  showAnswer = !showAnswer;
}

// Reset przy nowym generowaniu
use:enhance={() => {
  return async ({ result }) => {
    if (result.type === 'success') {
      showAnswer = false; // Reset przy nowym podglądzie
    }
  };
}}
```

**2. Derived values - Computed state**
```typescript
// Wygenerowana historia z form lub data
$: story = (form?.generatedStory || data.generatedStory) as GeneratedStoryDTO | undefined;

// Dane formularza z form, data lub defaults
$: formData = form?.formData || data.formData || {
  difficulty: 1,
  darkness: 1,
  subject: ''
};

// Czy jesteśmy w stanie podglądu
$: isPreviewMode = !!story;
```

### Stan z SvelteKit

**1. PageData (reaktywny)**
```typescript
export let data: PageData;

// Automatycznie reactive, updatuje się po:
// - Nawigacji
// - invalidateAll()
// - Zakończeniu action
```

**2. ActionData (reaktywny)**
```typescript
export let form: ActionData;

// Automatycznie reactive, updatuje się po:
// - Zakończeniu form action
// - Zawiera wynik ostatniej akcji (sukces/failure)
```

**3. SvelteKit enhance**
```typescript
import { enhance } from '$app/forms';

// Progressive enhancement - formularz działa z i bez JS
<form use:enhance={handleSubmit}>
  // ...
</form>

// Custom callback dla kontroli nad submission
function handleSubmit() {
  // Before submit
  loadingStore.start('...');

  return async ({ result, update }) => {
    // After response
    loadingStore.stop();

    // Custom logic based on result type
    if (result.type === 'success') {
      // ...
    }

    // Apply default behavior
    await update();
  };
}
```

### Przepływ stanu

**Scenariusz 1: Generowanie nowej historii**
```
1. User wypełnia formularz
2. Submit → enhance callback → loadingStore.start()
3. POST ?/generate (server action)
4. Server: fetch /api/stories/generate (45s timeout)
5. Success → return { generatedStory, formData }
6. enhance callback → loadingStore.stop()
7. update() → form zawiera { generatedStory, formData }
8. Conditional rendering → Stan 2 (Podgląd)
9. showAnswer = false (reset)
```

**Scenariusz 2: Zapisywanie historii**
```
1. User klika "Zapisz na mojej liście"
2. Submit → enhance callback → loadingStore.start('Zapisuję...')
3. POST ?/save (server action)
4. Server: fetch /api/stories (create)
5. Success → throw redirect(303, '/')
6. enhance callback → toastStore.addToast('Zapisano!', 'success')
7. goto('/') → Nawigacja na listę
```

**Scenariusz 3: Wygeneruj ponownie**
```
1. User klika "Wygeneruj ponownie"
2. Form zawiera hidden inputs z poprzednimi wartościami
3. Submit → enhance callback → showAnswer = false, loadingStore.start()
4. POST ?/generate z tymi samymi parametrami
5. Powtórzenie scenariusza 1
```

### Nie używamy custom hooks

SvelteKit + Svelte 5 używa:
- `$state()` dla lokalnego stanu
- `$derived()` dla computed values (lub reactive declarations)
- Form Actions + enhance dla form handling
- Stores dla globalnego stanu

## 7. Integracja API

### API 1: Generowanie historii

**Endpoint:** `POST /api/stories/generate`

**Kiedy:** Po submit formularza generowania (action `?/generate`)

**Typ żądania:**
```typescript
// Body
interface GenerateStoryCommand {
  subject: string;      // 1-150 znaków
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
}

// Przykład
{
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3
}
```

**Typ odpowiedzi:**
```typescript
// Success (200)
interface GeneratedStoryDTO {
  question: string;
  answer: string;
}

// Error (400, 401, 408, 500, 503)
interface ErrorDTO {
  error: {
    code: ErrorCode;
    message: string;
    field?: string;
  };
}
```

**Implementacja w +page.server.ts:**
```typescript
// Action ?/generate
export const actions: Actions = {
  generate: async ({ request, locals, fetch }) => {
    // 1. Auth check
    if (!locals.user) {
      return fail(401, { error: 'Musisz być zalogowany' });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const subject = formData.get('subject') as string;
    const difficulty = parseInt(formData.get('difficulty') as string, 10);
    const darkness = parseInt(formData.get('darkness') as string, 10);

    // 3. Validate
    if (!subject || subject.length > 150) {
      return fail(400, {
        formData: { subject, difficulty, darkness },
        errors: { subject: 'Temat jest wymagany (max 150 znaków)' }
      });
    }

    // 4. Call API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, difficulty, darkness }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ErrorDTO = await response.json();
        return fail(response.status, {
          formData: { subject, difficulty, darkness },
          error: mapErrorMessage(response.status, errorData)
        });
      }

      const generatedStory: GeneratedStoryDTO = await response.json();

      return {
        generatedStory,
        formData: { subject, difficulty, darkness }
      };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        return fail(408, {
          formData: { subject, difficulty, darkness },
          error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
        });
      }

      throw error;
    }
  }
};
```

**Obsługa w +page.svelte:**
```typescript
<form
  method="POST"
  action="?/generate"
  use:enhance={() => {
    loadingStore.start('Tworzymy Twoją mroczną historię...');

    return async ({ result, update }) => {
      loadingStore.stop();

      if (result.type === 'failure') {
        toastStore.addToast(
          result.data?.error || 'Nie udało się wygenerować',
          'error'
        );
      }

      if (result.type === 'success') {
        showAnswer = false; // Reset
      }

      await update();
    };
  }}
>
  <!-- form fields -->
</form>
```

**Mapowanie błędów:**
```typescript
function mapErrorMessage(status: number, errorData: ErrorDTO): string {
  const errorMessages: Record<number, string> = {
    400: 'Nieprawidłowe dane formularza',
    401: 'Sesja wygasła. Zaloguj się ponownie',
    408: 'Przekroczono limit czasu (45s). Spróbuj ponownie',
    500: 'Błąd serwera. Spróbuj ponownie później',
    503: 'Usługa AI jest tymczasowo niedostępna. Spróbuj za chwilę'
  };

  return errorMessages[status] || errorData.error.message;
}
```

---

### API 2: Zapisywanie historii

**Endpoint:** `POST /api/stories`

**Kiedy:** Po kliknięciu "Zapisz na mojej liście" (action `?/save`)

**Typ żądania:**
```typescript
// Body
interface CreateStoryCommand {
  subject: string;
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
  question: string;
  answer: string;
}

// Przykład
{
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej...",
  "answer": "Latarnik zginął od uderzenia..."
}
```

**Typ odpowiedzi:**
```typescript
// Success (201)
interface StoryDTO {
  id: string;
  user_id: string;
  subject: string;
  difficulty: 1 | 2 | 3;
  darkness: 1 | 2 | 3;
  question: string;
  answer: string;
  created_at: string;
}

// Error (400, 401, 500)
interface ErrorDTO {
  error: {
    code: ErrorCode;
    message: string;
  };
}
```

**Implementacja w +page.server.ts:**
```typescript
// Action ?/save
export const actions: Actions = {
  save: async ({ request, locals, fetch }) => {
    // 1. Auth check
    if (!locals.user) {
      return fail(401, { error: 'Musisz być zalogowany' });
    }

    // 2. Parse form data
    const formData = await request.formData();
    const subject = formData.get('subject') as string;
    const difficulty = parseInt(formData.get('difficulty') as string, 10);
    const darkness = parseInt(formData.get('darkness') as string, 10);
    const question = formData.get('question') as string;
    const answer = formData.get('answer') as string;

    // 3. Validate
    if (!subject || !question || !answer) {
      return fail(400, { error: 'Brakujące dane historii' });
    }

    // 4. Call API
    try {
      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          difficulty,
          darkness,
          question,
          answer
        })
      });

      if (!response.ok) {
        const errorData: ErrorDTO = await response.json();
        return fail(response.status, {
          error: errorData.error.message || 'Nie udało się zapisać'
        });
      }

      // 5. Success - redirect to list
      throw redirect(303, '/');
    } catch (error) {
      // Re-throw redirect
      if (error instanceof Error && error.message.includes('redirect')) {
        throw error;
      }

      console.error('Save error:', error);
      return fail(500, {
        error: 'Wystąpił nieoczekiwany błąd'
      });
    }
  }
};
```

**Obsługa w +page.svelte:**
```typescript
<form
  method="POST"
  action="?/save"
  use:enhance={() => {
    loadingStore.start('Zapisuję historię...');

    return async ({ result, update }) => {
      loadingStore.stop();

      if (result.type === 'redirect') {
        toastStore.addToast('Historia została zapisana!', 'success');
        await goto(result.location);
      }

      if (result.type === 'failure') {
        toastStore.addToast(
          result.data?.error || 'Nie udało się zapisać',
          'error'
        );
      }

      await update();
    };
  }}
>
  <input type="hidden" name="subject" value={formData.subject} />
  <input type="hidden" name="difficulty" value={formData.difficulty} />
  <input type="hidden" name="darkness" value={formData.darkness} />
  <input type="hidden" name="question" value={story.question} />
  <input type="hidden" name="answer" value={story.answer} />

  <button type="submit">Zapisz na mojej liście</button>
</form>
```

## 8. Interakcje użytkownika

### Interakcja 1: Wypełnienie formularza generowania

**Akcja użytkownika:** Wpisanie tematu, wybór trudności i mroczności

**Komponent:** Formularz w Stanie 1

**Ścieżka przepływu:**
1. Użytkownik wpisuje temat w pole input
2. HTML5 validation: required, maxlength="150"
3. Użytkownik wybiera trudność z select (domyślnie 1)
4. Użytkownik wybiera mroczność z select (domyślnie 1)
5. Przyciski "Generuj" i "Losuj" są aktywne

**Walidacja:**
- Required: pole subject musi być wypełnione przed submit
- Maxlength: 150 znaków (blokada wpisywania więcej)
- Inline feedback przy błędach walidacji

**Oczekiwany rezultat:**
- Formularz ready do submit
- Brak błędów walidacji

---

### Interakcja 2: Kliknięcie przycisku "Losuj"

**Akcja użytkownika:** Kliknięcie przycisku "Losuj" obok pola temat

**Komponent:** Przycisk w formularzu (Stan 1)

**Ścieżka przepływu:**
1. Użytkownik klika "Losuj"
2. JavaScript wybiera losowe słowo z listy 50 słów
3. Pole input zostaje wypełnione losowym tematem
4. Focus wraca na pole input
5. **Obecna treść zostaje zastąpiona** (nie dopisana)

**Implementacja:**
```typescript
const randomSubjects = [
  'Tajemnicza latarnia morska',
  'Znikający autostopowicz',
  'Opuszczony psychiatryk',
  'Stary zegarmistrz',
  'Mroczny las',
  'Dziwny gość w hotelu',
  'Niezwykły obrazek',
  'Zagubiona lalka',
  'Cicha biblioteka',
  'Stary zegar',
  // ... (total 50 items)
];

function randomizeSubject() {
  const input = document.getElementById('subject') as HTMLInputElement;
  if (input) {
    const randomIndex = Math.floor(Math.random() * randomSubjects.length);
    input.value = randomSubjects[randomIndex]; // Zastępuje, nie dodaje
    input.focus();
  }
}
```

**Oczekiwany rezultat:**
- Pole temat wypełnione losowym słowem
- Użytkownik może natychmiast edytować lub submitować
- Jeśli pole było wypełnione, treść zostaje zastąpiona

---

### Interakcja 3: Submit formularza generowania

**Akcja użytkownika:** Kliknięcie "Generuj Historię"

**Komponent:** Formularz w Stanie 1

**Ścieżka przepływu:**
1. Użytkownik klika "Generuj Historię"
2. HTML5 validation sprawdza required i maxlength
3. Jeśli walidacja OK → submit
4. enhance callback → `loadingStore.start('Tworzymy...')`
5. GlobalLoader się wyświetla (pełnoekranowy, blokuje UI)
6. POST ?/generate → server action
7. Server action → fetch /api/stories/generate (timeout 45s)
8. Oczekiwanie na odpowiedź AI...

**Sukces:**
9. API zwraca { question, answer }
10. Server action return { generatedStory, formData }
11. enhance callback → `loadingStore.stop()`
12. `update()` → form zawiera generatedStory
13. Conditional rendering → Stan 2 (Podgląd)
14. `showAnswer = false` (reset)

**Błąd:**
9. API zwraca error (400, 408, 503, 500)
10. Server action return fail(status, { error, formData })
11. enhance callback → `loadingStore.stop()`
12. Toast z komunikatem błędu (5s, z X)
13. Pozostanie w Stanie 1 (Formularz)
14. Dane formularza zachowane (z formData)

**Timeout (45s):**
9. AbortController.abort() po 45s
10. Catch AbortError
11. Server action return fail(408, { error, formData })
12. Toast "Przekroczono limit czasu (45s)"
13. Pozostanie w Stanie 1

**Oczekiwany rezultat:**
- Wyraźny feedback (loader, spinner)
- Brak możliwości interakcji podczas ładowania
- Toast przy błędzie lub przejście do podglądu przy sukcesie

---

### Interakcja 4: Odkrycie/ukrycie odpowiedzi

**Akcja użytkownika:** Kliknięcie "Odkryj odpowiedź" / "Ukryj odpowiedź"

**Komponent:** Przycisk w Stanie 2 (Podgląd)

**Ścieżka przepływu:**
1. Użytkownik klika przycisk
2. `toggleAnswer()` → `showAnswer = !showAnswer`
3. Conditional rendering:
   - `showAnswer === true` → Div z odpowiedzią się wyświetla (slide transition)
   - `showAnswer === false` → Div znika (slide transition)
4. Tekst przycisku zmienia się:
   - "Odkryj odpowiedź" → "Ukryj odpowiedź"
   - "Ukryj odpowiedź" → "Odkryj odpowiedź"
5. Ikona zmienia się (oko otwarte/zamknięte)

**Implementacja:**
```typescript
let showAnswer = $state(false);

function toggleAnswer() {
  showAnswer = !showAnswer;
}
```

```svelte
<button on:click={toggleAnswer}>
  {showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
</button>

{#if showAnswer}
  <div transition:slide>
    <h2>Odpowiedź:</h2>
    <p>{story.answer}</p>
  </div>
{/if}
```

**Oczekiwany rezultat:**
- Smooth animation (slide)
- Przycisk toggle działa jak switch
- Odpowiedź widoczna/ukryta według stanu

---

### Interakcja 5: Zapisanie historii

**Akcja użytkownika:** Kliknięcie "Zapisz na mojej liście"

**Komponent:** Formularz save w Stanie 2

**Ścieżka przepływu:**
1. Użytkownik klika "Zapisz na mojej liście"
2. Form zawiera hidden inputs: subject, difficulty, darkness, question, answer
3. enhance callback → `loadingStore.start('Zapisuję historię...')`
4. GlobalLoader się wyświetla
5. POST ?/save → server action
6. Server action → fetch /api/stories (create)

**Sukces:**
7. API zwraca StoryDTO (201)
8. Server action → throw redirect(303, '/')
9. enhance callback → `toastStore.addToast('Zapisano!', 'success')`
10. `goto('/')` → Nawigacja na listę historii
11. Toast wyświetla się na liście
12. Nowa historia widoczna na górze listy

**Błąd:**
7. API zwraca error (400, 500)
8. Server action return fail(status, { error })
9. enhance callback → `loadingStore.stop()`
10. Toast z komunikatem błędu
11. Pozostanie w Stanie 2 (Podgląd)
12. Użytkownik może spróbować ponownie

**Oczekiwany rezultat:**
- Loader podczas zapisywania
- Toast sukcesu po zapisie
- Redirect na listę z nową historią
- Lub toast błędu i możliwość retry

---

### Interakcja 6: Wygenerowanie ponownie

**Akcja użytkownika:** Kliknięcie "Wygeneruj ponownie"

**Komponent:** Formularz regenerate w Stanie 2

**Ścieżka przepływu:**
1. Użytkownik klika "Wygeneruj ponownie"
2. Form zawiera hidden inputs: subject, difficulty, darkness (te same co poprzednio)
3. enhance callback → `showAnswer = false` (reset), `loadingStore.start('Tworzymy nową historię...')`
4. GlobalLoader się wyświetla
5. POST ?/generate → server action (z tymi samymi parametrami)
6. Powtórzenie przepływu z Interakcji 3

**Sukces:**
7. Nowa historia wygenerowana
8. Stan 2 updatuje się z nowym pytaniem i odpowiedzią
9. showAnswer = false (ukryta odpowiedź)
10. Użytkownik może przejrzeć nową wersję

**Błąd:**
7. Toast z błędem
8. Pozostanie w Stanie 2 z poprzednią historią
9. Użytkownik może spróbować ponownie lub zapisać obecną

**Oczekiwany rezultat:**
- Zachowanie parametrów (subject, difficulty, darkness)
- Nowa historia z tymi samymi ustawieniami
- Odpowiedź ukryta po wygenerowaniu
- Możliwość wielokrotnego regenerowania

---

### Interakcja 7: Próba dostępu niezalogowanego użytkownika

**Akcja użytkownika:** Nawigacja na `/generate` bez zalogowania

**Komponent:** Load function w +page.server.ts

**Ścieżka przepływu:**
1. Niezalogowany użytkownik wpisuje `/generate` w URL lub klika link
2. SvelteKit wywołuje load function
3. `if (!locals.user)` → true
4. `throw redirect(303, '/login')`
5. Użytkownik zostaje przekierowany na `/login`
6. Może się zalogować i wrócić na `/generate`

**Implementacja:**
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {};
};
```

**Oczekiwany rezultat:**
- Natychmiastowe przekierowanie
- Widok `/generate` nie renderuje się
- Ochrona route przed nieautoryzowanym dostępem

## 9. Warunki i walidacja

### Warunek 1: Ochrona route - redirect guard

**Warunek:**
```typescript
if (locals.user === null) {
  // Redirect na /login
}
```

**Komponent:** `+page.server.ts` load function

**Implementacja:**
```typescript
export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {};
};
```

**Wpływ na UI:**
- Niezalogowani użytkownicy nie widzą widoku
- Automatyczne przekierowanie na login
- Zabezpieczenie przed nieautoryzowanym dostępem

---

### Warunek 2: Przełączanie między stanami widoku

**Warunek:**
```typescript
if (data.generatedStory || form?.generatedStory) {
  // Stan 2: Podgląd
} else {
  // Stan 1: Formularz
}
```

**Komponent:** `+page.svelte`

**Implementacja:**
```svelte
<script>
  $: story = (form?.generatedStory || data.generatedStory) as GeneratedStoryDTO | undefined;
</script>

{#if !story}
  <!-- Stan 1: Formularz -->
  <form method="POST" action="?/generate">
    <!-- ... -->
  </form>
{:else}
  <!-- Stan 2: Podgląd -->
  <div class="story-preview">
    <!-- ... -->
  </div>
{/if}
```

**Wpływ na UI:**
- Dynamiczne przełączanie między dwoma stanami
- Brak mieszania elementów obu stanów
- Wyraźna separacja UI

---

### Warunek 3: Walidacja pola subject (HTML5 + backend)

**Warunki:**
1. **Required:** Pole musi być wypełnione
2. **Max length:** Maksymalnie 150 znaków
3. **Min length:** Minimum 1 znak (implicit przez required)

**Komponent:** Input subject w formularzu

**Implementacja HTML5:**
```svelte
<input
  type="text"
  name="subject"
  id="subject"
  required
  maxlength="150"
  class:input-error={form?.errors?.subject}
  placeholder="np. Tajemnicza latarnia morska"
/>

{#if form?.errors?.subject}
  <span class="text-error text-sm">{form.errors.subject}</span>
{/if}
```

**Implementacja Backend:**
```typescript
// +page.server.ts action
const subject = formData.get('subject') as string;

if (!subject || subject.length > 150 || subject.length < 1) {
  return fail(400, {
    formData: { subject, difficulty, darkness },
    errors: {
      subject: 'Temat jest wymagany i musi mieć od 1 do 150 znaków'
    }
  });
}
```

**Wpływ na UI:**
- HTML5 blokuje submit jeśli puste
- HTML5 blokuje wpisywanie > 150 znaków
- Backend validation jako fallback (bez JS)
- Czerwona ramka i komunikat przy błędzie

---

### Warunek 4: Walidacja difficulty i darkness

**Warunki:**
- Wartość: 1, 2, lub 3
- Required (implicit przez select bez pustej opcji)
- Default: 1

**Komponent:** Select w formularzu

**Implementacja:**
```svelte
<select name="difficulty" value={formData.difficulty || 1}>
  <option value="1">1 - Łatwa</option>
  <option value="2">2 - Średnia</option>
  <option value="3">3 - Trudna</option>
</select>

<select name="darkness" value={formData.darkness || 1}>
  <option value="1">1 - Tajemnicza</option>
  <option value="2">2 - Niepokojąca</option>
  <option value="3">3 - Brutalna</option>
</select>
```

**Backend validation:**
```typescript
const difficulty = parseInt(formData.get('difficulty') as string, 10);
const darkness = parseInt(formData.get('darkness') as string, 10);

if (![1, 2, 3].includes(difficulty) || ![1, 2, 3].includes(darkness)) {
  return fail(400, {
    formData: { subject, difficulty, darkness },
    error: 'Nieprawidłowe wartości trudności lub mroczności'
  });
}
```

**Wpływ na UI:**
- Zawsze prawidłowa wartość (select bez pustej opcji)
- Domyślna wartość 1
- Backend validation zabezpiecza przed manipulacją

---

### Warunek 5: Wyświetlanie odpowiedzi w podglądzie

**Warunek:**
```typescript
if (showAnswer === true) {
  // Wyświetl div z odpowiedzią
}
```

**Komponent:** Podgląd w Stanie 2

**Implementacja:**
```svelte
<script>
  let showAnswer = $state(false);
</script>

<button on:click={() => showAnswer = !showAnswer}>
  {showAnswer ? 'Ukryj odpowiedź' : 'Odkryj odpowiedź'}
</button>

{#if showAnswer}
  <div transition:slide>
    <h2>Odpowiedź:</h2>
    <p>{story.answer}</p>
  </div>
{/if}
```

**Wpływ na UI:**
- Odpowiedź ukryta domyślnie
- Smooth slide animation przy toggle
- Przycisk zmienia tekst i ikonę

---

### Warunek 6: Timeout 45 sekund

**Warunek:**
```typescript
if (elapsed_time > 45000ms) {
  // Abort request, return timeout error
}
```

**Komponent:** `+page.server.ts` action ?/generate

**Implementacja:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 45000);

try {
  const response = await fetch('/api/stories/generate', {
    method: 'POST',
    body: JSON.stringify({ subject, difficulty, darkness }),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  // handle response...
} catch (error) {
  clearTimeout(timeoutId);

  if (error instanceof Error && error.name === 'AbortError') {
    return fail(408, {
      formData: { subject, difficulty, darkness },
      error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
    });
  }

  throw error;
}
```

**Wpływ na UI:**
- Maksymalnie 45s oczekiwania
- Toast z komunikatem timeout
- Loader znika po timeout
- Użytkownik może spróbować ponownie

---

### Warunek 7: Zachowanie danych formularza przy błędzie

**Warunek:**
```typescript
if (action_failed) {
  // Zwróć formData w fail()
  // Frontend wypełni pola z form?.formData
}
```

**Implementacja Backend:**
```typescript
return fail(400, {
  formData: { subject, difficulty, darkness },
  error: 'Komunikat błędu'
});
```

**Implementacja Frontend:**
```svelte
<input
  name="subject"
  value={form?.formData?.subject || data.formData?.subject || ''}
/>

<select name="difficulty" value={form?.formData?.difficulty || 1}>
  <!-- ... -->
</select>
```

**Wpływ na UI:**
- Dane formularza nie są tracone przy błędzie
- Użytkownik nie musi wpisywać ponownie
- Lepsze UX przy retry

---

### Warunek 8: Disabled state podczas ładowania

**Warunek:**
```typescript
if (isSubmitting) {
  // Disable all interactive elements
}
```

**Implementacja:**
- Automatyczne przez `loadingStore` + `<GlobalLoader />`
- GlobalLoader blokuje cały UI (z-index + fixed + pointer-events: none)
- Przyciski disabled podczas enhance submission

**Wpływ na UI:**
- Brak możliwości interakcji podczas operacji
- Zapobiega wielokrotnym submittom
- Zapobiega zmianom w formularzu podczas przetwarzania

## 10. Obsługa błędów

### Scenariusz 1: Błąd walidacji formularza (400)

**Przyczyna:**
- Subject pusty lub > 150 znaków
- Difficulty/Darkness poza zakresem 1-3
- Nieprawidłowy format danych

**Obsługa Backend:**
```typescript
// +page.server.ts
if (!subject || subject.length > 150) {
  return fail(400, {
    formData: { subject, difficulty, darkness },
    errors: {
      subject: 'Temat jest wymagany i musi mieć od 1 do 150 znaków'
    }
  });
}
```

**Obsługa Frontend:**
```svelte
{#if form?.errors?.subject}
  <span class="text-error">{form.errors.subject}</span>
{/if}
```

**Rezultat dla użytkownika:**
- Komunikat błędu pod polem subject
- Czerwona ramka wokół pola
- Dane formularza zachowane
- Możliwość poprawy i retry

---

### Scenariusz 2: Timeout generowania (408)

**Przyczyna:**
- OpenAI API nie odpowiedziało w 45 sekund
- Wolne połączenie sieciowe
- Przeciążenie serwera AI

**Obsługa Backend:**
```typescript
// +page.server.ts
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 45000);

try {
  const response = await fetch('/api/stories/generate', {
    signal: controller.signal
    // ...
  });

  clearTimeout(timeoutId);
} catch (error) {
  clearTimeout(timeoutId);

  if (error instanceof Error && error.name === 'AbortError') {
    return fail(408, {
      formData: { subject, difficulty, darkness },
      error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
    });
  }
}
```

**Obsługa Frontend:**
```typescript
use:enhance={() => {
  loadingStore.start('Tworzymy...');

  return async ({ result, update }) => {
    loadingStore.stop();

    if (result.type === 'failure' && result.status === 408) {
      toastStore.addToast(
        'Przekroczono limit czasu (45s). Spróbuj ponownie',
        'error'
      );
    }

    await update();
  };
}}
```

**Rezultat dla użytkownika:**
- Loader znika po 45 sekundach
- Toast z komunikatem timeout (5s)
- Dane formularza zachowane
- Możliwość natychmiastowej ponownej próby

---

### Scenariusz 3: Błąd API OpenAI - Rate Limit (503)

**Przyczyna:**
- Przekroczono limit requestów do OpenAI
- OpenAI API tymczasowo niedostępne
- Maintenance OpenAI

**Obsługa Backend:**
```typescript
// API /api/stories/generate zwraca 503
if (!response.ok) {
  const errorData: ErrorDTO = await response.json();

  if (response.status === 503) {
    return fail(503, {
      formData: { subject, difficulty, darkness },
      error: 'Usługa AI jest tymczasowo niedostępna. Spróbuj za 1-2 minuty'
    });
  }
}
```

**Obsługa Frontend:**
```typescript
if (result.type === 'failure' && result.status === 503) {
  toastStore.addToast(
    result.data?.error || 'Usługa tymczasowo niedostępna',
    'error',
    8000 // Dłuższy czas wyświetlania (8s)
  );
}
```

**Rezultat dla użytkownika:**
- Toast z komunikatem o niedostępności (8s)
- Sugestia odczekania 1-2 minuty
- Dane formularza zachowane
- Możliwość retry po chwili

---

### Scenariusz 4: Błąd wewnętrzny serwera (500)

**Przyczyna:**
- Nieoczekiwany błąd w backend logic
- Błąd parsowania odpowiedzi AI
- Błąd połączenia z bazą danych

**Obsługa Backend:**
```typescript
try {
  // ... logic
} catch (error) {
  console.error('Generate action error:', error);
  return fail(500, {
    formData: { subject, difficulty, darkness },
    error: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie później'
  });
}
```

**Obsługa Frontend:**
```typescript
if (result.type === 'failure' && result.status === 500) {
  toastStore.addToast(
    'Wystąpił błąd serwera. Spróbuj ponownie',
    'error'
  );
}
```

**Rezultat dla użytkownika:**
- Toast z ogólnym komunikatem błędu
- Dane zachowane
- Możliwość retry
- Log błędu w konsoli serwera (dla debugowania)

---

### Scenariusz 5: Sesja wygasła (401)

**Przyczyna:**
- Token JWT wygasł
- Użytkownik wylogował się w innej zakładce
- Sesja Supabase nieważna

**Obsługa Backend:**
```typescript
if (!locals.user) {
  return fail(401, {
    error: 'Sesja wygasła. Zaloguj się ponownie'
  });
}
```

**Obsługa Frontend:**
```typescript
if (result.type === 'failure' && result.status === 401) {
  toastStore.addToast('Sesja wygasła. Zaloguj się ponownie', 'error');

  // Opcjonalnie: automatyczne przekierowanie po 2s
  setTimeout(() => {
    goto('/login');
  }, 2000);
}
```

**Rezultat dla użytkownika:**
- Toast z informacją o wygasłej sesji
- Automatyczne przekierowanie na login (po 2s)
- Możliwość ponownego zalogowania

---

### Scenariusz 6: Błąd zapisu do bazy danych (action ?/save)

**Przyczyna:**
- Błąd połączenia z Supabase
- Błąd RLS policy
- Brak miejsca w bazie

**Obsługa Backend:**
```typescript
// action ?/save
const response = await fetch('/api/stories', {
  method: 'POST',
  body: JSON.stringify({ subject, difficulty, darkness, question, answer })
});

if (!response.ok) {
  const errorData: ErrorDTO = await response.json();

  return fail(response.status, {
    error: errorData.error.message || 'Nie udało się zapisać historii'
  });
}
```

**Obsługa Frontend:**
```typescript
use:enhance={() => {
  loadingStore.start('Zapisuję...');

  return async ({ result, update }) => {
    loadingStore.stop();

    if (result.type === 'failure') {
      toastStore.addToast(
        result.data?.error || 'Nie udało się zapisać',
        'error'
      );
    }

    await update();
  };
}}
```

**Rezultat dla użytkownika:**
- Toast z komunikatem błędu
- Pozostanie w Stanie 2 (Podgląd)
- Historia nie jest tracona
- Możliwość ponownej próby zapisu
- Alternatywnie: kopiowanie pytania/odpowiedzi ręcznie

---

### Scenariusz 7: Błąd sieci (Network Error)

**Przyczyna:**
- Brak połączenia z internetem
- Problem z DNS
- Firewall blokuje połączenie

**Obsługa Backend:**
```typescript
try {
  const response = await fetch('/api/stories/generate', { ... });
} catch (error) {
  // Network error
  console.error('Fetch error:', error);
  return fail(500, {
    formData: { subject, difficulty, darkness },
    error: 'Błąd połączenia. Sprawdź internet i spróbuj ponownie'
  });
}
```

**Obsługa Frontend:**
```typescript
// enhance automatycznie catchuje network errors
```

**Rezultat dla użytkownika:**
- Toast "Błąd połączenia. Sprawdź internet"
- Dane formularza zachowane
- Możliwość retry po przywróceniu połączenia

---

### Scenariusz 8: Nieprawidłowa odpowiedź AI (parsowanie)

**Przyczyna:**
- AI zwróciło odpowiedź w nieprawidłowym formacie
- Brak pola question lub answer
- JSON malformed

**Obsługa Backend (w API /api/stories/generate):**
```typescript
// openaiService.generateStory()
const generated = await openai.chat.completions.create({ ... });

const content = generated.choices[0]?.message?.content;

if (!content) {
  throw new Error('Brak odpowiedzi od AI');
}

// Parse JSON
let parsed;
try {
  parsed = JSON.parse(content);
} catch (error) {
  throw new Error('Nieprawidłowy format odpowiedzi AI');
}

// Validate struktura
if (!parsed.question || !parsed.answer) {
  throw new Error('Brak pytania lub odpowiedzi w odpowiedzi AI');
}

return {
  question: parsed.question,
  answer: parsed.answer
};
```

**API zwraca 500 z komunikatem:**
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "Nie udało się przetworzyć odpowiedzi AI. Spróbuj ponownie"
  }
}
```

**Rezultat dla użytkownika:**
- Toast "Nie udało się wygenerować historii. Spróbuj ponownie"
- Sugestia zmiany tematu lub parametrów
- Możliwość retry

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
│   └── generate/
│       ├── +page.svelte         (główny widok)
│       └── +page.server.ts      (server logic, actions)
```

**Polecenia:**
```bash
# Utwórz katalog
mkdir -p src/routes/generate

# Utwórz pliki
touch src/routes/generate/+page.svelte
touch src/routes/generate/+page.server.ts
```

---

### Krok 2: Implementacja +page.server.ts

**2.1. Load function z redirect guard:**

```typescript
// src/routes/generate/+page.server.ts
import type { PageServerLoad, Actions } from './$types';
import { redirect, fail } from '@sveltejs/kit';
import type { GeneratedStoryDTO, GenerateStoryCommand, ErrorDTO } from '../../types';

export const load: PageServerLoad = async ({ locals }) => {
  // Guard: tylko zalogowani
  if (!locals.user) {
    throw redirect(303, '/login');
  }

  return {};
};
```

**2.2. Action ?/generate:**

```typescript
export const actions: Actions = {
  generate: async ({ request, locals, fetch }) => {
    // 1. Auth check
    if (!locals.user) {
      return fail(401, { error: 'Musisz być zalogowany' });
    }

    try {
      // 2. Parse form data
      const formData = await request.formData();
      const subject = formData.get('subject') as string;
      const difficulty = parseInt(formData.get('difficulty') as string, 10);
      const darkness = parseInt(formData.get('darkness') as string, 10);

      // 3. Validate
      if (!subject || subject.length > 150 || subject.length < 1) {
        return fail(400, {
          formData: { subject, difficulty, darkness },
          errors: { subject: 'Temat jest wymagany (1-150 znaków)' }
        });
      }

      if (![1, 2, 3].includes(difficulty) || ![1, 2, 3].includes(darkness)) {
        return fail(400, {
          formData: { subject, difficulty, darkness },
          error: 'Nieprawidłowe wartości trudności lub mroczności'
        });
      }

      // 4. Call API with 45s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      try {
        const response = await fetch('/api/stories/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject, difficulty, darkness }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData: ErrorDTO = await response.json();

          const errorMessages: Record<number, string> = {
            400: 'Nieprawidłowe dane',
            401: 'Sesja wygasła',
            408: 'Przekroczono limit czasu (45s)',
            500: 'Błąd serwera',
            503: 'Usługa AI tymczasowo niedostępna'
          };

          return fail(response.status, {
            formData: { subject, difficulty, darkness },
            error: errorMessages[response.status] || errorData.error.message
          });
        }

        const generatedStory: GeneratedStoryDTO = await response.json();

        return {
          generatedStory,
          formData: { subject, difficulty, darkness }
        };
      } catch (fetchError) {
        clearTimeout(timeoutId);

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          return fail(408, {
            formData: { subject, difficulty, darkness },
            error: 'Przekroczono limit czasu (45s). Spróbuj ponownie'
          });
        }

        throw fetchError;
      }
    } catch (error) {
      console.error('Generate action error:', error);
      return fail(500, {
        error: 'Wystąpił nieoczekiwany błąd'
      });
    }
  }
};
```

**2.3. Action ?/save:**

```typescript
export const actions: Actions = {
  // ... generate action powyżej

  save: async ({ request, locals, fetch }) => {
    if (!locals.user) {
      return fail(401, { error: 'Musisz być zalogowany' });
    }

    try {
      const formData = await request.formData();
      const subject = formData.get('subject') as string;
      const difficulty = parseInt(formData.get('difficulty') as string, 10);
      const darkness = parseInt(formData.get('darkness') as string, 10);
      const question = formData.get('question') as string;
      const answer = formData.get('answer') as string;

      if (!subject || !question || !answer) {
        return fail(400, { error: 'Brakujące dane historii' });
      }

      const response = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          difficulty,
          darkness,
          question,
          answer
        })
      });

      if (!response.ok) {
        const errorData: ErrorDTO = await response.json();
        return fail(response.status, {
          error: errorData.error.message || 'Nie udało się zapisać'
        });
      }

      // Success - redirect
      throw redirect(303, '/');
    } catch (error) {
      if (error instanceof Error && error.message.includes('redirect')) {
        throw error;
      }

      console.error('Save action error:', error);
      return fail(500, { error: 'Wystąpił nieoczekiwany błąd' });
    }
  }
};
```

---

### Krok 3: Implementacja +page.svelte - podstawowa struktura

**3.1. Script section:**

```svelte
<script lang="ts">
  import type { PageData, ActionData } from './$types';
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';
  import { loadingStore } from '$lib/stores/loading';
  import { toastStore } from '$lib/stores/toasts';
  import { slide } from 'svelte/transition';
  import type { GeneratedStoryDTO } from '../../types';

  export let data: PageData;
  export let form: ActionData;

  // Stan lokalny
  let showAnswer = $state(false);

  // Lista 50 losowych słów (PRD 2.3)
  const randomSubjects = [
    'Tajemnicza latarnia morska',
    'Znikający autostopowicz',
    'Opuszczony psychiatryk',
    'Stary zegarmistrz',
    'Mroczny las',
    'Dziwny goś w hotelu',
    'Niezwykły obrazek',
    'Zagubiona lalka',
    'Cicha biblioteka',
    'Stary zegar',
    'Pusty wagon metra',
    'Zamknięty pokój',
    'Tajemniczy telefon',
    'Zaginiony statek',
    'Dziwny sen',
    'Stara fotografia',
    'Nieznajomy w tłumie',
    'Zagadkowy list',
    'Opuszczony dom',
    'Mroczne wspomnienie',
    'Zagubiony klucz',
    'Tajemnicze drzwi',
    'Stara skrzynia',
    'Dziwny dźwięk',
    'Zagadkowa mapa',
    'Zamknięta walizka',
    'Stare lustro',
    'Tajemniczy cień',
    'Zagubiony portret',
    'Dziwna muzyka',
    'Opuszczona fabryka',
    'Stary tunel',
    'Tajemnicza jaskinia',
    'Dziwne znaki',
    'Zagubiony dziennik',
    'Stara studnia',
    'Tajemniczy most',
    'Opuszczony szpital',
    'Dziwne światło',
    'Zagadkowy symbolroku',
    'Stara brama',
    'Tajemnicze echo',
    'Zamknięta piwnica',
    'Dziwny zapach',
    'Zagubiona biżuteria',
    'Stary fortepian',
    'Tajemniczy ogród',
    'Opuszczona kawiarnia',
    'Dziwna mgła'
  ];

  // Derived values
  $: story = (form?.generatedStory || data.generatedStory) as GeneratedStoryDTO | undefined;
  $: formData = form?.formData || data.formData || {
    difficulty: 1,
    darkness: 1,
    subject: ''
  };

  // Funkcje
  function randomizeSubject() {
    const input = document.getElementById('subject') as HTMLInputElement;
    if (input) {
      const randomIndex = Math.floor(Math.random() * randomSubjects.length);
      input.value = randomSubjects[randomIndex];
      input.focus();
    }
  }

  function toggleAnswer() {
    showAnswer = !showAnswer;
  }
</script>

<svelte:head>
  <title>Generuj Historię - MroczneHistorie</title>
  <meta name="description" content="Wygeneruj unikalną mroczną zagadkę z pomocą AI" />
</svelte:head>
```

---

### Krok 4: Implementacja Stanu 1 - Formularz

```svelte
<div class="container mx-auto px-4 py-8 max-w-4xl">
  {#if !story}
    <!-- Stan 1: Formularz -->
    <div class="page-header mb-8 text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-3">
        Wygeneruj Nową Historię
      </h1>
      <p class="text-lg opacity-80">
        Podaj temat i dostosuj parametry, a AI stworzy dla Ciebie unikalną mroczną zagadkę.
      </p>
    </div>

    <form
      method="POST"
      action="?/generate"
      class="card bg-base-100 shadow-xl"
      use:enhance={() => {
        loadingStore.start('Tworzymy Twoją mroczną historię...');

        return async ({ result, update }) => {
          loadingStore.stop();

          if (result.type === 'failure') {
            toastStore.addToast(
              result.data?.error || 'Nie udało się wygenerować historii',
              'error'
            );
          }

          if (result.type === 'success') {
            showAnswer = false;
          }

          await update();
        };
      }}
    >
      <div class="card-body space-y-6">
        <!-- Pole Temat -->
        <div class="form-control">
          <label for="subject" class="label">
            <span class="label-text text-lg font-semibold">Temat historii</span>
            <span class="label-text-alt text-error">*wymagane</span>
          </label>

          <div class="join w-full">
            <input
              type="text"
              name="subject"
              id="subject"
              class="input input-bordered join-item flex-1 text-lg"
              class:input-error={form?.errors?.subject}
              placeholder="np. Tajemnicza latarnia morska"
              required
              maxlength="150"
              value={formData.subject}
            />
            <button
              type="button"
              class="btn btn-secondary join-item"
              on:click={randomizeSubject}
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Losuj
            </button>
          </div>

          {#if form?.errors?.subject}
            <label class="label">
              <span class="label-text-alt text-error">{form.errors.subject}</span>
            </label>
          {/if}

          <label class="label">
            <span class="label-text-alt opacity-60">
              Maksymalnie 150 znaków
            </span>
          </label>
        </div>

        <!-- Trudność -->
        <div class="form-control">
          <label for="difficulty" class="label">
            <span class="label-text text-lg font-semibold">Poziom trudności</span>
          </label>

          <select
            name="difficulty"
            id="difficulty"
            class="select select-bordered w-full text-lg"
            value={formData.difficulty}
          >
            <option value="1">1 - Łatwa (proste, oczywiste wskazówki)</option>
            <option value="2">2 - Średnia (wymaga pytań, zawiera fałszywe tropy)</option>
            <option value="3">3 - Trudna (nieoczywista, wymaga myślenia "outside the box")</option>
          </select>

          <label class="label">
            <span class="label-text-alt opacity-60">
              Określa jak skomplikowana będzie zagadka
            </span>
          </label>
        </div>

        <!-- Mroczność -->
        <div class="form-control">
          <label for="darkness" class="label">
            <span class="label-text text-lg font-semibold">Poziom mroczności</span>
          </label>

          <select
            name="darkness"
            id="darkness"
            class="select select-bordered w-full text-lg"
            value={formData.darkness}
          >
            <option value="1">1 - Tajemnicza (atmosferyczna, bez przemocy)</option>
            <option value="2">2 - Niepokojąca (sugerowana przemoc, niepokojący ton)</option>
            <option value="3">3 - Brutalna (explicit przemoc, gore, silny wpływ)</option>
          </select>

          <label class="label">
            <span class="label-text-alt opacity-60">
              Określa jak mroczna będzie treść historii
            </span>
          </label>
        </div>

        <!-- Submit button -->
        <div class="form-control mt-8">
          <button type="submit" class="btn btn-primary btn-lg w-full text-lg">
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generuj Historię
          </button>
        </div>

        <div class="text-center text-sm opacity-60">
          Generowanie zajmuje zwykle 10-30 sekund
        </div>
      </div>
    </form>
  {/if}
</div>
```

---

### Krok 5: Implementacja Stanu 2 - Podgląd

```svelte
<!-- Kontynuacja w tym samym pliku +page.svelte -->

  {:else}
    <!-- Stan 2: Podgląd -->
    <div class="page-header mb-8 text-center">
      <h1 class="text-4xl md:text-5xl font-bold mb-3">
        Twoja Nowa Historia
      </h1>
      <p class="text-lg opacity-80">
        Przejrzyj wygenerowaną zagadkę i zdecyduj, czy chcesz ją zapisać.
      </p>
    </div>

    <div class="card bg-base-100 shadow-xl">
      <div class="card-body space-y-6">
        <!-- Pytanie -->
        <div class="story-section">
          <div class="flex items-center gap-3 mb-4">
            <span class="text-4xl">❓</span>
            <h2 class="text-2xl font-bold">Pytanie</h2>
          </div>
          <p class="text-lg leading-relaxed whitespace-pre-wrap pl-14">
            {story.question}
          </p>
        </div>

        <div class="divider"></div>

        <!-- Przełącznik odpowiedzi -->
        <button
          type="button"
          class="btn btn-secondary btn-lg w-full"
          on:click={toggleAnswer}
        >
          {#if showAnswer}
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
            </svg>
            Ukryj odpowiedź
          {:else}
            <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Odkryj odpowiedź
          {/if}
        </button>

        <!-- Odpowiedź (warunkowa) -->
        {#if showAnswer}
          <div class="story-section" transition:slide>
            <div class="flex items-center gap-3 mb-4">
              <span class="text-4xl">💡</span>
              <h2 class="text-2xl font-bold">Odpowiedź</h2>
            </div>
            <p class="text-lg leading-relaxed whitespace-pre-wrap pl-14">
              {story.answer}
            </p>
          </div>
        {/if}

        <div class="divider"></div>

        <!-- Metadata -->
        <div class="flex flex-wrap gap-2 justify-center">
          <div class="badge badge-lg badge-outline">
            📝 {formData.subject}
          </div>
          <div class="badge badge-lg badge-outline">
            🎯 Trudność: {formData.difficulty}
          </div>
          <div class="badge badge-lg badge-outline">
            🌑 Mroczność: {formData.darkness}
          </div>
        </div>

        <div class="divider"></div>

        <!-- Akcje -->
        <div class="flex flex-col sm:flex-row gap-4">
          <!-- Zapisz -->
          <form
            method="POST"
            action="?/save"
            class="flex-1"
            use:enhance={() => {
              loadingStore.start('Zapisuję historię...');

              return async ({ result, update }) => {
                loadingStore.stop();

                if (result.type === 'redirect') {
                  toastStore.addToast('Historia została zapisana!', 'success');
                  await goto(result.location);
                }

                if (result.type === 'failure') {
                  toastStore.addToast(
                    result.data?.error || 'Nie udało się zapisać',
                    'error'
                  );
                }

                await update();
              };
            }}
          >
            <input type="hidden" name="subject" value={formData.subject} />
            <input type="hidden" name="difficulty" value={formData.difficulty} />
            <input type="hidden" name="darkness" value={formData.darkness} />
            <input type="hidden" name="question" value={story.question} />
            <input type="hidden" name="answer" value={story.answer} />

            <button type="submit" class="btn btn-primary btn-lg w-full">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              Zapisz na mojej liście
            </button>
          </form>

          <!-- Wygeneruj ponownie -->
          <form
            method="POST"
            action="?/generate"
            class="flex-1"
            use:enhance={() => {
              loadingStore.start('Tworzymy nową historię...');
              showAnswer = false;

              return async ({ result, update }) => {
                loadingStore.stop();

                if (result.type === 'failure') {
                  toastStore.addToast(
                    result.data?.error || 'Nie udało się wygenerować',
                    'error'
                  );
                }

                await update();
              };
            }}
          >
            <input type="hidden" name="subject" value={formData.subject} />
            <input type="hidden" name="difficulty" value={formData.difficulty} />
            <input type="hidden" name="darkness" value={formData.darkness} />

            <button type="submit" class="btn btn-outline btn-lg w-full">
              <svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Wygeneruj ponownie
            </button>
          </form>
        </div>
      </div>
    </div>
  {/if}
</div>
```

---

### Krok 6: Testowanie funkcjonalności

**6.1. Test redirect guard (niezalogowany):**
```bash
# Wyloguj się
# Otwórz http://localhost:5173/generate

# Sprawdź:
- [ ] Natychmiastowe przekierowanie na /login
- [ ] Brak renderowania widoku generatora
```

**6.2. Test formularza (zalogowany):**
```bash
# Zaloguj się
# Otwórz http://localhost:5173/generate

# Sprawdź:
- [ ] Formularz się wyświetla
- [ ] Pole subject puste domyślnie
- [ ] Select difficulty na 1
- [ ] Select darkness na 1
- [ ] Przycisk "Losuj" działa
- [ ] Losuje różne słowa przy każdym kliknięciu
- [ ] Zastępuje obecną treść (nie dodaje)
```

**6.3. Test walidacji formularza:**
```bash
# Spróbuj submit z pustym subject
- [ ] HTML5 validation blokuje submit
- [ ] Message "Please fill out this field"

# Wpisz > 150 znaków
- [ ] HTML5 maxlength blokuje wpisywanie

# Wpisz prawidłowy temat i submit
- [ ] Formularz przechodzi walidację
```

**6.4. Test generowania:**
```bash
# Wypełnij formularz i kliknij "Generuj"

# Sprawdź:
- [ ] GlobalLoader się wyświetla
- [ ] Tekst "Tworzymy Twoją mroczną historię..."
- [ ] UI zablokowany (nie da się kliknąć nic)
- [ ] Po 10-30s loader znika
- [ ] Przejście do Stanu 2 (Podgląd)
- [ ] Pytanie się wyświetla
- [ ] Odpowiedź ukryta domyślnie
- [ ] Metadata badges poprawne
```

**6.5. Test podglądu:**
```bash
# W Stanie 2

# Sprawdź:
- [ ] Przycisk "Odkryj odpowiedź"
- [ ] Kliknięcie pokazuje odpowiedź (slide animation)
- [ ] Tekst przycisku zmienia się na "Ukryj odpowiedź"
- [ ] Kliknięcie ukrywa odpowiedź
- [ ] Przyciski "Zapisz" i "Wygeneruj ponownie" widoczne
```

**6.6. Test zapisywania:**
```bash
# W Stanie 2, kliknij "Zapisz"

# Sprawdź:
- [ ] Loader "Zapisuję historię..."
- [ ] Po 1-2s toast "Historia została zapisana!"
- [ ] Redirect na /
- [ ] Nowa historia widoczna na liście (na górze)
```

**6.7. Test wygeneruj ponownie:**
```bash
# W Stanie 2, kliknij "Wygeneruj ponownie"

# Sprawdź:
- [ ] Loader "Tworzymy nową historię..."
- [ ] Te same parametry (subject, difficulty, darkness)
- [ ] Nowe pytanie i odpowiedź
- [ ] Odpowiedź ukryta (showAnswer = false)
- [ ] Można wielokrotnie regenerować
```

**6.8. Test timeout (45s):**
```bash
# Symuluj timeout (w +page.server.ts zmień 45000 na 5000)
# Wygeneruj historię

# Sprawdź:
- [ ] Po 5s loader znika
- [ ] Toast "Przekroczono limit czasu (45s)"
- [ ] Pozostanie w Stanie 1
- [ ] Dane formularza zachowane
- [ ] Możliwość retry
```

**6.9. Test obsługi błędów:**
```bash
# Symuluj błędy API:

# 1. 503 (rate limit)
# Sprawdź: Toast "Usługa AI tymczasowo niedostępna"

# 2. 500 (internal error)
# Sprawdź: Toast "Błąd serwera"

# 3. Brak internetu
# Sprawdź: Toast "Błąd połączenia"

# 4. Błąd zapisu
# Sprawdź: Toast w Stanie 2, możliwość retry
```

---

### Krok 7: Optymalizacja i finalizacja

**7.1. Accessibility:**
```svelte
<!-- Dodaj ARIA labels -->
<form aria-label="Formularz generowania historii">
  <!-- ... -->
</form>

<button aria-label="Odkryj odpowiedź historii">
  Odkryj odpowiedź
</button>

<!-- Dodaj live regions dla dynamicznej treści -->
<div role="status" aria-live="polite" aria-atomic="true">
  {#if form?.errors?.subject}
    {form.errors.subject}
  {/if}
</div>
```

**7.2. Keyboard navigation:**
```bash
# Sprawdź:
- [ ] Tab przełącza między polami formularza
- [ ] Enter submituje formularz
- [ ] Escape zamyka toast (opcjonalnie)
- [ ] Focus visible na wszystkich elementach
```

**7.3. Loading states:**
```bash
# Sprawdź:
- [ ] GlobalLoader blokuje cały UI
- [ ] Brak możliwości wielokrotnego submitu
- [ ] Wyraźny feedback podczas operacji
- [ ] Timeout działa poprawnie (45s)
```

**7.4. Error handling comprehensive test:**
```bash
# Przetestuj wszystkie scenariusze błędów z sekcji 10
- [ ] Walidacja formularza (400)
- [ ] Timeout (408)
- [ ] Rate limit (503)
- [ ] Internal error (500)
- [ ] Sesja wygasła (401)
- [ ] Błąd zapisu
- [ ] Network error
- [ ] Nieprawidłowa odpowiedź AI
```

**7.5. Progressive enhancement:**
```bash
# Wyłącz JavaScript w przeglądarce

# Sprawdź:
- [ ] Formularz nadal działa (POST submit)
- [ ] Redirect guard działa
- [ ] Walidacja HTML5 działa
- [ ] Actions przetwarzają dane
- [ ] Przejście między stanami działa
- [ ] Zapisywanie działa
```

---

### Krok 8: Edge cases

**8.1. Bardzo długi temat (150 znaków):**
```bash
# Wpisz 150 znaków w subject

# Sprawdź:
- [ ] Maxlength blokuje więcej
- [ ] Generowanie działa
- [ ] Temat wyświetla się poprawnie w metadata
```

**8.2. Specjalne znaki w subject:**
```bash
# Wpisz: "Test 'with' "quotes" & <tags>"

# Sprawdź:
- [ ] Poprawne escapowanie
- [ ] API przyjmuje
- [ ] Wyświetlanie poprawne
```

**8.3. Bardzo długa odpowiedź AI:**
```bash
# AI zwróci bardzo długą odpowiedź (> 1000 znaków)

# Sprawdź:
- [ ] Wyświetla się cała odpowiedź
- [ ] Scroll działa w razie potrzeby
- [ ] Whitespace-pre-wrap zachowuje formatowanie
```

**8.4. Wielokrotne regenerowanie:**
```bash
# Kliknij "Wygeneruj ponownie" 10 razy pod rząd

# Sprawdź:
- [ ] Za każdym razem nowa historia
- [ ] Parametry zachowane
- [ ] Brak memory leaks
- [ ] Performance OK
```

---

### Krok 9: Documentation i code quality

**9.1. JSDoc comments:**
```typescript
/**
 * Generuje nową historię używając OpenAI API
 * Timeout: 45 sekund
 * @returns ActionResult z wygenerowaną historią lub błędem
 */
export const actions: Actions = {
  generate: async ({ request, locals, fetch }) => {
    // ...
  }
};

/**
 * Zapisuje wygenerowaną historię do bazy danych
 * Po sukcesie przekierowuje na listę historii
 */
  save: async ({ request, locals, fetch }) => {
    // ...
  }
};
```

**9.2. Code review checklist:**
```bash
- [ ] Wszystkie typy poprawne
- [ ] Brak console.log (poza error handling)
- [ ] Brak unused imports
- [ ] Nazwy zmiennych jasne i opisowe
- [ ] Komentarze dodane gdzie potrzebne
- [ ] Error handling wszędzie gdzie fetch
- [ ] Timeout implementation correct
- [ ] Progressive enhancement works
- [ ] Accessibility attributes present
- [ ] Lista 50 słów kompletna
```

**9.3. Performance check:**
```bash
# Lighthouse audit

# Sprawdź:
- [ ] Performance > 90
- [ ] Accessibility > 95
- [ ] Best Practices > 90
- [ ] SEO > 90

# Specific checks:
- [ ] Form submission fast
- [ ] Transitions smooth (60fps)
- [ ] No layout shifts
- [ ] Images optimized (jeśli są)
```

---

### Krok 10: Pre-deployment checklist

```bash
- [ ] Wszystkie testy przechodzą
- [ ] Build kompiluje się bez błędów (npm run build)
- [ ] Preview działa (npm run preview)
- [ ] Redirect guard testowany
- [ ] Timeout 45s testowany
- [ ] Lista 50 słów kompletna i różnorodna
- [ ] Progressive enhancement działa
- [ ] Accessibility sprawdzona
- [ ] Error handling pokrywa wszystkie scenariusze
- [ ] GlobalLoader integracja działa
- [ ] Toast notifications działają
- [ ] No console errors
- [ ] TypeScript strict mode pass
- [ ] ESLint pass
- [ ] Prettier formatted
```

---

### Krok 11: Deployment

```bash
# 1. Final checks
npm run check
npm run lint
npm run build
npm run preview

# 2. Commit
git add .
git commit -m "Implement story generator view with AI integration

- Add protected route with redirect guard
- Implement generate form with 50 random subjects
- Add 45s timeout for AI generation
- Implement preview state with answer toggle
- Add save and regenerate functionality
- Integrate with global loader and toast stores
- Handle all error scenarios (timeout, rate limit, etc.)
- Add progressive enhancement
- Full accessibility support"

# 3. Push
git push origin main

# 4. Verify deployment
# - Sprawdź czy generator działa na produkcji
# - Testuj generowanie
# - Testuj zapisywanie
# - Sprawdź error handling
# - Sprawdź timeout
```

---

## Podsumowanie

Ten plan implementacji obejmuje kompleksowo Widok 5: Generator Historii - **kluczowy widok aplikacji MroczneHistorie realizujący główną pętlę wartości**.

### Kluczowe aspekty:

**Funkcjonalności:**
1. **Formularz generowania** - temat (max 150), trudność, mroczność, przycisk losuj (50 słów)
2. **Integracja AI** - POST /api/stories/generate z timeout 45s
3. **Dwustanowy widok** - Formularz → Podgląd
4. **Podgląd** - pytanie, toggle odpowiedzi, metadata
5. **Zapisywanie** - POST /api/stories → redirect /
6. **Regenerowanie** - zachowanie parametrów, nowa historia
7. **Protected route** - redirect guard dla niezalogowanych

**Technologie:**
- SvelteKit Form Actions (progressive enhancement)
- Svelte 5 runes ($state dla showAnswer)
- Timeout implementation (AbortController)
- Global stores (loadingStore, toastStore)
- DaisyUI components (select, card, badge)

**UX:**
- Pełnoekranowy loader podczas generowania
- Toast notifications dla błędów
- Smooth transitions (slide for answer)
- Disabled states podczas operacji
- Wyraźny feedback na każdym etapie

**Bezpieczeństwo:**
- Redirect guard (load function)
- Backend validation (Zod schemas)
- Timeout protection (45s)
- HTML5 validation jako first line
- Error handling dla wszystkich scenariuszy

**Obsługa błędów:**
- Timeout (408) - 45s limit
- Rate limit (503) - AI unavailable
- Internal error (500) - server issues
- Validation (400) - invalid data
- Network error - connection issues
- Session expired (401) - reauth needed

Szacowany czas implementacji: **8-12 godzin** dla doświadczonego programisty frontend, włącznie z testowaniem wszystkich scenariuszy.

Widok jest **gotowy do implementacji** według tego planu!