# API Endpoint Implementation Plan: GET Random Story

## 1. Przegląd punktu końcowego

Endpoint `GET /api/stories/random` umożliwia użytkownikom pobranie losowo wybranej historii z ich prywatnej kolekcji. Jest to kluczowa funkcjonalność dla użytkowników chcących szybko przypomnieć sobie losową zagadkę bez przeszukiwania całej listy.

**Kluczowe cechy:**

- Zwraca pojedynczy, losowo wybrany obiekt StoryDTO
- Wymaga autentykacji (użytkownik widzi tylko własne historie)
- Zwraca 404 jeśli użytkownik nie ma żadnych historii
- Brak parametrów wejściowych (poza JWT token)
- Frontend powinien wyłączać przycisk "Random" gdy kolekcja jest pusta (PRD 3.12)

**Use case:**
Użytkownik z kolekcją 50 historii klika przycisk "Losowa historia" i otrzymuje jedną z nich do wyświetlenia.

## 2. Szczegóły żądania

### Metoda HTTP

`GET`

### Struktura URL

```
/api/stories/random
```

### Parametry

#### Headers (wymagane):

- **`Authorization`**: `Bearer <JWT_TOKEN>`
  - JWT token otrzymany z Supabase Auth
  - Automatycznie zarządzany przez `@supabase/supabase-js` SDK
  - Token zawiera `user_id` używany przez RLS

#### Query Parameters:

Brak

#### URL Parameters:

Brak

#### Request Body:

Brak (metoda GET nie przyjmuje ciała żądania)

### Przykładowe żądanie

```http
GET /api/stories/random HTTP/1.1
Host: mrocznehistorie.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
```

## 3. Wykorzystywane typy

### Z `src/types.ts`:

#### Response Type:

```typescript
type StoryDTO = Tables<'stories'>;
```

Kompletny obiekt historii zawierający:

- `id`: UUID v4
- `user_id`: UUID v4 (owner)
- `subject`: string (1-150 chars)
- `difficulty`: 1 | 2 | 3
- `darkness`: 1 | 2 | 3
- `question`: text
- `answer`: text
- `created_at`: timestamptz

#### Error Types:

```typescript
interface ErrorDTO {
	error: {
		code: ErrorCode;
		message: string;
		field?: string;
	};
}

type ErrorCode =
	| 'AUTHENTICATION_ERROR' // 401 - Missing/invalid token
	| 'NOT_FOUND' // 404 - User has no stories
	| 'INTERNAL_ERROR'; // 500 - Database error
```

### Brakujące typy:

Brak - istniejące typy są wystarczające.

## 4. Szczegóły odpowiedzi

### Success Response (200 OK)

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"user_id": "660e8400-e29b-41d4-a716-446655440001",
	"subject": "Znikający autostopowicz",
	"difficulty": 1,
	"darkness": 2,
	"question": "Kierowca zabiera autostopowicza w deszczową noc. Kilka kilometrów dalej, gdy ogląda się na tylne siedzenie, autostopowicz zniknął. Wszystkie drzwi były zamknięte przez całą podróż. Co się stało?",
	"answer": "Autostopowicz był duchem zmarłego w wypadku na tej drodze. Duchy często próbują wrócić do domu w rocznicę śmierci. Kierowca nieświadomie przewoził ducha, który zniknął po dotarciu w miejsce swojej dawnej śmierci.",
	"created_at": "2025-01-25T15:20:00.000Z"
}
```

**Headers:**

```
HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 456
```

### Error Responses

#### 401 Unauthorized - Missing/Invalid Token

```json
{
	"error": {
		"code": "AUTHENTICATION_ERROR",
		"message": "Brakujący lub nieprawidłowy token uwierzytelniający"
	}
}
```

**Przyczyny:**

- Brak header `Authorization`
- Token wygasł (expired)
- Token jest nieprawidłowy (invalid signature)

#### 404 Not Found - No Stories in Collection

```json
{
	"error": {
		"code": "NOT_FOUND",
		"message": "Nie masz jeszcze żadnych historii w kolekcji"
	}
}
```

**Przyczyna:**

- Użytkownik nie ma żadnych zapisanych historii
- Query zwróciło 0 wierszy

**Uwaga dla frontendu:**
Przycisk "Losowa historia" powinien być wyłączony (disabled) gdy lista historii jest pusta, aby uniknąć tego błędu.

#### 500 Internal Server Error - Database Error

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Wystąpił nieoczekiwany błąd serwera"
	}
}
```

**Przyczyny:**

- Błąd połączenia z bazą danych
- Timeout zapytania
- Nieoczekiwany exception

## 5. Przepływ danych

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ GET /api/stories/random
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────┐
│  SvelteKit API Route Handler    │
│  (src/routes/api/stories/       │
│   random/+server.ts)             │
└──────┬──────────────────────────┘
       │
       │ 1. No parameters to validate
       │    (only JWT in header)
       │
       ▼
┌─────────────────────────────────┐
│   SvelteKit Hooks (auth check)  │
│   (src/hooks.server.ts)          │
└──────┬──────────────────────────┘
       │
       │ 2. Verify JWT token
       │    ├─ Missing/Invalid? → 401 Unauthorized
       │    └─ Valid? → Attach user to locals
       │
       ▼
┌─────────────────────────────────┐
│   Story Service (optional)       │
│   (src/lib/server/services/     │
│    story.service.ts)             │
└──────┬──────────────────────────┘
       │
       │ 3. Call getRandomStory()
       │    with authenticated client
       │
       ▼
┌─────────────────────────────────┐
│   Supabase Client                │
│   (with user JWT)                │
└──────┬──────────────────────────┘
       │
       │ 4. Execute SQL SELECT
       │
       ▼
┌─────────────────────────────────┐
│   PostgreSQL + RLS               │
│   - Check stories_select_own     │
│   - Verify auth.uid() = user_id  │
│   - ORDER BY RANDOM()            │
│   - LIMIT 1                      │
└──────┬──────────────────────────┘
       │
       │ 5. Query Result
       │    ├─ 0 rows → 404 Not Found
       │    ├─ 1 row → 200 OK with StoryDTO
       │    └─ Error → 500 Internal Error
       │
       ▼
┌─────────────────────────────────┐
│   Response to Client             │
│   - 200 OK (with story)          │
│   - 404 Not Found (no stories)   │
│   - 500 Internal Error (DB fail) │
└─────────────────────────────────┘
```

### Szczegółowy przepływ:

1. **Request Handling**
   - Client wysyła GET request bez parametrów
   - JWT token w Authorization header

2. **Authentication Check**
   - Hook `src/hooks.server.ts` weryfikuje JWT
   - Tworzy `locals.supabase` z authenticated client
   - Zwraca 401 jeśli token invalid/missing

3. **Database Query**

   ```typescript
   const { data, error } = await locals.supabase.from('stories').select('*').limit(1).maybeSingle(); // Returns null if no rows, error only on actual DB error
   ```

   **Alternatywnie z explicit RANDOM():**

   ```sql
   -- Supabase może nie wspierać ORDER BY RANDOM() bezpośrednio
   -- Użycie PostgreSQL funkcji:
   SELECT * FROM stories
   WHERE user_id = auth.uid()
   ORDER BY random()
   LIMIT 1;
   ```

4. **RLS Enforcement** (automatyczne)

   ```sql
   SELECT * FROM public.stories
   WHERE user_id = auth.uid()  -- RLS policy
   ORDER BY random()
   LIMIT 1;
   ```

5. **Response Handling**
   - Jeśli `data === null` → 404 (brak historii)
   - Jeśli `data` istnieje → 200 z StoryDTO
   - Jeśli `error` → 500

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

- **Mechanizm**: JWT Bearer Token (Supabase Auth)
- **Implementacja**:
  - Token weryfikowany w `hooks.server.ts`
  - Nieważny/brakujący token → 401 Unauthorized
- **Token Lifetime**: 1 godzina (configurable w Supabase)
- **Auto-refresh**: Zarządzane przez `@supabase/supabase-js` SDK

### 6.2. Autoryzacja (Authorization)

- **Mechanizm**: PostgreSQL Row Level Security (RLS)
- **Polityka**: `stories_select_own`
  ```sql
  CREATE POLICY stories_select_own
  ON public.stories
  FOR SELECT
  USING (auth.uid() = user_id);
  ```
- **Efekt**: Użytkownik widzi tylko własne historie
- **Gwarancja**: Nawet błąd w kodzie nie pozwoli na dostęp do cudzych danych

### 6.3. Ochrona przed atakami

#### Information Disclosure

- **Status**: Mitigowane
- **Mechanizm**: 404 zwracane tylko gdy użytkownik nie ma ŻADNYCH historii
- **Efekt**: Nie ujawniamy liczby historii innych użytkowników

#### Timing Attacks

- **Status**: Niskie ryzyko
- **Opis**: `ORDER BY RANDOM()` ma stały czas wykonania (nie zależy od danych)
- **Efekt**: Atakujący nie może wywnioskować liczby historii z czasu odpowiedzi

#### SQL Injection

- **Status**: Mitigowane
- **Mechanizm**: Parametryzowane zapytania przez Supabase SDK
- **Efekt**: Brak możliwości wstrzyknięcia SQL (brak user input w query)

#### CSRF (Cross-Site Request Forgery)

- **Status**: Niskie ryzyko
- **Powód**: Endpoint wymaga Bearer token w header (nie cookie)
- **Efekt**: CSRF attack nie może dodać custom header przez browser

### 6.4. Rate Limiting

- **MVP**: Brak dedykowanego rate limiting
- **Ochrona**: Supabase built-in limits na database queries
- **Ryzyko**: Użytkownik może spamować endpoint "losowej historii"
- **Future**: Redis-based rate limiting per user (np. 30 requests/minute)

### 6.5. Auditing i Logging

- **Logowanie**:
  - Błędy 401 → info level (normalne przypadki)
  - Błędy 404 → debug level (użytkownik bez historii - normalne)
  - Błędy 500 → error level z pełnym stack trace
  - Sukcesy → opcjonalnie debug level
- **Dane do logowania**:
  - User ID (z JWT)
  - Timestamp
  - Request IP (opcjonalnie)
  - Story ID (w response)
- **GDPR**: Nie logować treści pytania/odpowiedzi

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Błąd             | HTTP Status | ErrorCode              | Przyczyna                           | Akcja                             |
| :--------------- | :---------- | :--------------------- | :---------------------------------- | :-------------------------------- |
| Missing token    | 401         | `AUTHENTICATION_ERROR` | Brak header `Authorization`         | Zwrócenie błędu w hooks           |
| Invalid token    | 401         | `AUTHENTICATION_ERROR` | Token wygasł lub jest niepoprawny   | Weryfikacja JWT w hooks           |
| No stories       | 404         | `NOT_FOUND`            | Użytkownik ma 0 historii w kolekcji | Sprawdzenie `data === null`       |
| Database error   | 500         | `INTERNAL_ERROR`       | Błąd połączenia z PostgreSQL        | Logowanie + generic error message |
| Query timeout    | 500         | `INTERNAL_ERROR`       | Query przekroczył timeout           | Logowanie + retry logic (future)  |
| Unexpected error | 500         | `INTERNAL_ERROR`       | Nieoczekiwany exception             | Try-catch + logowanie stacktrace  |

### 7.2. Error Response Helper

Wykorzystać istniejący helper z poprzednich endpointów:

```typescript
// src/lib/server/utils/api-error.ts
import type { ErrorCode, ErrorDTO } from '$lib/types';

export function createErrorResponse(
	code: ErrorCode,
	message: string,
	status: number,
	field?: string
): Response {
	const body: ErrorDTO = {
		error: {
			code,
			message,
			...(field && { field })
		}
	};

	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' }
	});
}

// Wstępnie zdefiniowane błędy
export const ApiErrors = {
	Unauthorized: () =>
		createErrorResponse(
			'AUTHENTICATION_ERROR',
			'Brakujący lub nieprawidłowy token uwierzytelniający',
			401
		),

	NoStoriesFound: () =>
		createErrorResponse('NOT_FOUND', 'Nie masz jeszcze żadnych historii w kolekcji', 404),

	InternalError: () =>
		createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera', 500)
};
```

### 7.3. Strategia obsługi

```typescript
// Pseudokod obsługi błędów w endpoint
try {
	// 1. Query dla losowej historii (auth sprawdzane w hooks)
	const { data, error } = await locals.supabase.from('stories').select('*').limit(1).maybeSingle();

	// 2. Sprawdzenie błędów Supabase
	if (error) {
		console.error('Supabase random story query error:', error);
		return ApiErrors.InternalError();
	}

	// 3. Sprawdzenie czy znaleziono jakąkolwiek historię
	if (!data) {
		return ApiErrors.NoStoriesFound();
	}

	// 4. Sukces - zwrócenie story
	return new Response(JSON.stringify(data), {
		status: 200,
		headers: { 'Content-Type': 'application/json' }
	});
} catch (err) {
	// Nieoczekiwany błąd
	console.error('Unexpected error in GET /api/stories/random:', err);
	return ApiErrors.InternalError();
}
```

## 8. Rozważania dotyczące wydajności

### 8.1. Target Response Times

- **GET /api/stories/random**: < 200ms (random query)

### 8.2. Database Query Performance

#### ORDER BY RANDOM() - Analiza wydajności

**Zalety:**

- Proste w implementacji
- Równomierne rozkład prawdopodobieństwa
- Wystarczająco szybkie dla małych zbiorów (<1000 wierszy)

**Wady:**

- Sequential scan dla dużych tabel
- Czas O(n) gdzie n = liczba historii użytkownika
- Nie używa indeksów

**Query Plan (przykładowy):**

```sql
EXPLAIN ANALYZE
SELECT * FROM public.stories
WHERE user_id = '660e8400-e29b-41d4-a716-446655440001'
ORDER BY random()
LIMIT 1;

-- Result (dla 100 historii):
-- Sort (cost=15.83..16.08 rows=100 width=1234) (actual time=2.134..2.135)
--   Sort Key: (random())
--   -> Seq Scan on stories (cost=0.00..12.50 rows=100)
--      Filter: (user_id = '660e8400-...'::uuid)
```

#### Alternatywna implementacja (dla przyszłej optymalizacji)

**Metoda: Random Offset**

```typescript
// 1. Pobierz count historii użytkownika
const { count } = await supabase
	.from('stories')
	.select('*', { count: 'exact', head: true })
	.eq('user_id', userId);

if (count === 0) return null;

// 2. Wygeneruj losowy offset
const randomOffset = Math.floor(Math.random() * count);

// 3. Pobierz 1 rekord z offsetem
const { data } = await supabase
	.from('stories')
	.select('*')
	.eq('user_id', userId)
	.order('created_at', { ascending: false })
	.range(randomOffset, randomOffset)
	.single();
```

**Zalety:**

- Używa indeksu `idx_stories_user_created`
- Czas O(log n) dla lookup
- Znacznie szybsze dla >1000 wierszy

**Wady:**

- Wymaga 2 query (count + select)
- Bardziej złożona implementacja
- Offset może być wolny dla bardzo dużych offsetów

**Rekomendacja dla MVP:**

- Użyć `ORDER BY RANDOM()` - prostsze i wystarczające
- Monitorować performance metrics
- Migrować do random offset jeśli średni czas > 300ms

### 8.3. Potencjalne wąskie gardła

| Wąskie gardło                           | Prawdopodobieństwo                                | Impact             | Mitigation                            |
| :-------------------------------------- | :------------------------------------------------ | :----------------- | :------------------------------------ |
| `ORDER BY RANDOM()` dla dużych kolekcji | Niskie w MVP (mało użytkowników z >1000 historii) | Średni (200-500ms) | Implementacja random offset           |
| Database connection pool                | Bardzo niskie                                     | Wysoki             | Zarządzane przez Supabase (PgBouncer) |
| JWT verification overhead               | Bardzo niskie                                     | Niski (~1-5ms)     | Cache'owane przez Supabase            |
| Network latency                         | Średnie                                           | Średni (50-200ms)  | Cloudflare CDN + edge functions       |

### 8.4. Strategie optymalizacji

#### Obecnie (MVP):

- ✅ Używanie `ORDER BY RANDOM()` dla prostoty
- ✅ RLS z prostym warunkiem (minimal overhead)
- ✅ Single query (no joins)
- ✅ Connection pooling via Supabase

#### Future optimizations:

- 🔮 **Random Offset Method**: Dla użytkowników z >500 historii
- 🔮 **Client-side caching**: Cache ostatnio pobranej losowej historii (5 min TTL)
- 🔮 **Edge Functions**: Cloudflare Workers dla niższej latencji
- 🔮 **Batch random**: Endpoint zwracający 5 losowych historii jednocześnie

### 8.5. Monitoring Metrics

Kluczowe metryki do śledzenia:

- **Response Time**: p50, p95, p99 percentile dla `/api/stories/random`
- **Error Rate**: % żądań z 404 (użytkownicy bez historii) vs 500 (błędy)
- **Query Time**: Czas wykonania PostgreSQL query
- **Stories per User**: Histogram rozkładu liczby historii (dla optymalizacji)

**Alert triggers:**

- p95 response time > 500ms → Investigate query performance
- 5xx error rate > 5% → Database connection issues

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska

- [ ] Upewnić się, że tabela `public.stories` istnieje z danymi testowymi
- [ ] Sprawdzić, że RLS policy `stories_select_own` jest włączona
- [ ] Zweryfikować, że `hooks.server.ts` poprawnie weryfikuje JWT

**Weryfikacja:**

```bash
# Sprawdzenie RLS policies
supabase db pull

# Dodanie testowych danych (jeśli brak)
# W Supabase SQL Editor:
INSERT INTO public.stories (user_id, subject, difficulty, darkness, question, answer)
VALUES
  (auth.uid(), 'Test historia 1', 1, 1, 'Pytanie?', 'Odpowiedź'),
  (auth.uid(), 'Test historia 2', 2, 2, 'Pytanie?', 'Odpowiedź'),
  (auth.uid(), 'Test historia 3', 3, 3, 'Pytanie?', 'Odpowiedź');
```

### Krok 2: Utworzenie helper funkcji (jeśli nie istnieją)

**Lokalizacja:** `src/lib/server/utils/api-error.ts`

- [ ] Sprawdzić czy plik już istnieje (utworzony w poprzednich endpointach)
- [ ] Jeśli nie istnieje, utworzyć funkcję `createErrorResponse()`
- [ ] Dodać błąd `NoStoriesFound` do `ApiErrors` object

**Kod:**

```typescript
// src/lib/server/utils/api-error.ts
export const ApiErrors = {
	// ... existing errors

	NoStoriesFound: () =>
		createErrorResponse('NOT_FOUND', 'Nie masz jeszcze żadnych historii w kolekcji', 404)
};
```

### Krok 3: (Opcjonalne) Utworzenie Story Service

**Lokalizacja:** `src/lib/server/services/story.service.ts`

- [ ] Sprawdzić czy plik service już istnieje
- [ ] Jeśli nie, utworzyć nowy service
- [ ] Dodać metodę `getRandomStory()`

**Kod:**

```typescript
// src/lib/server/services/story.service.ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { StoryDTO } from '$lib/types';

export class StoryService {
	/**
	 * Get a random story from the authenticated user's collection
	 * @returns StoryDTO or null if user has no stories
	 * @throws Error if database query fails
	 */
	async getRandomStory(supabase: SupabaseClient): Promise<StoryDTO | null> {
		const { data, error } = await supabase.from('stories').select('*').limit(1).maybeSingle();

		if (error) {
			throw new Error(`Failed to fetch random story: ${error.message}`);
		}

		return data;
	}
}

// Singleton instance
export const storyService = new StoryService();
```

**Uwaga:** W Supabase JavaScript client, `ORDER BY RANDOM()` nie jest bezpośrednio wspierane. Musimy użyć `.rpc()` dla custom function lub pobrać wszystkie i wybrać losowo w kodzie (mniej efektywne).

**Alternatywnie - PostgreSQL Function:**

```sql
-- W Supabase SQL Editor:
CREATE OR REPLACE FUNCTION get_random_story()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject varchar(150),
  difficulty smallint,
  darkness smallint,
  question text,
  answer text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT s.*
  FROM public.stories s
  WHERE s.user_id = auth.uid()
  ORDER BY random()
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Użycie w service:**

```typescript
async getRandomStory(supabase: SupabaseClient): Promise<StoryDTO | null> {
  const { data, error } = await supabase
    .rpc('get_random_story')
    .single();

  if (error) {
    // PGRST116 = no rows returned
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch random story: ${error.message}`);
  }

  return data;
}
```

### Krok 4: Implementacja SvelteKit API Route

**Lokalizacja:** `src/routes/api/stories/random/+server.ts`

- [ ] Utworzyć folder `random/` w `src/routes/api/stories/`
- [ ] Utworzyć plik `+server.ts`
- [ ] Zaimplementować funkcję `GET` handler
- [ ] Dodać import typów i helpers

**Struktura:**

```typescript
import { ApiErrors } from '$lib/server/utils/api-error';
import { storyService } from '$lib/server/services/story.service';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	// Implementation
};
```

### Krok 5: Implementacja logiki GET handler

- [ ] Wywołać `storyService.getRandomStory()` lub bezpośrednie query
- [ ] Obsłużyć przypadek `data === null` (brak historii)
- [ ] Zwrócić odpowiedź z StoryDTO

**Kod (z service):**

```typescript
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Fetch random story (RLS automatically filters by user_id)
		const story = await storyService.getRandomStory(locals.supabase);

		// No stories in user's collection
		if (!story) {
			return ApiErrors.NoStoriesFound();
		}

		// Success - return story
		return new Response(JSON.stringify(story), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (error) {
		console.error('Error fetching random story:', error);
		return ApiErrors.InternalError();
	}
};
```

**Kod (bez service - bezpośrednie query):**

```typescript
export const GET: RequestHandler = async ({ locals }) => {
	try {
		// Call PostgreSQL function for random story
		const { data, error } = await locals.supabase.rpc('get_random_story').maybeSingle();

		if (error) {
			console.error('Supabase random story error:', error);
			return ApiErrors.InternalError();
		}

		if (!data) {
			return ApiErrors.NoStoriesFound();
		}

		return new Response(JSON.stringify(data), {
			status: 200,
			headers: { 'Content-Type': 'application/json' }
		});
	} catch (err) {
		console.error('Unexpected error in GET /api/stories/random:', err);
		return ApiErrors.InternalError();
	}
};
```

### Krok 6: Utworzenie PostgreSQL Function (zalecane)

**Lokalizacja:** Supabase SQL Editor lub migration file

- [ ] Utworzyć funkcję `get_random_story()` w bazie danych
- [ ] Przetestować funkcję bezpośrednio w SQL Editor
- [ ] Dodać do migration file dla version control

**SQL Migration:**

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_random_story_function.sql

CREATE OR REPLACE FUNCTION get_random_story()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  subject varchar(150),
  difficulty smallint,
  darkness smallint,
  question text,
  answer text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    s.subject,
    s.difficulty,
    s.darkness,
    s.question,
    s.answer,
    s.created_at
  FROM public.stories s
  WHERE s.user_id = auth.uid()
  ORDER BY random()
  LIMIT 1;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_random_story() TO authenticated;

COMMENT ON FUNCTION get_random_story() IS
'Returns a random story from the authenticated user''s collection. Returns no rows if user has no stories.';
```

### Krok 7: Testowanie manualne

- [ ] Uruchomić dev server: `npm run dev`
- [ ] Zalogować się do aplikacji (uzyskać JWT token)
- [ ] Upewnić się, że użytkownik ma przynajmniej 3 historie testowe

**Test 1: Success case (200)**

```bash
curl -X GET http://localhost:5173/api/stories/random \
  -H "Authorization: Bearer {token}" \
  -H "Accept: application/json"

# Oczekiwane: 200 OK z losową historią
# Wywołać wielokrotnie aby zweryfikować losowość
```

**Test 2: No stories (404)**

```bash
# Zalogować się jako nowy użytkownik bez historii
curl -X GET http://localhost:5173/api/stories/random \
  -H "Authorization: Bearer {new_user_token}"

# Oczekiwane: 404 + "Nie masz jeszcze żadnych historii w kolekcji"
```

**Test 3: Unauthorized (401)**

```bash
curl -X GET http://localhost:5173/api/stories/random

# Oczekiwane: 401 + AUTHENTICATION_ERROR
```

### Krok 8: Weryfikacja losowości

- [ ] Utworzyć skrypt testowy wywołujący endpoint 100 razy
- [ ] Zliczyć częstotliwość każdej historii
- [ ] Sprawdzić czy rozkład jest zbliżony do równomiernego

**Test script (JavaScript):**

```javascript
// test-randomness.js
const TOKEN = 'your-jwt-token';
const ITERATIONS = 100;

async function testRandomness() {
	const counts = {};

	for (let i = 0; i < ITERATIONS; i++) {
		const response = await fetch('http://localhost:5173/api/stories/random', {
			headers: { Authorization: `Bearer ${TOKEN}` }
		});
		const story = await response.json();
		counts[story.id] = (counts[story.id] || 0) + 1;
	}

	console.log('Story distribution (100 calls):');
	console.table(counts);

	// Sprawdzenie czy żadna historia nie dominuje (>50%)
	const maxCount = Math.max(...Object.values(counts));
	const isBalanced = maxCount < ITERATIONS * 0.5;
	console.log(`Balanced distribution: ${isBalanced ? 'YES' : 'NO'}`);
}

testRandomness();
```

### Krok 9: Testowanie wydajności

- [ ] Użyć `wrk` lub `ab` do load testing
- [ ] Sprawdzić czy p95 < 200ms
- [ ] Monitorować Supabase dashboard dla query performance

**Load test:**

```bash
# Instalacja wrk (macOS)
brew install wrk

# Run 30s test, 10 concurrent connections
wrk -t10 -c10 -d30s \
  -H "Authorization: Bearer {token}" \
  http://localhost:5173/api/stories/random

# Sprawdzić:
# - Latency p50, p95, p99
# - Requests/sec
# - Error rate
```

**Expected results:**

- p95 latency: < 200ms
- Throughput: > 50 req/sec
- Error rate: 0%

### Krok 10: Implementacja testów jednostkowych (opcjonalne dla MVP)

**Lokalizacja:** `src/lib/server/services/story.service.test.ts`

- [ ] Test: `getRandomStory()` zwraca StoryDTO
- [ ] Test: `getRandomStory()` zwraca null dla użytkownika bez historii
- [ ] Test: `getRandomStory()` throw error przy błędzie bazy

**Framework:** Vitest + mocked Supabase client

**Przykładowy test:**

```typescript
import { describe, it, expect, vi } from 'vitest';
import { StoryService } from './story.service';

describe('StoryService.getRandomStory', () => {
	it('should return a random story', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: {
						id: 'uuid',
						subject: 'Test',
						question: 'Q',
						answer: 'A'
					},
					error: null
				})
			})
		};

		const service = new StoryService();
		const result = await service.getRandomStory(mockSupabase as any);

		expect(result).toBeDefined();
		expect(result?.subject).toBe('Test');
	});

	it('should return null when user has no stories', async () => {
		const mockSupabase = {
			rpc: vi.fn().mockReturnValue({
				maybeSingle: vi.fn().mockResolvedValue({
					data: null,
					error: null
				})
			})
		};

		const service = new StoryService();
		const result = await service.getRandomStory(mockSupabase as any);

		expect(result).toBeNull();
	});
});
```

### Krok 11: Implementacja testów E2E

**Lokalizacja:** `tests/e2e/random-story.spec.ts`

- [ ] Test: Użytkownik klika "Losowa historia" i widzi pełny ekran historii
- [ ] Test: Przycisk "Losowa historia" jest disabled gdy brak historii
- [ ] Test: Wielokrotne kliknięcia pokazują różne historie

**Framework:** Playwright

**Przykładowy test:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Random Story Feature', () => {
	test.beforeEach(async ({ page }) => {
		// Login
		await page.goto('/login');
		await page.fill('[name="email"]', 'test@example.com');
		await page.fill('[name="password"]', 'password123');
		await page.click('button[type="submit"]');
		await page.waitForURL('/');
	});

	test('displays a random story when button is clicked', async ({ page }) => {
		// Navigate to story list
		await page.goto('/history');

		// Click "Random Story" button
		await page.click('[data-testid="random-story-btn"]');

		// Wait for story detail page
		await page.waitForURL(/\/history\/[a-f0-9-]+/);

		// Verify story content is displayed
		await expect(page.locator('[data-testid="story-question"]')).toBeVisible();
		await expect(page.locator('[data-testid="story-answer"]')).toBeVisible();
	});

	test('button is disabled when user has no stories', async ({ page }) => {
		// Login as new user without stories
		// ... (create new user)

		await page.goto('/history');

		// Verify button is disabled
		const button = page.locator('[data-testid="random-story-btn"]');
		await expect(button).toBeDisabled();
	});

	test('shows different stories on multiple clicks', async ({ page }) => {
		await page.goto('/history');

		const storyIds = new Set();

		// Click random button 5 times
		for (let i = 0; i < 5; i++) {
			await page.click('[data-testid="random-story-btn"]');
			await page.waitForURL(/\/history\/[a-f0-9-]+/);

			// Extract story ID from URL
			const url = page.url();
			const id = url.split('/').pop();
			storyIds.add(id);

			// Go back to list
			await page.goBack();
		}

		// Expect at least 2 different stories (probability check)
		expect(storyIds.size).toBeGreaterThanOrEqual(2);
	});
});
```

### Krok 12: Integracja z frontendem

- [ ] Utworzyć przycisk "Losowa historia" w widoku listy
- [ ] Wywołać API endpoint przy kliknięciu
- [ ] Przekierować do `/history/{id}` z otrzymaną historią
- [ ] Wyłączyć przycisk gdy `stories.length === 0`

**Przykładowy komponent (Svelte):**

```svelte
<script lang="ts">
	import { goto } from '$app/navigation';
	import { storiesStore } from '$lib/stores/stories';

	let loading = false;

	async function handleRandomStory() {
		loading = true;
		try {
			const response = await fetch('/api/stories/random', {
				headers: {
					Authorization: `Bearer ${$authStore.token}`
				}
			});

			if (response.ok) {
				const story = await response.json();
				goto(`/history/${story.id}`);
			} else if (response.status === 404) {
				alert('Nie masz jeszcze żadnych historii');
			} else {
				alert('Wystąpił błąd podczas pobierania losowej historii');
			}
		} catch (error) {
			console.error('Error fetching random story:', error);
			alert('Wystąpił błąd połączenia');
		} finally {
			loading = false;
		}
	}
</script>

<button
	on:click={handleRandomStory}
	disabled={$storiesStore.length === 0 || loading}
	data-testid="random-story-btn"
	class="btn btn-primary"
>
	{#if loading}
		Ładowanie...
	{:else}
		Losowa historia
	{/if}
</button>
```

### Krok 13: Code review i merge

- [ ] Utworzyć Pull Request
- [ ] Sprawdzić wszystkie checklist items
- [ ] Code review przez zespół
- [ ] Sprawdzić, że wszystkie testy przechodzą (unit + E2E)
- [ ] Merge do `main` branch

**PR Checklist:**

- [ ] Endpoint zwraca 200 z losową historią
- [ ] Endpoint zwraca 404 gdy użytkownik nie ma historii
- [ ] Endpoint zwraca 401 dla unauthorized requests
- [ ] PostgreSQL function `get_random_story()` została utworzona
- [ ] RLS jest aktywne i weryfikowane
- [ ] Testy jednostkowe przechodzą
- [ ] Testy E2E przechodzą
- [ ] Performance test pokazuje p95 < 200ms
- [ ] Kod zgodny z ESLint i Prettier
- [ ] TypeScript typy są poprawne

### Krok 14: Deployment

- [ ] Deploy do staging environment
- [ ] Smoke testing na staging:
  - Zarejestrować nowego użytkownika
  - Utworzyć 5 historii testowych
  - Wywołać `/api/stories/random` 10 razy
  - Zweryfikować losowość i response times
- [ ] Deploy do production (Cloudflare Pages)
- [ ] Monitoring przez pierwsze 24h

**Post-deployment checks:**

```bash
# Production API test
curl https://mrocznehistorie.app/api/stories/random \
  -H "Authorization: Bearer {prod_token}" \
  -w "\nTime: %{time_total}s\n"

# Expected: 200 OK, time < 0.5s
```

### Krok 15: Dokumentacja

- [ ] Zaktualizować OpenAPI spec o nowy endpoint
- [ ] Dodać przykłady użycia do README
- [ ] Udokumentować PostgreSQL function w migration comments
- [ ] Zaktualizować API documentation website

**OpenAPI spec entry:**

```yaml
/api/stories/random:
  get:
    summary: Get random story
    description: Retrieve a random story from the authenticated user's collection
    security:
      - bearerAuth: []
    responses:
      '200':
        description: Random story retrieved successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/StoryDTO'
      '401':
        $ref: '#/components/responses/Unauthorized'
      '404':
        description: User has no stories in collection
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ErrorDTO'
      '500':
        $ref: '#/components/responses/InternalError'
```

---

## 10. Checklist weryfikacyjny

Przed uznaniem implementacji za kompletną, zweryfikować:

### Funkcjonalność

- [ ] Endpoint zwraca 200 z losową historią dla użytkownika z kolekcją
- [ ] Endpoint zwraca różne historie przy wielokrotnym wywołaniu (losowość)
- [ ] Endpoint zwraca 401 dla brakującego/niepoprawnego tokena
- [ ] Endpoint zwraca 404 gdy użytkownik nie ma żadnych historii
- [ ] Endpoint zwraca 500 przy błędzie bazy danych

### Bezpieczeństwo

- [ ] RLS policy `stories_select_own` jest aktywna
- [ ] JWT token jest weryfikowany w hooks
- [ ] Użytkownik widzi tylko własne historie (nie może dostać cudzej)
- [ ] Error messages nie ujawniają wrażliwych informacji

### Wydajność

- [ ] Query używa odpowiedniej metody losowania (RANDOM() lub offset)
- [ ] Response time p95 < 200ms
- [ ] Brak N+1 query problems
- [ ] PostgreSQL function wykorzystuje RLS dla bezpieczeństwa

### Kod

- [ ] Kod jest zgodny z ESLint rules
- [ ] Kod jest sformatowany przez Prettier
- [ ] Typy TypeScript są poprawne (brak `any`)
- [ ] Error handling jest kompletny (try-catch)
- [ ] Logging jest na odpowiednim poziomie

### Testy

- [ ] Testy jednostkowe przechodzą (jeśli zaimplementowane)
- [ ] Testy E2E przechodzą
- [ ] Performance test pokazuje akceptowalny czas odpowiedzi
- [ ] Randomness test pokazuje równomierny rozkład

### Dokumentacja

- [ ] OpenAPI spec jest zaktualizowany
- [ ] README zawiera przykłady użycia
- [ ] PostgreSQL function jest udokumentowana
- [ ] Code comments wyjaśniają decyzje o losowości

---

## 11. Troubleshooting

### Problem: ORDER BY RANDOM() nie działa w Supabase JS Client

**Symptom:** Błąd "order by clause is not supported for random()"

**Rozwiązanie:**
Użyć PostgreSQL function z `SECURITY DEFINER`:

```sql
CREATE FUNCTION get_random_story() ...
```

### Problem: Query jest zbyt wolne (>500ms)

**Diagnosis:**

```sql
EXPLAIN ANALYZE
SELECT * FROM stories
WHERE user_id = auth.uid()
ORDER BY random()
LIMIT 1;
```

**Rozwiązania:**

1. Sprawdzić czy RLS nie powoduje sequential scan
2. Zmienić na random offset method
3. Dodać composite index jeśli brakuje

### Problem: Niektóre historie nigdy nie są losowane

**Diagnosis:**

- Run randomness test (100+ iterations)
- Sprawdzić rozkład prawdopodobieństwa

**Możliwe przyczyny:**

- Bug w `random()` seed
- RLS niepoprawnie filtruje niektóre wiersze
- Stale same historie w cache

**Rozwiązanie:**

- Zweryfikować RLS policy
- Sprawdzić czy wszystkie historie mają `user_id` ustawione
- Disable caching podczas debugowania

### Problem: 404 mimo że użytkownik ma historie

**Diagnosis:**

```sql
-- W Supabase SQL Editor (jako user):
SELECT COUNT(*) FROM stories WHERE user_id = auth.uid();
```

**Możliwe przyczyny:**

- RLS policy blokuje dostęp
- JWT token ma niepoprawny `user_id`
- PostgreSQL function używa niewłaściwego `auth.uid()`

**Rozwiązanie:**

- Sprawdzić `SECURITY DEFINER` vs `SECURITY INVOKER`
- Zweryfikować JWT payload
- Test RLS manually:
  ```sql
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claim.sub = 'user-uuid';
  SELECT * FROM stories;
  ```

---

## 12. Referencje

### Dokumentacja zewnętrzna:

- [SvelteKit API Routes](https://kit.svelte.dev/docs/routing#server)
- [Supabase JavaScript Client - RPC](https://supabase.com/docs/reference/javascript/rpc)
- [PostgreSQL RANDOM() Function](https://www.postgresql.org/docs/current/functions-math.html)
- [PostgreSQL Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Playwright Testing](https://playwright.dev/docs/intro)

### Dokumentacja wewnętrzna:

- `.ai/api-plan.md` - Pełna specyfikacja REST API (sekcja 4.2.3)
- `.ai/db-plan.md` - Schemat bazy danych i RLS policies
- `src/types.ts` - Definicje typów TypeScript
- `CLAUDE.md` - Reguły implementacji projektu

### Artykuły o random selection w SQL:

- [Efficient Random Sampling in PostgreSQL](https://www.2ndquadrant.com/en/blog/postgresql-anti-patterns-random-sampling/)
- [Performance of ORDER BY RANDOM()](https://dba.stackexchange.com/questions/127291/order-by-random-is-slow-how-to-improve-it)
