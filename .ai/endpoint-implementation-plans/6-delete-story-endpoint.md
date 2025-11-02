# API Endpoint Implementation Plan: DELETE Story

## 1. Przegląd punktu końcowego

Endpoint `DELETE /api/stories/:id` umożliwia użytkownikom trwałe usunięcie pojedynczej historii z bazy danych. Jest to operacja nieodwracalna, która wymaga uwierzytelnienia i podlega polityce Row Level Security (RLS), aby zapewnić, że użytkownicy mogą usuwać tylko własne historie.

**Kluczowe cechy:**

- Trwałe usunięcie
- Wymaga potwierdzenia po stronie frontendu (PRD 3.7)
- Chronione przez RLS policy `stories_delete_own`
- Zwraca 204 No Content przy sukcesie

## 2. Szczegóły żądania

### Metoda HTTP

`DELETE`

### Struktura URL

```
/api/stories/:id
```

### Parametry

#### URL Parameters (wymagane):

- **`id`** (string, UUID v4)
  - Unikalny identyfikator historii do usunięcia
  - Format: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
  - Przykład: `550e8400-e29b-41d4-a716-446655440000`

#### Headers (wymagane):

- **`Authorization`**: `Bearer <JWT_TOKEN>`
  - JWT token otrzymany z Supabase Auth
  - Automatycznie zarządzany przez `@supabase/supabase-js` SDK

#### Request Body

Brak (metoda DELETE nie przyjmuje ciała żądania)

### Przykładowe żądanie

```http
DELETE /api/stories/550e8400-e29b-41d4-a716-446655440000 HTTP/1.1
Host: mrocznehistorie.app
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 3. Wykorzystywane typy

### Z `src/types.ts`:

#### Funkcje walidacyjne:

```typescript
isValidUUID(id: string): boolean
```

- Walidacja formatu UUID v4 parametru `:id`

#### Typy błędów:

```typescript
interface ErrorDTO {
	error: {
		code: ErrorCode;
		message: string;
		field?: string;
	};
}

type ErrorCode =
	| 'VALIDATION_ERROR' // 400 - Invalid UUID
	| 'AUTHENTICATION_ERROR' // 401 - Missing/invalid token
	| 'NOT_FOUND' // 404 - Story doesn't exist or no access
	| 'INTERNAL_ERROR'; // 500 - Database error
```

#### Typy zasobów (opcjonalnie dla logowania):

```typescript
type StoryDTO = Tables<'stories'>;
```

### Brakujące typy (do utworzenia jeśli potrzebne):

Brak - istniejące typy są wystarczające.

## 4. Szczegóły odpowiedzi

### Success Response (204 No Content)

```http
HTTP/1.1 204 No Content
```

- Brak ciała odpowiedzi
- Potwierdza pomyślne usunięcie zasobu

### Error Responses

#### 400 Bad Request - Invalid UUID

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Nieprawidłowy format ID historii",
		"field": "id"
	}
}
```

#### 401 Unauthorized - Missing/Invalid Token

```json
{
	"error": {
		"code": "AUTHENTICATION_ERROR",
		"message": "Brakujący lub nieprawidłowy token uwierzytelniający"
	}
}
```

#### 404 Not Found - Story Doesn't Exist or No Access

```json
{
	"error": {
		"code": "NOT_FOUND",
		"message": "Nie znaleziono historii lub nie masz do niej dostępu"
	}
}
```

**Uwaga:** Odpowiedź 404 jest zwracana zarówno gdy historia nie istnieje, jak i gdy użytkownik próbuje usunąć cudzą historię (ze względów bezpieczeństwa - nie ujawniamy istnienia cudzych zasobów).

#### 500 Internal Server Error - Database Error

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Wystąpił nieoczekiwany błąd serwera"
	}
}
```

## 5. Przepływ danych

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ DELETE /api/stories/:id
       │ Authorization: Bearer <token>
       ▼
┌─────────────────────────────────┐
│  SvelteKit API Route Handler    │
│  (src/routes/api/stories/[id]/  │
│   +server.ts)                    │
└──────┬──────────────────────────┘
       │
       │ 1. Extract :id from URL params
       │ 2. Validate UUID format
       │    ├─ Invalid? → 400 Bad Request
       │    └─ Valid? → Continue
       │
       ▼
┌─────────────────────────────────┐
│   SvelteKit Hooks (auth check)  │
│   (src/hooks.server.ts)          │
└──────┬──────────────────────────┘
       │
       │ 3. Verify JWT token
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
       │ 4. Call Supabase DELETE query
       │    with authenticated client
       │
       ▼
┌─────────────────────────────────┐
│   Supabase Client                │
│   (with user JWT)                │
└──────┬──────────────────────────┘
       │
       │ 5. Execute SQL DELETE
       │
       ▼
┌─────────────────────────────────┐
│   PostgreSQL + RLS               │
│   - Check stories_delete_own     │
│   - Verify auth.uid() = user_id  │
└──────┬──────────────────────────┘
       │
       │ 6. RLS Policy Check
       │    ├─ Story not found OR user_id mismatch
       │    │  → Return 0 rows deleted → 404
       │    └─ Success → Delete row
       │
       ▼
┌─────────────────────────────────┐
│   Response to Client             │
│   - 204 No Content (success)     │
│   - 404 Not Found (no access)    │
│   - 500 Internal Error (DB fail) │
└─────────────────────────────────┘
```

### Szczegółowy przepływ:

1. **Request Parsing**
   - SvelteKit automatycznie parsuje parametr `:id` z URL
   - Dostęp przez `params.id` w handler funkcji

2. **UUID Validation**
   - Wywołanie `isValidUUID(params.id)`
   - Zwrócenie 400 jeśli walidacja nie przejdzie

3. **Authentication Check**
   - Hook `src/hooks.server.ts` weryfikuje JWT token
   - Tworzy `locals.supabase` z authenticated client
   - Zwraca 401 jeśli token jest invalid/missing

4. **Database Query**

   ```typescript
   const { error } = await locals.supabase.from('stories').delete().eq('id', id);
   ```

5. **RLS Enforcement** (automatyczne)

   ```sql
   DELETE FROM public.stories
   WHERE id = $1
     AND auth.uid() = user_id;  -- RLS policy
   ```

6. **Response Handling**
   - Jeśli usunięto 0 wierszy → 404 (story nie istnieje lub brak dostępu)
   - Jeśli usunięto 1 wiersz → 204 (sukces)
   - Jeśli błąd bazy danych → 500

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

- **Mechanizm**: JWT Bearer Token (Supabase Auth)
- **Implementacja**:
  - Token jest weryfikowany w `hooks.server.ts`
  - Nieważny/brakujący token → 401 Unauthorized
- **Token Lifetime**: 1 godzina (configurable w Supabase)
- **Auto-refresh**: Zarządzane przez `@supabase/supabase-js` SDK

### 6.2. Autoryzacja (Authorization)

- **Mechanizm**: PostgreSQL Row Level Security (RLS)
- **Polityka**: `stories_delete_own`
  ```sql
  CREATE POLICY stories_delete_own
  ON public.stories
  FOR DELETE
  USING (auth.uid() = user_id);
  ```
- **Efekt**: Użytkownik może usunąć tylko własne historie
- **Zero Trust**: Nawet błąd w kodzie aplikacji nie pozwoli na usunięcie cudzej historii

### 6.3. Ochrona przed atakami

#### CSRF (Cross-Site Request Forgery)

- **Status**: Niskie ryzyko
- **Powód**: Endpoint wymaga Bearer token w header (nie cookie)
- **Dodatkowa ochrona**: SameSite cookies (jeśli używane)

#### UUID Enumeration

- **Status**: Zmitigowane
- **Mechanizm**: UUID v4 (losowy, niemożliwy do odgadnięcia)
- **Efekt**: Atakujący nie może iterować po ID aby znaleźć cudze historie

#### Data Leakage

- **Status**: Zmitigowane
- **Mechanizm**: 404 zwracane zarówno dla nieistniejącej historii jak i cudzej
- **Efekt**: Atakujący nie może określić czy historia istnieje

#### SQL Injection

- **Status**: Zmitigowane
- **Mechanizm**: Parametryzowane zapytania przez Supabase SDK
- **Efekt**: Brak możliwości wstrzyknięcia SQL

### 6.4. Rate Limiting

- **MVP**: Brak dedykowanego rate limiting
- **Ochrona**: Supabase built-in limits na database queries
- **Future**: Redis-based rate limiting per user (np. 10 deletion/minute)

### 6.5. Auditing i Logging

- **Logowanie**:
  - Błędy 401/404 → info level (normalne przypadki)
  - Błędy 500 → error level z pełnym stack trace
  - Sukcesy → opcjonalnie debug level
- **Dane do logowania**:
  - User ID (z JWT)
  - Story ID
  - Timestamp
  - Request IP (opcjonalnie)
- **GDPR**: Nie logować PII (email, subject content)

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Błąd                | HTTP Status | ErrorCode              | Przyczyna                                         | Akcja                                       |
| :------------------ | :---------- | :--------------------- | :------------------------------------------------ | :------------------------------------------ |
| Invalid UUID format | 400         | `VALIDATION_ERROR`     | Parametr `:id` nie jest poprawnym UUID v4         | Walidacja wejścia za pomocą `isValidUUID()` |
| Missing token       | 401         | `AUTHENTICATION_ERROR` | Brak header `Authorization`                       | Zwrócenie błędu w hooks                     |
| Invalid token       | 401         | `AUTHENTICATION_ERROR` | Token wygasł lub jest niepoprawny                 | Weryfikacja JWT w hooks                     |
| Story not found     | 404         | `NOT_FOUND`            | Historia o podanym ID nie istnieje                | Sprawdzenie liczby usuniętych wierszy       |
| No access           | 404         | `NOT_FOUND`            | Historia należy do innego użytkownika (RLS block) | RLS automatycznie blokuje                   |
| Database error      | 500         | `INTERNAL_ERROR`       | Błąd połączenia z PostgreSQL lub Supabase         | Logowanie + generic error message           |
| Unexpected error    | 500         | `INTERNAL_ERROR`       | Nieoczekiwany exception                           | Try-catch + logowanie pełnego stacktrace    |

### 7.2. Error Response Helper

Stworzyć helper funkcję do standaryzacji odpowiedzi błędów:

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
	InvalidUUID: () =>
		createErrorResponse('VALIDATION_ERROR', 'Nieprawidłowy format ID historii', 400, 'id'),

	Unauthorized: () =>
		createErrorResponse(
			'AUTHENTICATION_ERROR',
			'Brakujący lub nieprawidłowy token uwierzytelniający',
			401
		),

	NotFound: () =>
		createErrorResponse('NOT_FOUND', 'Nie znaleziono historii lub nie masz do niej dostępu', 404),

	InternalError: () =>
		createErrorResponse('INTERNAL_ERROR', 'Wystąpił nieoczekiwany błąd serwera', 500)
};
```

### 7.3. Strategia obsługi

```typescript
// Pseudokod obsługi błędów w endpoint
try {
	// 1. Walidacja UUID
	if (!isValidUUID(id)) {
		return ApiErrors.InvalidUUID();
	}

	// 2. Delete query (auth sprawdzane w hooks)
	const { error, count } = await supabase.from('stories').delete().eq('id', id);

	// 3. Sprawdzenie błędów Supabase
	if (error) {
		console.error('Supabase delete error:', error);
		return ApiErrors.InternalError();
	}

	// 4. Sprawdzenie czy cokolwiek usunięto
	if (count === 0) {
		return ApiErrors.NotFound();
	}

	// 5. Sukces
	return new Response(null, { status: 204 });
} catch (err) {
	// Nieoczekiwany błąd
	console.error('Unexpected error in DELETE /api/stories/:id:', err);
	return ApiErrors.InternalError();
}
```

## 8. Rozważania dotyczące wydajności

### 8.1. Target Response Times

- **DELETE /api/stories/:id**: < 150ms (single DELETE operation)

### 8.2. Database Query Performance

#### Index Usage

- **Primary Key Index**: `stories_pkey` na kolumnie `id`
  - DELETE używa PK lookup → O(log n) complexity
  - Bardzo szybkie nawet dla milionów rekordów

#### RLS Overhead

- **Policy Check**: `auth.uid() = user_id`
  - Minimalne overhead (~1-2ms)
  - Postgres cache'uje wyniki `auth.uid()` w ramach sesji

#### Query Plan (przykładowy)

```sql
EXPLAIN DELETE FROM public.stories
WHERE id = '550e8400-e29b-41d4-a716-446655440000';

-- Result:
-- Delete on stories (cost=0.15..8.17 rows=1)
--   -> Index Scan using stories_pkey on stories
--      Index Cond: (id = '550e8400-...'::uuid)
```

### 8.3. Potencjalne wąskie gardła

| Wąskie gardło                         | Prawdopodobieństwo                 | Mitigation                               |
| :------------------------------------ | :--------------------------------- | :--------------------------------------- |
| Database connection pool exhaustion   | Niskie (zarządzane przez Supabase) | PgBouncer w transaction mode             |
| JWT verification overhead             | Bardzo niskie (~1-5ms)             | Cache'owane przez Supabase               |
| Network latency (client ↔ server)    | Średnie (zależne od geografii)     | Cloudflare CDN + edge functions (future) |
| Database latency (server ↔ Supabase) | Niskie (dedykowane połączenie)     | Connection pooling                       |

### 8.4. Strategie optymalizacji

#### Obecne (MVP):

- ✅ Primary key index
- ✅ Connection pooling (Supabase)
- ✅ Minimalna RLS policy

### 8.5. Monitoring Metrics

Kluczowe metryki do śledzenia:

- **Response Time**: p50, p95, p99 percentile
- **Error Rate**: % żądań z 5xx
- **Throughput**: Liczba usunięć na minutę
- **Database Query Time**: Czas wykonania DELETE query

## 9. Etapy wdrożenia

### Krok 1: Przygotowanie środowiska

- [ ] Upewnić się, że tabela `public.stories` istnieje
- [ ] Sprawdzić, że RLS policy `stories_delete_own` jest włączona
- [ ] Zweryfikować, że `hooks.server.ts` poprawnie weryfikuje JWT

**Weryfikacja:**

```bash
# Sprawdzenie RLS policies
supabase db pull
# Sprawdzić migrację z politykami RLS
```

### Krok 2: Utworzenie helper funkcji do obsługi błędów

**Lokalizacja:** `src/lib/server/utils/api-error.ts`

- [ ] Utworzyć funkcję `createErrorResponse()`
- [ ] Dodać wstępnie zdefiniowane błędy w `ApiErrors` object
- [ ] Wyeksportować typy i funkcje

**Zadania:**

```typescript
// src/lib/server/utils/api-error.ts
export function createErrorResponse(...) { ... }
export const ApiErrors = { ... }
```

### Krok 3: Implementacja SvelteKit API Route

**Lokalizacja:** `src/routes/api/stories/[id]/+server.ts`

- [ ] Utworzyć plik `+server.ts` w folderze `[id]`
- [ ] Zaimplementować funkcję `DELETE` handler
- [ ] Dodać import typów z `$lib/types`
- [ ] Dodać import `ApiErrors` z utils

**Struktura:**

```typescript
import { isValidUUID } from '$lib/types';
import { ApiErrors } from '$lib/server/utils/api-error';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params, locals }) => {
	// Implementation
};
```

### Krok 4: Walidacja parametru :id

- [ ] Wyciągnąć `params.id` z URL
- [ ] Wywołać `isValidUUID(params.id)`
- [ ] Zwrócić `ApiErrors.InvalidUUID()` jeśli walidacja nie przejdzie

**Kod:**

```typescript
const { id } = params;

if (!isValidUUID(id)) {
	return ApiErrors.InvalidUUID();
}
```

### Krok 5: Wykonanie DELETE query

- [ ] Wywołać `locals.supabase.from('stories').delete().eq('id', id)`
- [ ] Użyć `count` option aby uzyskać liczbę usuniętych wierszy
- [ ] Obsłużyć błędy Supabase

**Kod:**

```typescript
const { error, count } = await locals.supabase
	.from('stories')
	.delete({ count: 'exact' })
	.eq('id', id);
```

### Krok 6: Obsługa odpowiedzi

- [ ] Sprawdzić `error` z Supabase → zwrócić 500
- [ ] Sprawdzić `count === 0` → zwrócić 404
- [ ] Zwrócić 204 No Content przy sukcesie

**Kod:**

```typescript
if (error) {
	console.error('Supabase delete error:', error);
	return ApiErrors.InternalError();
}

if (count === 0) {
	return ApiErrors.NotFound();
}

return new Response(null, { status: 204 });
```

### Krok 7: Dodanie try-catch wrapper

- [ ] Owinąć całą logikę w `try-catch`
- [ ] Logować nieoczekiwane błędy
- [ ] Zwracać `ApiErrors.InternalError()` w catch

**Kod:**

```typescript
export const DELETE: RequestHandler = async ({ params, locals }) => {
	try {
		// ... cała logika
	} catch (err) {
		console.error('Unexpected error in DELETE /api/stories/:id:', err);
		return ApiErrors.InternalError();
	}
};
```

### Krok 8: Testowanie manualne

- [ ] Uruchomić dev server: `npm run dev`
- [ ] Zalogować się do aplikacji (uzyskać JWT token)
- [ ] Utworzyć testową historię
- [ ] Wykonać DELETE request:
  ```bash
  curl -X DELETE http://localhost:5173/api/stories/{id} \
    -H "Authorization: Bearer {token}"
  ```
- [ ] Sprawdzić odpowiedź 204
- [ ] Zweryfikować, że historia zniknęła z bazy

### Krok 9: Testowanie scenariuszy błędów

- [ ] **Test 400**: Niepoprawne UUID
  ```bash
  curl -X DELETE http://localhost:5173/api/stories/invalid-uuid \
    -H "Authorization: Bearer {token}"
  # Oczekiwane: 400 + VALIDATION_ERROR
  ```
- [ ] **Test 401**: Brak tokena
  ```bash
  curl -X DELETE http://localhost:5173/api/stories/{id}
  # Oczekiwane: 401 + AUTHENTICATION_ERROR
  ```
- [ ] **Test 404**: Nieistniejące ID
  ```bash
  curl -X DELETE http://localhost:5173/api/stories/{random-uuid} \
    -H "Authorization: Bearer {token}"
  # Oczekiwane: 404 + NOT_FOUND
  ```
- [ ] **Test RLS**: Próba usunięcia cudzej historii
  - Zalogować się jako User A
  - Utworzyć historię jako User A
  - Zalogować się jako User B
  - Próbować usunąć historię User A jako User B
  - Oczekiwane: 404 + NOT_FOUND (RLS blokuje)

### Krok 10: Implementacja testów jednostkowych (opcjonalne dla MVP)

**Lokalizacja:** `src/routes/api/stories/[id]/+server.test.ts`

- [ ] Test: Sukces usunięcia (204)
- [ ] Test: Invalid UUID (400)
- [ ] Test: Story not found (404)
- [ ] Test: Database error (500)

**Framework:** Vitest + `@testing-library/svelte`

### Krok 11: Implementacja testów E2E

**Lokalizacja:** `tests/e2e/delete-story.spec.ts`

- [ ] Test pełnego flow:
  1. Rejestracja użytkownika
  2. Utworzenie historii
  3. Usunięcie historii (z potwierdzeniem w UI)
  4. Weryfikacja, że historia zniknęła z listy

**Framework:** Playwright

**Przykładowy test:**

```typescript
test('user can delete their own story', async ({ page }) => {
	// 1. Login
	await page.goto('/login');
	await page.fill('[name="email"]', 'test@example.com');
	await page.fill('[name="password"]', 'password123');
	await page.click('button[type="submit"]');

	// 2. Navigate to story list
	await page.goto('/history');

	// 3. Click delete on first story
	await page.click('[data-testid="delete-story-btn"]:first-of-type');

	// 4. Confirm deletion
	await page.click('[data-testid="confirm-delete"]');

	// 5. Verify story is removed
	await expect(page.locator('[data-testid="story-item"]')).toHaveCount(0);
});
```

### Krok 12: Code review i merge

- [ ] Utworzyć Pull Request
- [ ] Code review przez zespół
- [ ] Sprawdzić, że wszystkie testy przechodzą
- [ ] Merge do `main` branch

### Krok 13: Deployment

- [ ] Deploy do staging environment
- [ ] Smoke testing na staging
- [ ] Deploy do production (Cloudflare Pages)
- [ ] Monitoring przez pierwsze 24h

### Krok 14: Dokumentacja

- [ ] Zaktualizować API documentation (OpenAPI spec)
- [ ] Dodać przykłady użycia do README
- [ ] Udokumentować error codes w developer docs

---

## 10. Checklist weryfikacyjny

Przed uznaniem implementacji za kompletną, zweryfikować:

### Funkcjonalność

- [ ] Endpoint zwraca 204 przy pomyślnym usunięciu
- [ ] Endpoint zwraca 400 dla niepoprawnego UUID
- [ ] Endpoint zwraca 401 dla brakującego/niepoprawnego tokena
- [ ] Endpoint zwraca 404 gdy historia nie istnieje
- [ ] Endpoint zwraca 404 gdy użytkownik próbuje usunąć cudzą historię
- [ ] Endpoint zwraca 500 przy błędzie bazy danych

### Bezpieczeństwo

- [ ] RLS policy `stories_delete_own` jest włączona
- [ ] JWT token jest weryfikowany w hooks
- [ ] UUID validation zapobiega injection attacks
- [ ] Error messages nie ujawniają wrażliwych informacji

### Wydajność

- [ ] DELETE query używa primary key index
- [ ] Response time < 150ms (p95)
- [ ] Brak N+1 query problems

### Kod

- [ ] Kod jest zgodny z ESLint rules
- [ ] Kod jest sformatowany przez Prettier
- [ ] Typy TypeScript są poprawne (brak `any`)
- [ ] Error handling jest kompletny (try-catch)

### Testy

- [ ] Testy jednostkowe przechodzą
- [ ] Testy E2E przechodzą
- [ ] Testy RLS security przechodzą

### Dokumentacja

- [ ] OpenAPI spec jest zaktualizowany
- [ ] README zawiera przykłady użycia
- [ ] Code comments wyjaśniają nieoczywiste decyzje

---

## 11. Potencjalne rozszerzenia (post-MVP)

### Deletion Audit Log

Logowanie wszystkich usunięć do osobnej tabeli:

```sql
CREATE TABLE public.story_deletions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL,
  user_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now(),
  story_data jsonb -- snapshot of deleted story
);
```

### Rate Limiting

Implementacja limitu usunięć per user:

- Redis-based rate limiting
- Np. max 10 usunięć na minutę
- Zwrócenie 429 Too Many Requests

---

## 12. Referencje

### Dokumentacja zewnętrzna:

- [SvelteKit API Routes](https://kit.svelte.dev/docs/routing#server)
- [Supabase JavaScript Client - Delete](https://supabase.com/docs/reference/javascript/delete)
- [PostgreSQL Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [HTTP Status Codes](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

### Dokumentacja wewnętrzna:

- `.ai/api-plan.md` - Pełna specyfikacja REST API
- `.ai/db-plan.md` - Schemat bazy danych i RLS policies
- `src/types.ts` - Definicje typów TypeScript
- `CLAUDE.md` - Reguły implementacji projektu
