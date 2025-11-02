# API Endpoint Implementation Plan: List Stories (GET /api/stories)

## 1. Przegląd punktu końcowego

Endpoint `GET /api/stories` odpowiada za pobranie wszystkich historii należących do zalogowanego użytkownika. Jest to główny endpoint aplikacji, używany do wyświetlenia listy historii na stronie `/`.

**Kluczowe cechy:**

- Pobiera historie z tabeli `public.stories` filtrowane przez RLS
- Sortowanie: created_at DESC (najnowsze pierwsze)
- Paginacja: limit (default 25) i offset (default 0)
- Wykorzystuje composite index dla optymalnej wydajności
- Zwraca obiekt z tablicą historii i total count

**Powiązane User Stories:**

- Epic 3, ID 3.1: "Jako użytkownik chcę zobaczyć listę wszystkich moich zapisanych historii posortowaną od najnowszej"
- Epic 3, ID 3.2: "Jako użytkownik chcę kliknąć w historię z listy, aby zobaczyć jej szczegóły"
- Epic 3, ID 3.12: "Jako użytkownik chcę wylosować losową historię z mojej kolekcji"

**Relacja z innymi endpoints:**

- **Poprzedza:** `POST /api/stories` (tworzenie historii)
- **Następuje:** `GET /api/stories/:id` (szczegóły pojedynczej historii)

---

## 2. Szczegóły żądania

### 2.1. Metoda HTTP

`GET`

### 2.2. Struktura URL

```
GET /api/stories?limit=25&offset=0
```

### 2.3. Nagłówki (Headers)

**Wymagane:**

```
Authorization: Bearer <jwt_token>
```

**Opcjonalne:**

```
Accept: application/json
```

### 2.4. Parametry

**Parametry URL:**

- Brak

**Query Parameters:**

| Parametr | Typ      | Wymagany | Default | Ograniczenia              | Opis                                          |
| -------- | -------- | -------- | ------- | ------------------------- | --------------------------------------------- |
| `limit`  | `number` | ❌ Nie   | 25      | Integer, min: 1, max: 100 | Maksymalna liczba historii do zwrócenia       |
| `offset` | `number` | ❌ Nie   | 0       | Integer, min: 0           | Liczba historii do pominięcia (dla paginacji) |

**Request Body:**

- Brak (GET request)

**Przykładowe żądania:**

```bash
# Basic request (use defaults)
GET /api/stories

# With pagination
GET /api/stories?limit=10&offset=20

# First page
GET /api/stories?limit=25&offset=0

# Second page
GET /api/stories?limit=25&offset=25
```

### 2.5. Walidacja query parameters

#### Limit Validation:

```typescript
// Reguły:
- typeof limit === 'number' (po parsowaniu)
- Number.isInteger(limit)
- limit >= 1
- limit <= 100

// Default: 25 jeśli brak parametru

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit musi być liczbą całkowitą od 1 do 100",
    "field": "limit"
  }
}
```

#### Offset Validation:

```typescript
// Reguły:
- typeof offset === 'number' (po parsowaniu)
- Number.isInteger(offset)
- offset >= 0

// Default: 0 jeśli brak parametru

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Offset musi być liczbą całkowitą większą lub równą 0",
    "field": "offset"
  }
}
```

#### Query String Parsing:

```typescript
// URL: /api/stories?limit=10&offset=5
const url = new URL(request.url);
const limitParam = url.searchParams.get('limit');
const offsetParam = url.searchParams.get('offset');

// Parse to integers
const limit = limitParam ? parseInt(limitParam, 10) : 25;
const offset = offsetParam ? parseInt(offsetParam, 10) : 0;

// Validate with Zod
const validation = ListStoriesQueryParamsSchema.safeParse({ limit, offset });
```

---

## 3. Wykorzystywane typy

### 3.1. Query Parameters Type

```typescript
// src/types.ts (istniejący typ)
export interface ListStoriesQueryParams {
	/**
	 * Maximum number of stories to return
	 * @default 25
	 */
	limit?: number;

	/**
	 * Number of stories to skip (for pagination)
	 * @default 0
	 */
	offset?: number;
}
```

### 3.2. Response DTO

```typescript
// src/types.ts (istniejący typ)
export interface ListStoriesDTO {
	/**
	 * Array of user's stories, sorted by created_at DESC
	 */
	stories: StoryDTO[];

	/**
	 * Total number of stories returned
	 * (In MVP, this equals stories.length since there's no pagination limit)
	 */
	total: number;
}
```

### 3.3. Story DTO

```typescript
// src/types.ts (istniejący typ)
export type StoryDTO = Tables<'stories'>;

// Rozwinięcie:
interface StoryDTO {
	id: string; // uuid
	user_id: string; // uuid
	subject: string; // varchar(150)
	difficulty: number; // smallint (1-3)
	darkness: number; // smallint (1-3)
	question: string; // text
	answer: string; // text
	created_at: string; // timestamptz ISO 8601
}
```

### 3.4. Error DTO

```typescript
// src/types.ts (istniejący typ)
export interface ErrorDTO {
	error: {
		code: ErrorCode;
		message: string;
		field?: string;
	};
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Content-Type:** `application/json`

**Struktura:**

```json
{
	"stories": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"user_id": "660e8400-e29b-41d4-a716-446655440001",
			"subject": "Tajemnicza latarnia morska",
			"difficulty": 2,
			"darkness": 3,
			"question": "Na szczycie latarni morskiej znaleziono martwego latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Co się stało?",
			"answer": "Latarnik zginął od uderzenia dużym soplem, który stopniał po upadku z sufitu. Morderca umieścił go tam zimą, wiedząc, że w końcu się stopi, a jako dowód zostanie jedynie woda.",
			"created_at": "2025-01-26T10:30:00.000Z"
		},
		{
			"id": "660e8400-e29b-41d4-a716-446655440002",
			"user_id": "660e8400-e29b-41d4-a716-446655440001",
			"subject": "Znikający autostopowicz",
			"difficulty": 1,
			"darkness": 2,
			"question": "Kierowca zabiera autostopowicza w deszczową noc. Po dotarciu do miejsca przeznaczenia odkrywa, że pasażer zniknął, a na siedzeniu została tylko mokra kałuża.",
			"answer": "Autostopowicz był duchem zmarłego wiele lat temu w wypadku na tej samej trasie. Historia powtarza się co roku w rocznicę jego śmierci.",
			"created_at": "2025-01-25T15:20:00.000Z"
		}
	],
	"total": 2
}
```

**Charakterystyka odpowiedzi:**

- `stories`: Tablica obiektów StoryDTO, posortowana po `created_at DESC`
- `total`: Liczba zwróconych historii (w MVP = stories.length)
- Jeśli user nie ma historii: `{ stories: [], total: 0 }`

**HTTP Headers:**

```
HTTP/1.1 200 OK
Content-Type: application/json
```

### 4.2. Sukces - Pusta lista (200 OK)

```json
{
	"stories": [],
	"total": 0
}
```

**Przypadki:**

- Nowy użytkownik bez żadnych historii
- offset > total stories (paginacja poza zakresem)

### 4.3. Błędy (4xx, 5xx)

#### 400 Bad Request - Błąd walidacji query params

**Invalid limit (< 1):**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Limit musi być liczbą całkowitą od 1 do 100",
		"field": "limit"
	}
}
```

**Invalid limit (> 100):**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Limit musi być liczbą całkowitą od 1 do 100",
		"field": "limit"
	}
}
```

**Invalid offset (negative):**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Offset musi być liczbą całkowitą większą lub równą 0",
		"field": "offset"
	}
}
```

**Non-integer limit:**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Limit musi być liczbą całkowitą",
		"field": "limit"
	}
}
```

#### 401 Unauthorized - Brak autoryzacji

```json
{
	"error": {
		"code": "AUTHENTICATION_ERROR",
		"message": "Brakujący lub nieprawidłowy token uwierzytelniający"
	}
}
```

**Przyczyny:**

- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu JWT
- Token wygasł
- Token został unieważniony (logout)

#### 500 Internal Server Error - Błąd bazy danych

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Nie udało się pobrać historii. Spróbuj ponownie później"
	}
}
```

**Przyczyny:**

- SELECT query failed (database error)
- RLS policy error (nie powinno się zdarzyć)
- Database connection timeout
- Connection pool exhausted
- Nieoczekiwany błąd serwera

---

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. GET /api/stories?limit=25&offset=0
       │    Authorization: Bearer <token>
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │
│  src/routes/api/stories/+server.ts       │
└──────┬───────────────────────────────────┘
       │ 2. Authenticate user
       ▼
┌──────────────────────┐
│  Supabase Auth       │ ◄──── JWT token verification
│  (locals.supabase)   │
└──────┬───────────────┘
       │ 3. User authenticated
       ▼
┌──────────────────────┐
│  Parse & Validate    │ ◄──── Extract limit/offset from query params
│  Query Params        │       Validate with Zod
└──────┬───────────────┘
       │ 4. Params valid (limit=25, offset=0)
       ▼
┌──────────────────────────────────────────┐
│  Supabase Database                       │
│  SELECT * FROM public.stories            │
│  WHERE user_id = auth.uid()              │
│  ORDER BY created_at DESC                │
│  LIMIT 25 OFFSET 0                       │
└──────┬───────────────────────────────────┘
       │ 5. RLS Check: stories_select_own
       ▼
┌──────────────────────┐
│  RLS Policy          │
│  stories_select_own  │ ◄──── Enforce WHERE auth.uid() = user_id
└──────┬───────────────┘
       │ 6. RLS passed
       ▼
┌──────────────────────┐
│  PostgreSQL          │ ◄──── Execute SELECT with index scan
│  Index:              │       idx_stories_user_created
│  (user_id, created_at│       (user_id, created_at DESC)
│   DESC)              │
└──────┬───────────────┘
       │ 7. Return rows (array of stories)
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │ ◄──── Format as ListStoriesDTO
│                                          │       { stories: [...], total: X }
└──────┬───────────────────────────────────┘
       │ 8. 200 OK + ListStoriesDTO
       ▼
┌─────────────┐
│   Client    │ ◄──── Display list of stories
│             │       Render in UI
└─────────────┘
```

### 5.2. Szczegółowy opis kroków

#### Krok 1: Client Request

- Frontend wysyła GET request z opcjonalnymi query params
- Typowo wywoływane przy ładowaniu strony `/history`
- Dołącza JWT token w nagłówku `Authorization`

#### Krok 2-3: Authentication

- SvelteKit middleware (`src/hooks.server.ts`) weryfikuje JWT
- Supabase Auth waliduje token i zwraca user
- Jeśli token nieprawidłowy → 401 Unauthorized

#### Krok 4: Query Params Validation

- Parse `limit` i `offset` z query string
- Konwertuj na integers
- Waliduj z Zod schema:
  - limit: 1-100, default 25
  - offset: >= 0, default 0
- Jeśli walidacja niepoprawna → 400 Bad Request

#### Krok 5-6: Row Level Security Check

- PostgreSQL wykonuje RLS policy `stories_select_own`
- Sprawdza czy `auth.uid() = user_id` (automatyczne filtrowanie)
- **WAŻNE:** RLS zapewnia że user widzi TYLKO swoje historie
- Jeśli RLS blokuje → empty result (nie error)

#### Krok 7: Database SELECT

- PostgreSQL wykonuje:
  ```sql
  SELECT * FROM public.stories
  WHERE user_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT 25 OFFSET 0;
  ```
- Wykorzystuje composite index `idx_stories_user_created`
- Index scan zamiast sequential scan (optymalizacja)
- Zwraca tablicę wierszy

#### Krok 8: Client Response

- API route formatuje odpowiedź jako `ListStoriesDTO`
- `total` = `stories.length` (w MVP nie liczymy total count osobno)
- Zwraca 200 OK z danymi
- Frontend renderuje listę

### 5.3. Interakcje z bazą danych

#### SQL Query (wykonywane przez Supabase SDK)

```sql
-- Supabase SDK generuje zapytanie:
SELECT *
FROM public.stories
WHERE user_id = auth.uid()  -- RLS automatycznie dodaje ten warunek
ORDER BY created_at DESC
LIMIT 25
OFFSET 0;
```

**Index Utilization:**

```sql
-- PostgreSQL używa index:
-- idx_stories_user_created ON (user_id, created_at DESC)

-- EXPLAIN ANALYZE pokazuje:
-- Index Scan using idx_stories_user_created on stories
--   Index Cond: (user_id = auth.uid())
--   Rows: 10  Cost: 0.15..8.17
```

**Performance:**

- Index scan: O(log n + k) gdzie k = limit
- Sequential scan: O(n) - UNIKAMY tego przez index
- Typowy czas: <50ms dla 1000 stories

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

**Mechanizm:**

- JWT Bearer token verification przez Supabase Auth
- Token przechowywany w localStorage lub HTTPOnly cookies
- Token wysyłany w każdym request jako `Authorization: Bearer <token>`

**Implementacja:**

```typescript
// src/hooks.server.ts (wspólny dla wszystkich endpoints)
export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			get: (key) => event.cookies.get(key),
			set: (key, value, options) => event.cookies.set(key, value, options),
			remove: (key, options) => event.cookies.delete(key, options)
		}
	});

	const {
		data: { session }
	} = await event.locals.supabase.auth.getSession();
	event.locals.user = session?.user ?? null;

	return resolve(event);
};
```

**Zagrożenia:**

- Token theft (XSS attacks)
- Token reuse after logout
- Expired token handling

**Mitigation:**

- HTTPOnly cookies (rozważyć w produkcji)
- Token invalidation on logout
- Auto-refresh mechanism via Supabase SDK
- HTTPS only (wymuszony w produkcji)

### 6.2. Autoryzacja (Authorization)

**Mechanizm: Row Level Security (RLS)**

Polityka `stories_select_own`:

```sql
CREATE POLICY stories_select_own
ON public.stories
FOR SELECT
USING (auth.uid() = user_id);
```

**Jak to działa:**

1. PostgreSQL automatycznie dodaje warunek `WHERE auth.uid() = user_id`
2. Użytkownik może zobaczyć TYLKO swoje historie
3. Nawet jeśli aplikacja ma bug, RLS blokuje dostęp

**Security Guarantee:**

- Zero Trust: Baza danych jest ostatecznym arbitrem
- Niemożliwe jest obejście RLS z poziomu aplikacji
- Automatic filtering (nie musimy ręcznie dodawać WHERE user_id)

**Implementacja w Supabase SDK:**

```typescript
// Supabase automatycznie stosuje RLS
const { data, error } = await locals.supabase
	.from('stories')
	.select('*')
	.order('created_at', { ascending: false })
	.limit(limit)
	.offset(offset);

// PostgreSQL automatycznie filtruje WHERE user_id = auth.uid()
```

### 6.3. Walidacja Query Parameters

#### SQL Injection Prevention

**Zagrożenie:**

```
GET /api/stories?limit=10; DROP TABLE stories; --
```

**Mitigation:**

- Query params są parsowane jako integers (type safe)
- Supabase SDK używa **parameterized queries**
- Walidacja z Zod przed użyciem w query
- PostgreSQL type safety (integer, non-negative)

**Nie ma ryzyka SQL injection** bo:

1. limit/offset są konwertowane na integers
2. Supabase SDK nie konkatenuje stringów
3. Zod waliduje przed użyciem

#### Excessive Data Retrieval (DoS)

**Zagrożenie:**
Użytkownik może próbować pobrać ogromną liczbę rekordów:

```
GET /api/stories?limit=999999
```

**Mitigation:**

- Limit max 100 (enforced w validation)
- Jeśli user poda limit > 100 → 400 Bad Request
- Default 25 (rozsądna wartość)

**Future enhancement:**

- Rate limiting (max 100 requests/minute per user)
- Monitor queries > 100 rows

#### Negative Offset Attack

**Zagrożenie:**

```
GET /api/stories?offset=-1
```

**Mitigation:**

- Validation: offset >= 0
- Jeśli negative → 400 Bad Request

### 6.4. Data Leakage Prevention

**RLS zapewnia:**

- User widzi TYLKO swoje historie
- Brak możliwości odczytania user_id innych użytkowników
- Nawet jeśli bug w aplikacji, RLS blokuje

**Test Case:**

```sql
-- User A (id: user-a-uuid) próbuje zobaczyć historie User B
-- RLS automatycznie blokuje:

SELECT * FROM stories WHERE user_id = 'user-b-uuid';
-- Result: 0 rows (RLS blocked)

SELECT * FROM stories;
-- Result: Only stories where user_id = 'user-a-uuid'
```

### 6.5. CORS Configuration

**Dozwolone Origins:**

```typescript
// svelte.config.js lub Cloudflare Pages config
const allowedOrigins = [
	'https://mrocznehistorie.pl',
	'https://www.mrocznehistorie.pl',
	// Development
	process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null
].filter(Boolean);
```

**Headers:**

```
Access-Control-Allow-Origin: <allowed_origin>
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Authorization, Accept
Access-Control-Allow-Credentials: true
```

**CSRF Protection:**

```typescript
// svelte.config.js
export default {
	kit: {
		csrf: {
			checkOrigin: true // Enforce origin header matching
		}
	}
};
```

---

## 7. Obsługa błędów

### 7.1. Tabela błędów

| Error Code             | HTTP Status | Opis                 | User Message (PL)                                         | Retry Safe?          | Frontend Action                |
| ---------------------- | ----------- | -------------------- | --------------------------------------------------------- | -------------------- | ------------------------------ |
| N/A                    | 200         | Success (empty list) | N/A                                                       | N/A                  | Show "Brak historii" message   |
| N/A                    | 200         | Success (with data)  | N/A                                                       | N/A                  | Render list of stories         |
| `VALIDATION_ERROR`     | 400         | Invalid query params | "Limit musi być liczbą całkowitą od 1 do 100"             | ✅ Tak (po poprawie) | Show error, reset to defaults  |
| `AUTHENTICATION_ERROR` | 401         | No/invalid token     | "Brakujący lub nieprawidłowy token uwierzytelniający"     | ❌ Nie (wyloguj)     | Redirect to /login             |
| `INTERNAL_ERROR`       | 500         | Database error       | "Nie udało się pobrać historii. Spróbuj ponownie później" | ✅ Tak               | Show error toast, enable retry |

### 7.2. Szczegółowa obsługa błędów

#### 7.2.1. VALIDATION_ERROR (400)

**Scenariusze:**

**Invalid limit (< 1):**

```typescript
// URL: /api/stories?limit=0
// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit musi być liczbą całkowitą od 1 do 100",
    "field": "limit"
  }
}
```

**Invalid limit (> 100):**

```typescript
// URL: /api/stories?limit=1000
// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit musi być liczbą całkowitą od 1 do 100",
    "field": "limit"
  }
}
```

**Invalid offset (negative):**

```typescript
// URL: /api/stories?offset=-5
// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Offset musi być liczbą całkowitą większą lub równą 0",
    "field": "offset"
  }
}
```

**Non-integer limit:**

```typescript
// URL: /api/stories?limit=abc
// Parse fails → NaN
// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Limit musi być liczbą całkowitą",
    "field": "limit"
  }
}
```

**Non-integer offset:**

```typescript
// URL: /api/stories?offset=1.5
// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Offset musi być liczbą całkowitą",
    "field": "offset"
  }
}
```

**Frontend Action:**

- Pokaż error message
- Reset query params do defaults (limit=25, offset=0)
- Retry z poprawnymi wartościami

#### 7.2.2. AUTHENTICATION_ERROR (401)

**Scenariusze:**

- Brak nagłówka `Authorization`
- Token w złym formacie
- Token wygasł
- Token nieprawidłowy (manipulowany)
- Użytkownik został wylogowany

**Response:**

```json
{
	"error": {
		"code": "AUTHENTICATION_ERROR",
		"message": "Brakujący lub nieprawidłowy token uwierzytelniający"
	}
}
```

**Frontend Action:**

- Przekieruj na stronę logowania (`/login`)
- Wyczyść localStorage (usuń token)
- Pokaż toast: "Sesja wygasła. Zaloguj się ponownie"
- Zapisz intent (redirect back to /history po zalogowaniu)

#### 7.2.3. INTERNAL_ERROR (500)

**Scenariusze:**

**Database SELECT Error:**

```typescript
const { data, error } = await locals.supabase
	.from('stories')
	.select('*')
	.order('created_at', { ascending: false })
	.limit(limit)
	.offset(offset);

if (error) {
	console.error('[DB_ERROR] SELECT failed', {
		code: error.code,
		message: error.message,
		details: error.details,
		userId: locals.user.id,
		timestamp: new Date().toISOString()
	});

	throw new InternalError('Database SELECT failed');
}
```

**Connection Timeout:**

```typescript
// Database query takes too long (>5s)
if (error.code === '57014') {
	// query_canceled
	console.error('[TIMEOUT] Database query timeout', {
		userId: locals.user.id,
		limit,
		offset,
		error: error
	});

	throw new InternalError('Database timeout');
}
```

**Connection Pool Exhausted:**

```typescript
// All connections in use (very rare with Supabase)
if (error.message.includes('connection pool')) {
	console.error('[POOL_ERROR] Connection pool exhausted', {
		error: error
	});

	throw new InternalError('Database connection pool exhausted');
}
```

**Response:**

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Nie udało się pobrać historii. Spróbuj ponownie później"
	}
}
```

**Frontend Action:**

- Pokaż error toast z generic message
- Włącz przycisk "Odśwież"
- Nie auto-retry (czekaj na user action)
- Opcjonalnie: Retry raz po 2s

**Logging:**

```typescript
console.error('[API_ERROR] GET /api/stories', {
	error: error.message,
	stack: error.stack,
	userId: locals.user.id,
	queryParams: { limit, offset },
	timestamp: new Date().toISOString()
});
```

### 7.3. Empty List Handling (200 OK)

**Nie jest błędem**, ale wymaga specjalnej obsługi:

```json
{
	"stories": [],
	"total": 0
}
```

**Przypadki:**

1. **Nowy użytkownik**: Jeszcze nie utworzył żadnych historii
2. **Offset poza zakresem**: offset > total stories

**Frontend Action:**

- Sprawdź `stories.length === 0`
- Pokaż komunikat:
  - "Nie masz jeszcze żadnych historii. Stwórz swoją pierwszą!"
  - Przycisk: "Stwórz historię" → redirect do `/create`
- Ukryj przycisk "Losowa historia" (disabled)

### 7.4. Error Handling Flow Diagram

```
┌─────────────────┐
│  API Request    │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Auth Check │
    └────┬───┬───┘
         │   │
    OK   │   │ FAIL
         │   └──────► 401 AUTHENTICATION_ERROR
         ▼
    ┌──────────────┐
    │ Parse Query  │
    │ Params       │
    └────┬─────────┘
         │
         ▼
    ┌──────────────┐
    │ Validate     │
    │ limit/offset │
    └────┬────┬────┘
         │    │
    OK   │    │ FAIL (invalid limit/offset)
         │    └─────► 400 VALIDATION_ERROR
         ▼
    ┌──────────────┐
    │ SELECT       │
    │ From DB      │
    └────┬────┬────┐
         │    │    │
    OK   │    │    │
         │    │  Timeout
         │  Error  │
         │    │    │
         │    ▼    ▼
         │   500  500
         │   INTERNAL_ERROR
         ▼
    ┌──────────────┐
    │ Check Result │
    └────┬────┬────┘
         │    │
    Empty│    │ Has Data
         │    │
         ▼    ▼
    ┌──────────────┐
    │ Return 200   │
    │ + { stories: │
    │   [], total:0│
    │   }          │
    └──────────────┘
         OR
    ┌──────────────┐
    │ Return 200   │
    │ + { stories: │
    │   [...],     │
    │   total: X } │
    └──────────────┘
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła (Bottlenecks)

#### 8.1.1. Database Query Performance

**Problem:**

- SELECT może być wolne dla użytkowników z tysiącami historii
- Sequential scan zamiast index scan (jeśli brak index)
- Sortowanie po created_at może być kosztowne

**Wpływ:**

- ~10-200ms response time (zależy od liczby rekordów)
- Potencjalny bottleneck przy >10,000 stories per user

**Mitigation (MVP):**

- Composite index `idx_stories_user_created` na `(user_id, created_at DESC)`
- PostgreSQL używa Index Scan (nie Sequential Scan)
- Limit 25 (default) ogranicza rows returned

**Current Performance:**

```sql
-- With index:
EXPLAIN ANALYZE SELECT * FROM stories
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;

-- Result:
-- Index Scan using idx_stories_user_created
-- Planning Time: 0.1 ms
-- Execution Time: 2.5 ms  (for 1000 stories)
```

**Future optimization:**

- Covering index (include question/answer in index) - NOT recommended (too large)
- Partial index (only recent stories) - IF old stories rarely accessed
- Materialized view for "recent stories" - IF queries become slow

#### 8.1.2. RLS Policy Evaluation

**Problem:**

- PostgreSQL musi sprawdzić `auth.uid() = user_id` dla każdego wiersza
- JWT parsing przy każdym request

**Wpływ:**

- +5-20ms latency per request

**Mitigation:**

- RLS policy jest bardzo prosta (single equality check)
- PostgreSQL cache'uje execution plan
- Index na `user_id` pomaga filtrować szybko

**Future optimization:**

- Server-side session caching (Redis) - NOT needed in MVP
- JWT verification cache (5 min TTL) - IF auth becomes bottleneck

#### 8.1.3. Response Serialization

**Problem:**

- Serializacja dużych payloadów (jeśli question/answer są długie)
- JSON.stringify() blokuje event loop

**Wpływ:**

- Minimalny w MVP (25 stories \* ~2KB = ~50KB)
- Potencjalny problem jeśli limit=100 i question/answer > 10KB each

**Mitigation:**

- Limit 100 (max) ogranicza payload size
- gzip compression (automatic w Cloudflare Pages) redukuje ~70%

**Future optimization:**

- Streaming JSON serialization (dla bardzo dużych payloadów)
- Lazy loading (tylko id/subject w liście, full content on click)

#### 8.1.4. Pagination Performance

**Problem:**

- Offset-based pagination może być wolne dla dużych offsetów
- PostgreSQL musi "skip" offset rows (nie może bezpośrednio jump)

**Wpływ:**

- offset=0: ~5ms
- offset=1000: ~50ms
- offset=10000: ~500ms

**Mitigation (MVP):**

- Użytkownicy rzadko scrollują do offset > 100
- Default limit=25 (rozsądny)

**Future optimization (Cursor-based pagination):**

```typescript
// Instead of offset, use cursor (last created_at)
GET /api/stories?limit=25&cursor=2025-01-20T10:00:00Z

// SQL:
SELECT * FROM stories
WHERE user_id = auth.uid()
  AND created_at < '2025-01-20T10:00:00Z'
ORDER BY created_at DESC
LIMIT 25;

// Advantage: O(log n) instead of O(n + offset)
```

### 8.2. Strategie optymalizacji

#### 8.2.1. Database Optimization

**Index Strategy:**

```sql
-- Primary index (already exists)
CREATE INDEX idx_stories_user_created
ON public.stories (user_id, created_at DESC);

-- This index is perfect for our query:
-- 1. Filters by user_id (first column)
-- 2. Sorts by created_at DESC (second column)
-- 3. PostgreSQL can use Index-Only Scan
```

**Query Optimization:**

```typescript
// Use .select() to specify exact columns (if needed)
// Currently we need all columns (*)
const { data, error } = await locals.supabase
  .from('stories')
  .select('*')  // Could optimize to select only displayed fields
  .order('created_at', { ascending: false })
  .limit(limit)
  .offset(offset);

// Future: If list only shows id/subject/created_at:
.select('id, subject, created_at, difficulty, darkness')
// Reduces payload size by ~80% (no question/answer)
```

**Connection Pooling:**

```typescript
// Supabase automatycznie używa PgBouncer
// Transaction mode (optimal dla krótkich queries)
// Pool size: 15 connections (default)
// No action needed in MVP
```

#### 8.2.2. Caching Strategy (Future)

**Client-Side Caching:**

```typescript
// SvelteKit stores
import { writable } from 'svelte/store';

export const storiesStore = writable<StoryDTO[]>([]);
export const storiesCache = writable<{
	stories: StoryDTO[];
	total: number;
	fetchedAt: number;
}>({
	stories: [],
	total: 0,
	fetchedAt: 0
});

// On fetch:
const cache = get(storiesCache);
const now = Date.now();

// Use cache if fresh (<5 minutes)
if (now - cache.fetchedAt < 5 * 60 * 1000) {
	return cache;
}

// Otherwise fetch fresh data
const response = await fetch('/api/stories');
const data = await response.json();

storiesCache.set({
	stories: data.stories,
	total: data.total,
	fetchedAt: now
});
```

**Server-Side Caching (Future - NOT in MVP):**

```typescript
// Redis cache
import { redis } from '$lib/redis';

const cacheKey = `stories:${userId}:${limit}:${offset}`;
const cached = await redis.get(cacheKey);

if (cached) {
	return JSON.parse(cached);
}

const data = await fetchFromDB();

// Cache for 5 minutes
await redis.setex(cacheKey, 300, JSON.stringify(data));

return data;
```

**Cache Invalidation:**

```typescript
// After POST /api/stories (create)
// Invalidate cache for this user
await redis.del(`stories:${userId}:*`);

// Or: Update cache optimistically
const newStory = await createStory();
storiesStore.update((stories) => [newStory, ...stories]);
```

#### 8.2.3. Response Optimization

**Compression:**

```typescript
// Cloudflare Pages automatically enables gzip/brotli
// No configuration needed

// Before compression: ~50KB (25 stories)
// After gzip: ~15KB (~70% reduction)
```

**Lazy Loading (Future):**

```typescript
// List endpoint returns only metadata
GET /api/stories → { id, subject, created_at, difficulty, darkness }

// Full content loaded on demand
GET /api/stories/:id → { id, subject, question, answer, ... }

// Advantage: 80% smaller payload for list
// Disadvantage: Extra request for each story detail
```

### 8.3. Performance Targets

| Metric                    | Target (MVP) | Target (Post-MVP)       |
| ------------------------- | ------------ | ----------------------- |
| API Response Time (p50)   | < 100ms      | < 50ms                  |
| API Response Time (p95)   | < 200ms      | < 150ms                 |
| API Response Time (p99)   | < 300ms      | < 250ms                 |
| Database Query Time       | < 50ms       | < 20ms                  |
| RLS Evaluation Time       | < 10ms       | < 5ms                   |
| JSON Serialization Time   | < 20ms       | < 10ms                  |
| Payload Size (25 stories) | < 100KB      | < 50KB (with lazy load) |
| Throughput (requests/sec) | 100          | 500                     |

### 8.4. Load Testing Plan

**Scenarios:**

1. **Baseline:** 10 concurrent users, 1 list fetch per minute
2. **Normal Load:** 50 concurrent users, 5 fetches per minute each
3. **Peak Load:** 100 concurrent users, 10 fetches per minute each
4. **Pagination Test:** Users scrolling through pages (offset 0, 25, 50, 100, ...)

**Tools:**

- k6 for load testing
- Grafana for monitoring
- Supabase Dashboard for database metrics

**Metrics to Monitor:**

- Response time distribution (p50, p95, p99)
- Error rate by status code
- Database query duration
- Index usage (ensure idx_stories_user_created is used)
- Connection pool utilization

**Sample k6 Script:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{ duration: '2m', target: 10 }, // Ramp-up
		{ duration: '5m', target: 50 }, // Normal load
		{ duration: '2m', target: 100 }, // Peak load
		{ duration: '5m', target: 0 } // Ramp-down
	]
};

export default function () {
	const token = __ENV.AUTH_TOKEN;

	const params = {
		headers: {
			Authorization: `Bearer ${token}`
		}
	};

	// Test different pagination scenarios
	const offsets = [0, 25, 50, 100];
	const offset = offsets[Math.floor(Math.random() * offsets.length)];

	const res = http.get(`https://mrocznehistorie.pl/api/stories?limit=25&offset=${offset}`, params);

	check(res, {
		'status is 200': (r) => r.status === 200,
		'response time < 200ms': (r) => r.timings.duration < 200,
		'has stories array': (r) => JSON.parse(r.body).stories !== undefined,
		'has total field': (r) => JSON.parse(r.body).total !== undefined
	});

	sleep(1);
}
```

---

## 9. Etapy wdrożenia

### Krok 1: Walidacja query parameters

**Utworzyć schema Zod dla query params:**

Plik: `src/lib/validation/story.validation.ts`

```typescript
// Już powinno istnieć GenerateStorySchema i CreateStorySchema
// Dodaj nowy schema:

import { z } from 'zod';

export const ListStoriesQueryParamsSchema = z.object({
	limit: z
		.number()
		.int('Limit musi być liczbą całkowitą')
		.min(1, 'Limit musi być większy lub równy 1')
		.max(100, 'Limit musi być mniejszy lub równy 100')
		.default(25),

	offset: z
		.number()
		.int('Offset musi być liczbą całkowitą')
		.min(0, 'Offset musi być większy lub równy 0')
		.default(0)
});

export type ValidatedListStoriesQueryParams = z.infer<typeof ListStoriesQueryParamsSchema>;
```

**Deliverable:**

- ✅ `ListStoriesQueryParamsSchema` dodany
- ✅ Default values (limit=25, offset=0)
- ✅ Validation constraints

---

### Krok 2: Utworzenie SvelteKit API Route (GET handler)

**WAŻNE:** Plik już może istnieć jeśli POST handler został wcześniej zaimplementowany.

**Edytować lub utworzyć:** `src/routes/api/stories/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ListStoriesQueryParamsSchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import type { ErrorDTO, ListStoriesDTO } from '$lib/types';

export const GET: RequestHandler = async ({ request, locals, url }) => {
	// 1. Authentication check (handled by hooks.server.ts)
	if (!locals.user) {
		return json<ErrorDTO>(
			{
				error: {
					code: 'AUTHENTICATION_ERROR',
					message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
				}
			},
			{ status: 401 }
		);
	}

	// 2. Parse query parameters
	const limitParam = url.searchParams.get('limit');
	const offsetParam = url.searchParams.get('offset');

	// Convert to integers (or use defaults)
	const limitRaw = limitParam ? parseInt(limitParam, 10) : 25;
	const offsetRaw = offsetParam ? parseInt(offsetParam, 10) : 0;

	// 3. Validate query params
	const validation = ListStoriesQueryParamsSchema.safeParse({
		limit: limitRaw,
		offset: offsetRaw
	});

	if (!validation.success) {
		return json<ErrorDTO>(formatValidationError(validation.error), { status: 400 });
	}

	const { limit, offset } = validation.data;

	// 4. Fetch stories from database
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.select('*')
			.order('created_at', { ascending: false })
			.limit(limit)
			.range(offset, offset + limit - 1); // Supabase uses range instead of offset

		if (error) {
			console.error('[DB_ERROR] SELECT failed', {
				code: error.code,
				message: error.message,
				details: error.details,
				userId: locals.user.id,
				queryParams: { limit, offset },
				timestamp: new Date().toISOString()
			});

			return json<ErrorDTO>(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się pobrać historii. Spróbuj ponownie później'
					}
				},
				{ status: 500 }
			);
		}

		// 5. Return success response
		const response: ListStoriesDTO = {
			stories: data || [],
			total: (data || []).length
		};

		return json(response, { status: 200 });
	} catch (error: any) {
		// 6. Handle unexpected errors
		console.error('[API_ERROR] GET /api/stories', {
			error: error.message,
			stack: error.stack,
			userId: locals.user.id,
			queryParams: { limit, offset },
			timestamp: new Date().toISOString()
		});

		return json<ErrorDTO>(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się pobrać historii. Spróbuj ponownie później'
				}
			},
			{ status: 500 }
		);
	}
};

// POST handler (if exists from previous implementation)
export const POST: RequestHandler = async ({ request, locals }) => {
	// ... existing POST implementation
};
```

**Uwaga o `.range()` vs `.limit().offset()`:**

Supabase SDK używa `.range(from, to)` zamiast `.limit().offset()`:

```typescript
// PostgreSQL LIMIT 25 OFFSET 0
.range(0, 24)  // Returns rows 0-24 (25 rows)

// PostgreSQL LIMIT 25 OFFSET 25
.range(25, 49)  // Returns rows 25-49 (25 rows)

// Calculation:
const from = offset;
const to = offset + limit - 1;
.range(from, to)
```

**Deliverable:**

- ✅ GET handler fully implemented
- ✅ Query params parsed and validated
- ✅ All error scenarios handled
- ✅ Logging for debugging

---

### Krok 3: Testowanie manualne

**3.1. Happy Path Tests**

```bash
# Get auth token first
TOKEN="eyJ..."

# Basic request (defaults: limit=25, offset=0)
curl -X GET https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { stories: [...], total: X }

# With explicit pagination
curl -X GET "https://localhost:5173/api/stories?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with max 10 stories

# Second page
curl -X GET "https://localhost:5173/api/stories?limit=10&offset=10" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK with next 10 stories
```

**3.2. Validation Error Tests**

```bash
# Invalid limit (< 1)
curl -X GET "https://localhost:5173/api/stories?limit=0" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
# Error: "Limit musi być większy lub równy 1"

# Invalid limit (> 100)
curl -X GET "https://localhost:5173/api/stories?limit=1000" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
# Error: "Limit musi być mniejszy lub równy 100"

# Invalid offset (negative)
curl -X GET "https://localhost:5173/api/stories?offset=-5" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
# Error: "Offset musi być większy lub równy 0"

# Non-integer limit
curl -X GET "https://localhost:5173/api/stories?limit=abc" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
# Error: "Limit musi być liczbą całkowitą"

# Non-integer offset
curl -X GET "https://localhost:5173/api/stories?offset=1.5" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
```

**3.3. Authentication Error Tests**

```bash
# No token
curl -X GET https://localhost:5173/api/stories

# Expected: 401 Unauthorized

# Invalid token
curl -X GET https://localhost:5173/api/stories \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized
```

**3.4. Empty List Test**

```bash
# New user with no stories
curl -X GET https://localhost:5173/api/stories \
  -H "Authorization: Bearer $NEW_USER_TOKEN"

# Expected: 200 OK
# Response: { stories: [], total: 0 }
```

**3.5. Pagination Beyond Range Test**

```bash
# Assuming user has only 5 stories
curl -X GET "https://localhost:5173/api/stories?limit=25&offset=100" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { stories: [], total: 0 }
```

**Deliverable:**

- ✅ All happy path tests passing
- ✅ All validation tests returning correct errors
- ✅ All auth tests returning 401
- ✅ Empty list handled correctly
- ✅ Pagination beyond range handled

---

### Krok 4: Testowanie RLS (Row Level Security)

**4.1. Verify RLS Policy**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'stories';

-- Should return: rowsecurity = true

-- Check SELECT policy
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stories' AND cmd = 'SELECT';

-- Should return: stories_select_own with USING (auth.uid() = user_id)
```

**4.2. Test RLS Enforcement**

Utwórz dwóch testowych użytkowników i sprawdź izolację:

```bash
# User A creates stories
TOKEN_A="user_a_token"
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"subject": "User A Story", "difficulty": 1, "darkness": 1, "question": "Q", "answer": "A"}'

# User B tries to list all stories
TOKEN_B="user_b_token"
curl -X GET https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN_B"

# Expected: 200 OK
# Response: { stories: [], total: 0 }
# (User B should NOT see User A's stories)

# User A lists stories
curl -X GET https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN_A"

# Expected: 200 OK
# Response: { stories: [{...}], total: 1 }
# (User A sees only their own story)
```

**Deliverable:**

- ✅ RLS enabled on `public.stories`
- ✅ `stories_select_own` policy active
- ✅ User A cannot see User B's stories
- ✅ User B cannot see User A's stories

---

### Krok 5: Weryfikacja index usage

**Sprawdź czy PostgreSQL używa indeksu:**

```sql
-- Check index exists
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'stories' AND indexname = 'idx_stories_user_created';

-- Should return:
-- idx_stories_user_created | CREATE INDEX idx_stories_user_created ON public.stories USING btree (user_id, created_at DESC)

-- EXPLAIN ANALYZE query
EXPLAIN ANALYZE
SELECT * FROM public.stories
WHERE user_id = '<test-user-uuid>'
ORDER BY created_at DESC
LIMIT 25 OFFSET 0;

-- Expected output should include:
-- Index Scan using idx_stories_user_created on stories
-- (NOT Seq Scan - that would be slow!)
```

**Deliverable:**

- ✅ Index exists
- ✅ PostgreSQL uses Index Scan (not Seq Scan)
- ✅ Query execution time < 50ms

---

### Krok 6: Frontend Integration

**6.1. Create API Client Function**

Utworzyć lub edytować: `src/lib/api/stories.ts`

```typescript
import type { ListStoriesDTO, ListStoriesQueryParams, ErrorDTO } from '$lib/types';

export async function listStories(
	params: ListStoriesQueryParams = {},
	token: string
): Promise<ListStoriesDTO> {
	const { limit = 25, offset = 0 } = params;

	const queryParams = new URLSearchParams();
	if (limit !== 25) queryParams.set('limit', limit.toString());
	if (offset !== 0) queryParams.set('offset', offset.toString());

	const url = `/api/stories${queryParams.toString() ? `?${queryParams}` : ''}`;

	const response = await fetch(url, {
		method: 'GET',
		headers: {
			Authorization: `Bearer ${token}`
		}
	});

	if (!response.ok) {
		const error: ErrorDTO = await response.json();
		throw new Error(error.error.message);
	}

	return response.json();
}
```

**6.2. Use in Svelte Page**

Utworzyć: `src/routes/history/+page.svelte`

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { listStories } from '$lib/api/stories';
	import { getSupabase } from '$lib/supabase';
	import type { StoryDTO } from '$lib/types';

	let stories: StoryDTO[] = [];
	let total = 0;
	let loading = false;
	let error = '';

	async function loadStories() {
		loading = true;
		error = '';

		try {
			const supabase = getSupabase();
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session) {
				throw new Error('Not authenticated');
			}

			const data = await listStories({ limit: 25, offset: 0 }, session.access_token);
			stories = data.stories;
			total = data.total;
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(loadStories);
</script>

<div class="container">
	<h1>Moje Historie</h1>

	{#if loading}
		<p>Ładowanie...</p>
	{:else if error}
		<p class="error">{error}</p>
		<button on:click={loadStories}>Spróbuj ponownie</button>
	{:else if stories.length === 0}
		<p>Nie masz jeszcze żadnych historii.</p>
		<a href="/create">Stwórz swoją pierwszą historię</a>
	{:else}
		<div class="stories-list">
			{#each stories as story}
				<div class="story-card">
					<h3>{story.subject}</h3>
					<p>Trudność: {story.difficulty} | Mroczność: {story.darkness}</p>
					<p class="date">{new Date(story.created_at).toLocaleDateString('pl-PL')}</p>
					<a href="/history/{story.id}">Zobacz szczegóły</a>
				</div>
			{/each}
		</div>

		<p class="total">Łącznie: {total} historii</p>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.stories-list {
		display: grid;
		gap: 1rem;
		margin-top: 2rem;
	}

	.story-card {
		border: 1px solid #ccc;
		border-radius: 8px;
		padding: 1rem;
	}

	.error {
		color: red;
	}

	.total {
		margin-top: 2rem;
		text-align: center;
		color: #666;
	}
</style>
```

**Deliverable:**

- ✅ API client function created
- ✅ Page component integrated
- ✅ Error handling implemented
- ✅ Loading states
- ✅ Empty state handled

---

### Krok 7: E2E Testing (Playwright)

**Utworzyć:** `tests/api/stories/list.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('GET /api/stories', () => {
	let authToken: string;
	let userId: string;

	test.beforeAll(async ({ request }) => {
		// Login to get auth token
		const response = await request.post('/auth/v1/token?grant_type=password', {
			data: {
				email: 'test@example.com',
				password: 'test123456'
			}
		});

		const data = await response.json();
		authToken = data.access_token;
		userId = data.user.id;

		// Create some test stories
		for (let i = 0; i < 30; i++) {
			await request.post('/api/stories', {
				headers: { Authorization: `Bearer ${authToken}` },
				data: {
					subject: `Test Story ${i}`,
					difficulty: (i % 3) + 1,
					darkness: (i % 3) + 1,
					question: `Question ${i}`,
					answer: `Answer ${i}`
				}
			});
		}
	});

	test('should list stories with default pagination', async ({ request }) => {
		const response = await request.get('/api/stories', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data).toHaveProperty('stories');
		expect(data).toHaveProperty('total');
		expect(Array.isArray(data.stories)).toBe(true);
		expect(data.stories.length).toBeLessThanOrEqual(25);
		expect(data.total).toBe(data.stories.length);

		// Verify sorting (newest first)
		if (data.stories.length > 1) {
			const firstDate = new Date(data.stories[0].created_at).getTime();
			const secondDate = new Date(data.stories[1].created_at).getTime();
			expect(firstDate).toBeGreaterThanOrEqual(secondDate);
		}
	});

	test('should support custom limit', async ({ request }) => {
		const response = await request.get('/api/stories?limit=10', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.stories.length).toBeLessThanOrEqual(10);
	});

	test('should support pagination with offset', async ({ request }) => {
		const response = await request.get('/api/stories?limit=10&offset=10', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.stories.length).toBeGreaterThan(0);
	});

	test('should return empty array for offset beyond range', async ({ request }) => {
		const response = await request.get('/api/stories?limit=25&offset=1000', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.stories).toEqual([]);
		expect(data.total).toBe(0);
	});

	test('should return 400 for invalid limit', async ({ request }) => {
		const response = await request.get('/api/stories?limit=0', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.field).toBe('limit');
	});

	test('should return 400 for negative offset', async ({ request }) => {
		const response = await request.get('/api/stories?offset=-1', {
			headers: { Authorization: `Bearer ${authToken}` }
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.field).toBe('offset');
	});

	test('should return 401 without auth token', async ({ request }) => {
		const response = await request.get('/api/stories');

		expect(response.status()).toBe(401);

		const data = await response.json();
		expect(data.error.code).toBe('AUTHENTICATION_ERROR');
	});

	test('should enforce RLS (user isolation)', async ({ request }) => {
		// Create second user
		await request.post('/auth/v1/signup', {
			data: {
				email: 'test2@example.com',
				password: 'test123456'
			}
		});

		const loginResponse = await request.post('/auth/v1/token?grant_type=password', {
			data: {
				email: 'test2@example.com',
				password: 'test123456'
			}
		});

		const user2Token = (await loginResponse.json()).access_token;

		// User 2 should see empty list (no stories)
		const response = await request.get('/api/stories', {
			headers: { Authorization: `Bearer ${user2Token}` }
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.stories).toEqual([]);
		expect(data.total).toBe(0);
	});
});
```

**Run tests:**

```bash
npx playwright test tests/api/stories/list.spec.ts
```

**Deliverable:**

- ✅ E2E tests written
- ✅ All tests passing
- ✅ Pagination tested
- ✅ RLS isolation tested
- ✅ Error scenarios covered

---

### Krok 8: Dokumentacja i deployment

**8.1. Update API Documentation**

Edytować: `docs/api/stories.md`

````markdown
# Stories API

## GET /api/stories

List all stories belonging to the authenticated user.

### Authentication

Required: Bearer token

### Query Parameters

- `limit` (optional): Integer (1-100), default: 25
- `offset` (optional): Integer (>= 0), default: 0

### Request

```bash
GET /api/stories?limit=25&offset=0
```
````

### Response (200 OK)

```json
{
	"stories": [
		{
			"id": "550e8400-e29b-41d4-a716-446655440000",
			"user_id": "660e8400-e29b-41d4-a716-446655440001",
			"subject": "Tajemnicza latarnia morska",
			"difficulty": 2,
			"darkness": 3,
			"question": "Na szczycie latarni morskiej...",
			"answer": "Latarnik zginął od uderzenia...",
			"created_at": "2025-01-26T10:30:00.000Z"
		}
	],
	"total": 1
}
```

### Errors

- 400: Validation error (invalid limit/offset)
- 401: Authentication error (no/invalid token)
- 500: Internal error (database failure)

### Sorting

Stories are sorted by `created_at DESC` (newest first).

### Pagination

Use `limit` and `offset` for pagination:

- Page 1: `?limit=25&offset=0`
- Page 2: `?limit=25&offset=25`
- Page 3: `?limit=25&offset=50`

See full documentation in `.ai/view-implementation-plans/list-stories-endpoint.md`

````

**8.2. Deployment Checklist**

- ✅ All environment variables set in Cloudflare Pages
- ✅ Database index `idx_stories_user_created` exists
- ✅ RLS policies active
- ✅ Build succeeds locally (`npm run build`)
- ✅ All tests passing
- ✅ Manual testing on staging
- ✅ Deploy to production
- ✅ Smoke test on production

**8.3. Post-Deployment Verification**

```bash
# 1. List stories via production API
curl -X GET "https://mrocznehistorie.pl/api/stories?limit=10" \
  -H "Authorization: Bearer $PROD_TOKEN"

# 2. Verify sorting (newest first)
# 3. Verify pagination works
# 4. Verify empty list for new users
````

**Deliverable:**

- ✅ API documentation updated
- ✅ Deployed to production
- ✅ Smoke tests passed

---

## 10. Podsumowanie implementacji

### 10.1. Główne komponenty

| Komponent       | Lokalizacja                              | Odpowiedzialność                       |
| --------------- | ---------------------------------------- | -------------------------------------- |
| API Route (GET) | `src/routes/api/stories/+server.ts`      | GET handler, query params parsing      |
| Validation      | `src/lib/validation/story.validation.ts` | ListStoriesQueryParamsSchema (Zod)     |
| Types           | `src/types.ts`                           | ListStoriesDTO, ListStoriesQueryParams |
| Auth Middleware | `src/hooks.server.ts`                    | Global authentication (reused)         |
| API Client      | `src/lib/api/stories.ts`                 | Frontend integration (listStories)     |
| Page            | `src/routes/history/+page.svelte`        | UI for story list                      |

### 10.2. Kluczowe decyzje projektowe

1. **Zod dla walidacji query params** - Type-safe validation z defaults
2. **Supabase .range() dla paginacji** - Zamiast .limit().offset()
3. **Default limit=25** - Rozsądna wartość, max 100
4. **RLS automatycznie filtruje** - WHERE user_id = auth.uid() (implicit)
5. **Composite index** - idx_stories_user_created dla optymalnej wydajności
6. **total = stories.length** - W MVP nie liczymy total count osobno (future enhancement)

### 10.3. Znane ograniczenia MVP

- ❌ Brak server-side total count (total = stories.length)
- ❌ Brak filtrowania (difficulty, darkness, search)
- ❌ Brak cursor-based pagination (tylko offset-based)
- ❌ Brak client-side caching
- ❌ Brak lazy loading (pełny content w każdym story)

### 10.4. Następne kroki (Post-MVP)

1. **Total count:** Dodać osobne query `SELECT COUNT(*) FROM stories WHERE user_id = auth.uid()`
2. **Cursor-based pagination:** Zamiast offset, użyć `created_at` jako cursor
3. **Filtering:** `?difficulty=2&darkness=3` dla filtrowania
4. **Search:** Full-text search po question/answer
5. **Lazy loading:** Lista zwraca tylko metadata, pełny content on demand
6. **Infinite scroll:** Frontend automatycznie ładuje więcej przy scrollowaniu
7. **Client-side caching:** SvelteKit stores z 5-min TTL
8. **Sort options:** Sortowanie po subject, difficulty, darkness (nie tylko created_at)

---

## Appendix: Przykładowe requesty

### Sukces - Basic (200 OK)

```bash
curl -X GET https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer eyJ..."
```

### Sukces - Custom pagination (200 OK)

```bash
curl -X GET "https://mrocznehistorie.pl/api/stories?limit=10&offset=20" \
  -H "Authorization: Bearer eyJ..."
```

### Błąd walidacji - Invalid limit (400)

```bash
curl -X GET "https://mrocznehistorie.pl/api/stories?limit=1000" \
  -H "Authorization: Bearer eyJ..."
```

### Błąd walidacji - Negative offset (400)

```bash
curl -X GET "https://mrocznehistorie.pl/api/stories?offset=-5" \
  -H "Authorization: Bearer eyJ..."
```

### Brak autoryzacji (401)

```bash
curl -X GET https://mrocznehistorie.pl/api/stories
```

### Empty list - New user (200 OK)

```bash
curl -X GET https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer $NEW_USER_TOKEN"

# Response: { "stories": [], "total": 0 }
```
