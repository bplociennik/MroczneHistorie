# API Endpoint Implementation Plan: Get Story by ID (GET /api/stories/:id)

## 1. Przegląd punktu końcowego

Endpoint `GET /api/stories/:id` odpowiada za pobranie pojedynczej historii po jej UUID. Jest to najprostszy i najszybszy endpoint w aplikacji, wykonujący primary key lookup w bazie danych.

**Kluczowe cechy:**
- Pobiera pojedynczą historię z tabeli `public.stories` po ID
- RLS automatycznie filtruje po user_id (user widzi tylko swoje historie)
- Bardzo szybki (target <100ms) - primary key index lookup
- Zwraca 404 jeśli historia nie istnieje LUB należy do innego użytkownika

**Powiązane User Stories:**
- Epic 3, ID 3.2: "Jako użytkownik chcę kliknąć na historię z listy, aby zobaczyć jej szczegóły"
- Epic 3, ID 3.3: "Jako użytkownik chcę zobaczyć pełną treść pytania (zagadki)"
- Epic 3, ID 3.4: "Jako użytkownik chcę kliknąć przycisk, aby ujawnić odpowiedź (rozwiązanie)"

**Relacja z innymi endpoints:**
- **Poprzedza:** `GET /api/stories` (lista historii)
- **Następuje:** `PATCH /api/stories/:id` (edycja), `DELETE /api/stories/:id` (usuwanie)

---

## 2. Szczegóły żądania

### 2.1. Metoda HTTP
`GET`

### 2.2. Struktura URL
```
GET /api/stories/:id
```

**Przykłady:**
```
GET /api/stories/550e8400-e29b-41d4-a716-446655440000
GET /api/stories/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
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

**URL Parameters:**

| Parametr | Typ      | Wymagany | Format  | Opis                            |
|----------|----------|----------|---------|---------------------------------|
| `id`     | `string` | ✅ Tak    | UUID v4 | Unikalny identyfikator historii |

**Query Parameters:**
- Brak

**Request Body:**
- Brak (GET request)

### 2.5. Walidacja URL parametru

#### UUID Format Validation:
```typescript
// Użyj isValidUUID() z types.ts (już istnieje!)
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// Test cases:
isValidUUID('550e8400-e29b-41d4-a716-446655440000') // ✅ true
isValidUUID('not-a-uuid') // ❌ false
isValidUUID('123') // ❌ false
isValidUUID('550e8400-e29b-41d4-a716') // ❌ false (too short)
isValidUUID('550e8400-e29b-41d4-a716-446655440000-extra') // ❌ false (too long)
isValidUUID('550e8400-e29b-51d4-a716-446655440000') // ❌ false (version not 4)
```

**Validation Flow:**
```typescript
const { id } = params;

if (!isValidUUID(id)) {
  return json<ErrorDTO>(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidłowy format identyfikatora historii',
        field: 'id'
      }
    },
    { status: 400 }
  );
}
```

---

## 3. Wykorzystywane typy

### 3.1. Response DTO
```typescript
// src/types.ts (istniejący typ)
export type StoryDTO = Tables<'stories'>;

// Rozwinięcie:
interface StoryDTO {
  id: string;           // uuid (URL param)
  user_id: string;      // uuid (auto-filtered by RLS)
  subject: string;      // varchar(150)
  difficulty: number;   // smallint (1-3)
  darkness: number;     // smallint (1-3)
  question: string;     // text
  answer: string;       // text
  created_at: string;   // timestamptz ISO 8601
}
```

### 3.2. Error DTO
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

### 3.3. Utility Functions
```typescript
// src/types.ts (już istnieje!)
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Content-Type:** `application/json`

**Struktura:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej znaleziono martwego latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Co się stało?",
  "answer": "Latarnik zginął od uderzenia dużym soplem, który stopniał po upadku z sufitu. Morderca umieścił go tam zimą, wiedząc, że w końcu się stopi, a jako dowód zostanie jedynie woda.",
  "created_at": "2025-01-26T10:30:00.000Z"
}
```

**Charakterystyka odpowiedzi:**
- Pojedynczy obiekt StoryDTO (nie array!)
- Wszystkie pola włącznie z question i answer
- created_at w formacie ISO 8601

**HTTP Headers:**
```
HTTP/1.1 200 OK
Content-Type: application/json
```

### 4.2. Błędy (4xx, 5xx)

#### 400 Bad Request - Invalid UUID format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowy format identyfikatora historii",
    "field": "id"
  }
}
```

**Przykłady invalid UUID:**
- `not-a-uuid`
- `123`
- `550e8400-e29b-41d4-a716` (za krótkie)
- `550e8400-e29b-51d4-a716-446655440000` (version nie 4)

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

#### 404 Not Found - Historia nie znaleziona
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Nie znaleziono historii lub nie masz do niej dostępu"
  }
}
```

**Przyczyny:**
- Historia o podanym ID nie istnieje w bazie
- Historia należy do innego użytkownika (RLS blocked)

**WAŻNE:** Nie rozróżniamy tych dwóch przypadków (security by obscurity):
- "Story doesn't exist" vs "Story belongs to different user"
- Zapobiega information disclosure
- Attacker nie może enumeration attack

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
       │ 1. GET /api/stories/550e8400-e29b-41d4-a716-446655440000
       │    Authorization: Bearer <token>
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │
│  src/routes/api/stories/[id]/+server.ts  │
└──────┬───────────────────────────────────┘
       │ 2. Extract :id from params
       ▼
┌──────────────────────┐
│  Validate UUID       │ ◄──── isValidUUID(id)
│  Format              │
└──────┬───────┬───────┘
       │       │
  Valid│       │Invalid
       │       └──────► 400 VALIDATION_ERROR
       ▼
┌──────────────────────┐
│  Authenticate user   │ ◄──── JWT token verification
│  (hooks.server.ts)   │
└──────┬───────────────┘
       │ 3. User authenticated
       ▼
┌──────────────────────────────────────────┐
│  Supabase Database                       │
│  SELECT * FROM public.stories            │
│  WHERE id = :id                          │
└──────┬───────────────────────────────────┘
       │ 4. RLS Check: stories_select_own
       ▼
┌──────────────────────┐
│  RLS Policy          │
│  stories_select_own  │ ◄──── USING (auth.uid() = user_id)
└──────┬───────┬───────┘
       │       │
  Pass │       │ Block (different user)
       │       └──────► Empty result → 404 NOT_FOUND
       ▼
┌──────────────────────┐
│  PostgreSQL          │ ◄──── Primary key index lookup
│  Index: stories_pkey │       (id PRIMARY KEY)
│  on (id)             │
└──────┬───────┬───────┘
       │       │
  Found│       │Not Found
       │       └──────► Empty result → 404 NOT_FOUND
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │ ◄──── Return single StoryDTO
└──────┬───────────────────────────────────┘
       │ 5. 200 OK + StoryDTO
       ▼
┌─────────────┐
│   Client    │ ◄──── Display story details
│             │       Render question/answer
└─────────────┘
```

### 5.2. Szczegółowy opis kroków

#### Krok 1: Client Request
- Frontend wysyła GET request z story ID w URL
- Typowo po kliknięciu w historię z listy
- Dołącza JWT token w nagłówku `Authorization`

#### Krok 2: Extract & Validate ID
- Extract `id` z URL params (SvelteKit params object)
- Wywołaj `isValidUUID(id)` z types.ts
- Jeśli invalid UUID format → 400 Bad Request
- Jeśli valid → proceed to auth

#### Krok 3: Authentication
- SvelteKit middleware (`src/hooks.server.ts`) weryfikuje JWT
- Supabase Auth waliduje token i zwraca user
- Jeśli token nieprawidłowy → 401 Unauthorized

#### Krok 4: Row Level Security Check
- PostgreSQL wykonuje RLS policy `stories_select_own`
- Sprawdza czy `auth.uid() = user_id`
- **Jeśli historia należy do innego użytkownika:**
  - RLS blokuje dostęp
  - Query zwraca empty result
  - API endpoint zwraca 404 Not Found

#### Krok 5: Database Lookup
- PostgreSQL wykonuje:
  ```sql
  SELECT * FROM public.stories
  WHERE id = '550e8400-e29b-41d4-a716-446655440000'
    AND user_id = auth.uid();  -- RLS auto-adds this
  ```
- Wykorzystuje primary key index `stories_pkey` na `id`
- **Bardzo szybki lookup:** O(log n) ≈ O(1) dla primary key
- Typowy czas: <10ms

**Rezultaty:**
- **Found:** Zwraca single row
- **Not Found:** Empty result (RLS blocked LUB ID doesn't exist)

#### Krok 6: Client Response
- API route formatuje odpowiedź jako `StoryDTO`
- Zwraca 200 OK z pojedynczym obiektem
- Frontend renderuje szczegóły historii

### 5.3. Interakcje z bazą danych

#### SQL Query (wykonywane przez Supabase SDK)
```sql
-- Supabase SDK generuje zapytanie:
SELECT *
FROM public.stories
WHERE id = $1  -- UUID parameter
  AND user_id = auth.uid();  -- RLS auto-adds

-- Parameter: $1 = '550e8400-e29b-41d4-a716-446655440000'
```

**Index Utilization:**
```sql
-- PostgreSQL używa primary key index:
-- stories_pkey ON (id)

-- EXPLAIN ANALYZE pokazuje:
-- Index Scan using stories_pkey on stories
--   Index Cond: (id = '550e8400-...')
--   Filter: (user_id = auth.uid())
--   Rows: 1  Cost: 0.15..8.17
```

**Performance:**
- Primary key lookup: O(log n) ≈ O(1)
- RLS filter: Minimal overhead (single equality check)
- Typowy czas: 5-15ms dla 10,000 stories

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
  event.locals.supabase = createServerClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get: (key) => event.cookies.get(key),
        set: (key, value, options) => event.cookies.set(key, value, options),
        remove: (key, options) => event.cookies.delete(key, options)
      }
    }
  );

  const { data: { session } } = await event.locals.supabase.auth.getSession();
  event.locals.user = session?.user ?? null;

  return resolve(event);
};
```

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
3. Jeśli próbuje dostępu do cudzej historii → RLS zwraca empty result

**Security Guarantee:**
- Zero Trust: Baza danych jest ostatecznym arbitrem
- Nawet jeśli aplikacja ma bug, RLS blokuje dostęp
- **Nie ujawniamy** czy story doesn't exist vs belongs to different user

**Test Case:**
```typescript
// User A (id: user-a-uuid) próbuje zobaczyć historię User B

// Request: GET /api/stories/user-b-story-uuid
// Headers: Authorization: Bearer user-a-token

// PostgreSQL wykonuje:
SELECT * FROM stories
WHERE id = 'user-b-story-uuid'
  AND user_id = 'user-a-uuid';  -- RLS auto-adds

// Result: Empty (RLS blocked)
// API Response: 404 NOT_FOUND
```

### 6.3. UUID Validation & Injection Prevention

#### SQL Injection Prevention
**Zagrożenie:**
```
GET /api/stories/550e8400-e29b-41d4-a716-446655440000'; DROP TABLE stories; --
```

**Mitigation:**
1. **UUID validation:** isValidUUID() odrzuca wszystko co nie jest UUID v4
2. **Parameterized queries:** Supabase SDK nie konkatenuje stringów
3. **Type safety:** PostgreSQL uuid type validation

**Nie ma ryzyka SQL injection** bo:
- UUID validation przed użyciem w query
- Supabase SDK używa prepared statements
- PostgreSQL type checking

#### UUID Enumeration Attack
**Zagrożenie:**
Attacker może próbować odgadnąć UUIDs i dostać się do cudzych historii:
```
GET /api/stories/00000000-0000-4000-8000-000000000001
GET /api/stories/00000000-0000-4000-8000-000000000002
... brute force
```

**Mitigation:**
- **UUID v4 przestrzeń:** 2^122 możliwości (340,282,366,920,938,463,463,374,607,431,768,211,456)
- **Astronomically impossible** to guess w reasonable time
- **RLS blokuje** nawet jeśli odgadnie (belongs to different user)
- **Rate limiting (future):** Max 100 requests/minute per user

**Praktycznie niemożliwe:**
- Przy 1 billion requests/second: 10^25 years to try 1% UUIDs
- RLS dodatkowo blokuje wszystkie cudze historie

### 6.4. Information Disclosure Prevention

**Problem:**
Czy ujawnić różnicę między "story doesn't exist" vs "story belongs to different user"?

**Decyzja:**
- **Jednolita odpowiedź 404:** "Nie znaleziono historii lub nie masz do niej dostępu"
- Nie rozróżniamy przypadków
- Zapobiega information leakage

**Dlaczego to ważne:**
```
// Attacker scenario:
GET /api/stories/valid-uuid-that-exists
→ 404 "Not found or no access"
// Attacker nie wie czy:
// a) Story doesn't exist
// b) Story belongs to someone else

// Gdyby były różne messages:
// a) "Story not found" → attacker wie że ID invalid
// b) "Access denied" → attacker wie że ID valid (enumeration!)
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

---

## 7. Obsługa błędów

### 7.1. Tabela błędów

| Error Code | HTTP Status | Opis | User Message (PL) | Retry Safe? | Frontend Action |
|-----------|-------------|------|-------------------|-------------|-----------------|
| `VALIDATION_ERROR` | 400 | Invalid UUID format | "Nieprawidłowy format identyfikatora historii" | ❌ Nie | Show error, redirect to /history |
| `AUTHENTICATION_ERROR` | 401 | No/invalid token | "Brakujący lub nieprawidłowy token uwierzytelniający" | ❌ Nie | Redirect to /login |
| `NOT_FOUND` | 404 | Story doesn't exist OR no access | "Nie znaleziono historii lub nie masz do niej dostępu" | ❌ Nie | Show 404 page, link to /history |
| `INTERNAL_ERROR` | 500 | Database error | "Nie udało się pobrać historii. Spróbuj ponownie później" | ✅ Tak | Show error toast, enable retry |

### 7.2. Szczegółowa obsługa błędów

#### 7.2.1. VALIDATION_ERROR (400)

**Scenariusze:**

**Invalid UUID format:**
```typescript
// URL: /api/stories/not-a-uuid
if (!isValidUUID(id)) {
  return json<ErrorDTO>(
    {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Nieprawidłowy format identyfikatora historii',
        field: 'id'
      }
    },
    { status: 400 }
  );
}
```

**Test cases:**
```typescript
// Invalid UUIDs:
isValidUUID('not-a-uuid') → false
isValidUUID('123') → false
isValidUUID('550e8400-e29b-41d4-a716') → false (too short)
isValidUUID('550e8400-e29b-51d4-a716-446655440000') → false (version not 4)
isValidUUID('') → false (empty)
isValidUUID(null) → false (null)
```

**Frontend Action:**
- Pokaż error message: "Nieprawidłowy link do historii"
- Przycisk: "Wróć do listy historii" → redirect to `/history`
- **Nie retry** - invalid UUID nie stanie się valid

**Logging:**
```typescript
console.warn('[VALIDATION_ERROR] Invalid UUID format', {
  providedId: id,
  userId: locals.user?.id,
  timestamp: new Date().toISOString()
});
```

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
- Zapisz intent: redirect back to `/history/${id}` po zalogowaniu

#### 7.2.3. NOT_FOUND (404)

**Scenariusze:**

**Przypadek 1: Story nie istnieje**
```typescript
// UUID valid, ale story nie istnieje w bazie
const { data, error } = await locals.supabase
  .from('stories')
  .select('*')
  .eq('id', id)
  .single();

// data = null (empty result)
```

**Przypadek 2: Story należy do innego użytkownika (RLS blocked)**
```typescript
// UUID valid, story exists, ale belongs to different user
// RLS policy blokuje dostęp
// Query zwraca empty result (jak gdyby nie istniało)

// data = null (RLS blocked)
```

**Jednolita odpowiedź dla obu przypadków:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Nie znaleziono historii lub nie masz do niej dostępu"
  }
}
```

**Frontend Action:**
- Wyświetl 404 page z komunikatem
- Sugestie:
  - "Historia mogła zostać usunięta"
  - "Sprawdź czy link jest poprawny"
- Przycisk: "Wróć do moich historii" → `/history`
- **Nie retry** - 404 jest permanent (story doesn't exist or no access)

**Logging:**
```typescript
// Log 404s - może być attempt to access innego usera
console.warn('[NOT_FOUND] Story not found or no access', {
  storyId: id,
  userId: locals.user.id,
  timestamp: new Date().toISOString()
});

// Future: Track 404 rate (może być enumeration attack)
```

#### 7.2.4. INTERNAL_ERROR (500)

**Scenariusze:**

**Database SELECT Error:**
```typescript
const { data, error } = await locals.supabase
  .from('stories')
  .select('*')
  .eq('id', id)
  .single();

if (error) {
  console.error('[DB_ERROR] SELECT failed', {
    code: error.code,
    message: error.message,
    storyId: id,
    userId: locals.user.id,
    timestamp: new Date().toISOString()
  });

  throw new InternalError('Database SELECT failed');
}
```

**Connection Timeout:**
```typescript
// Database query takes too long (>5s)
if (error.code === '57014') {  // query_canceled
  console.error('[TIMEOUT] Database query timeout', {
    storyId: id,
    userId: locals.user.id,
    error: error
  });

  throw new InternalError('Database timeout');
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
- Włącz przycisk "Spróbuj ponownie"
- Zachowaj URL (nie redirect)
- Auto-retry raz po 2s

**Logging:**
```typescript
console.error('[API_ERROR] GET /api/stories/:id', {
  error: error.message,
  stack: error.stack,
  storyId: id,
  userId: locals.user.id,
  timestamp: new Date().toISOString()
});
```

### 7.3. Error Handling Flow Diagram

```
┌─────────────────┐
│  API Request    │
│  GET /:id       │
└────────┬────────┘
         │
         ▼
    ┌────────────┐
    │ Validate   │
    │ UUID       │
    └────┬───┬───┘
         │   │
    Valid│   │Invalid
         │   └──────► 400 VALIDATION_ERROR
         ▼
    ┌────────────┐
    │ Auth Check │
    └────┬───┬───┘
         │   │
    OK   │   │ FAIL
         │   └──────► 401 AUTHENTICATION_ERROR
         ▼
    ┌──────────────┐
    │ SELECT       │
    │ FROM DB      │
    │ WHERE id=:id │
    └────┬────┬────┐
         │    │    │
  Found  │    │  Error
         │  Empty  │
         │    │    │
         │    ▼    ▼
         │   404  500
         │   NOT_FOUND
         │   INTERNAL_ERROR
         ▼
    ┌──────────────┐
    │ Return 200   │
    │ + StoryDTO   │
    └──────────────┘
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła (Bottlenecks)

#### 8.1.1. Database Query Performance
**Problem:**
- Primary key lookup jest bardzo szybki, ale może być bottleneck przy bardzo wysokim traffic

**Wpływ:**
- ~5-15ms response time (typowo)
- Bottleneck przy >1000 concurrent requests

**Mitigation (MVP):**
- Primary key index `stories_pkey` zapewnia O(log n) ≈ O(1) lookup
- Connection pooling (Supabase PgBouncer)

**Current Performance:**
```sql
EXPLAIN ANALYZE SELECT * FROM stories WHERE id = 'uuid';

-- Result:
-- Index Scan using stories_pkey on stories
-- Planning Time: 0.05 ms
-- Execution Time: 1.2 ms  (for 10,000 stories)
```

**Future optimization:**
- Caching (Redis) dla hot stories
- CDN caching (Cloudflare) dla read-heavy stories

#### 8.1.2. RLS Policy Evaluation
**Problem:**
- PostgreSQL musi sprawdzić `auth.uid() = user_id` przy każdym query
- JWT parsing przy każdym request

**Wpływ:**
- +5-10ms latency per request

**Mitigation:**
- RLS policy jest bardzo prosta (single equality check)
- PostgreSQL cache'uje execution plan
- Minimal overhead

**Future optimization:**
- Server-side session caching (Redis) - IF auth becomes bottleneck

#### 8.1.3. Network Latency
**Problem:**
- Roundtrip time: Client → Cloudflare → SvelteKit → Supabase → SvelteKit → Client

**Wpływ:**
- +50-200ms depending on geography

**Mitigation:**
- Cloudflare global CDN (edge caching)
- Supabase multi-region (future)
- Client-side caching (future)

### 8.2. Strategie optymalizacji

#### 8.2.1. Database Optimization

**Index Strategy:**
```sql
-- Primary key index (already exists, automatic)
CREATE UNIQUE INDEX stories_pkey ON public.stories USING btree (id);

-- This is the PERFECT index for WHERE id = :id queries
-- O(log n) lookup, very fast
```

**Query Optimization:**
```typescript
// Use .single() for single row
const { data, error } = await locals.supabase
  .from('stories')
  .select('*')
  .eq('id', id)
  .single();  // Returns single object, not array

// Advantage: Cleaner code, no need to access data[0]
```

**Connection Pooling:**
- Supabase PgBouncer (transaction mode)
- Pool size: 15 connections (default)
- Optimal dla krótkich queries

#### 8.2.2. Caching Strategy (Future)

**Client-Side Caching:**
```typescript
// SvelteKit stores
import { writable } from 'svelte/store';

export const storyCache = writable<Map<string, {
  story: StoryDTO;
  fetchedAt: number;
}>>(new Map());

// On fetch:
const cached = storyCache.get(id);
const now = Date.now();

// Use cache if fresh (<5 minutes)
if (cached && now - cached.fetchedAt < 5 * 60 * 1000) {
  return cached.story;
}

// Otherwise fetch fresh data
const story = await fetch(`/api/stories/${id}`);

storyCache.set(id, {
  story,
  fetchedAt: now
});
```

**Server-Side Caching (Future - NOT in MVP):**
```typescript
// Redis cache
import { redis } from '$lib/redis';

const cacheKey = `story:${id}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const story = await fetchFromDB(id);

// Cache for 1 hour
await redis.setex(cacheKey, 3600, JSON.stringify(story));

return story;
```

**Cache Invalidation:**
```typescript
// After PATCH /api/stories/:id (update)
await redis.del(`story:${id}`);

// Or: Update cache optimistically
storyCache.update(cache => {
  cache.set(id, { story: updatedStory, fetchedAt: Date.now() });
  return cache;
});
```

**CDN Caching (Cloudflare Pages):**
```typescript
// Future: Add Cache-Control headers for public stories (jeśli będą)
export const GET: RequestHandler = async ({ params, locals }) => {
  // ... fetch story

  return json(story, {
    status: 200,
    headers: {
      'Cache-Control': 'private, max-age=300'  // 5 minutes client cache
    }
  });
};
```

#### 8.2.3. Response Optimization

**Compression:**
- Cloudflare Pages automatic gzip/brotli
- Reduces payload size by ~70%

**Lazy Loading (Future):**
```typescript
// Currently: Return full story (question + answer)
// Future option: Return only question, load answer on demand

// GET /api/stories/:id → { ...story, answer: undefined }
// GET /api/stories/:id/answer → { answer: "..." }

// Advantage: Smaller initial payload
// Disadvantage: Extra request for answer reveal
```

### 8.3. Performance Targets

| Metric                    | Target (MVP) | Target (Post-MVP) |
|---------------------------|--------------|-------------------|
| API Response Time (p50)   | < 50ms       | < 30ms            |
| API Response Time (p95)   | < 100ms      | < 75ms            |
| API Response Time (p99)   | < 150ms      | < 100ms           |
| Database Query Time       | < 10ms       | < 5ms             |
| RLS Evaluation Time       | < 5ms        | < 2ms             |
| Cache Hit Rate (future)   | N/A          | > 70%             |
| Throughput (requests/sec) | 500          | 2000              |

### 8.4. Load Testing Plan

**Scenarios:**
1. **Baseline:** 10 concurrent users, 5 story views per minute each
2. **Normal Load:** 100 concurrent users, 20 views per minute each
3. **Peak Load:** 500 concurrent users, 50 views per minute each
4. **Cache Test:** Repeated access to same story IDs (test cache efficiency)

**Tools:**
- k6 for load testing
- Grafana for monitoring
- Supabase Dashboard for database metrics

**Metrics to Monitor:**
- Response time distribution (p50, p95, p99)
- Error rate (404 vs 500)
- Database query duration
- Primary key index usage
- Connection pool utilization

**Sample k6 Script:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 10 },   // Ramp-up
    { duration: '5m', target: 100 },  // Normal load
    { duration: '2m', target: 500 },  // Peak load
    { duration: '5m', target: 0 },    // Ramp-down
  ],
};

const storyIds = [
  '550e8400-e29b-41d4-a716-446655440000',
  '660e8400-e29b-41d4-a716-446655440001',
  '770e8400-e29b-41d4-a716-446655440002',
  // ... more IDs
];

export default function () {
  const token = __ENV.AUTH_TOKEN;
  const storyId = storyIds[Math.floor(Math.random() * storyIds.length)];

  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };

  const res = http.get(
    `https://mrocznehistorie.pl/api/stories/${storyId}`,
    params
  );

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'has story id': (r) => JSON.parse(r.body).id !== undefined,
    'has question': (r) => JSON.parse(r.body).question !== undefined,
    'has answer': (r) => JSON.parse(r.body).answer !== undefined,
  });

  sleep(Math.random() * 3);  // Random 0-3s between requests
}
```

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie SvelteKit API Route (dynamic route)

**Utworzyć folder i plik:** `src/routes/api/stories/[id]/+server.ts`

**Struktura folderów:**
```
src/routes/api/stories/
  ├── +server.ts              (GET list, POST create - już istniejące)
  ├── [id]/
  │   └── +server.ts          (GET single - nowy)
  └── generate/
      └── +server.ts          (POST generate - już istniejący)
```

**Implementacja:**

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidUUID } from '$lib/types';
import type { ErrorDTO, StoryDTO } from '$lib/types';

export const GET: RequestHandler = async ({ params, locals }) => {
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

  // 2. Extract and validate ID
  const { id } = params;

  if (!isValidUUID(id)) {
    console.warn('[VALIDATION_ERROR] Invalid UUID format', {
      providedId: id,
      userId: locals.user.id,
      timestamp: new Date().toISOString()
    });

    return json<ErrorDTO>(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Nieprawidłowy format identyfikatora historii',
          field: 'id'
        }
      },
      { status: 400 }
    );
  }

  // 3. Fetch story from database
  try {
    const { data, error } = await locals.supabase
      .from('stories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      // Check if "not found" (common case)
      if (error.code === 'PGRST116') {
        console.warn('[NOT_FOUND] Story not found or no access', {
          storyId: id,
          userId: locals.user.id,
          timestamp: new Date().toISOString()
        });

        return json<ErrorDTO>(
          {
            error: {
              code: 'NOT_FOUND',
              message: 'Nie znaleziono historii lub nie masz do niej dostępu'
            }
          },
          { status: 404 }
        );
      }

      // Other database errors
      console.error('[DB_ERROR] SELECT failed', {
        code: error.code,
        message: error.message,
        storyId: id,
        userId: locals.user.id,
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

    // 4. Check if data is null (RLS blocked or not found)
    if (!data) {
      console.warn('[NOT_FOUND] Story not found or no access (RLS)', {
        storyId: id,
        userId: locals.user.id,
        timestamp: new Date().toISOString()
      });

      return json<ErrorDTO>(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'Nie znaleziono historii lub nie masz do niej dostępu'
          }
        },
        { status: 404 }
      );
    }

    // 5. Return success response
    return json<StoryDTO>(data, { status: 200 });
  } catch (error: any) {
    // 6. Handle unexpected errors
    console.error('[API_ERROR] GET /api/stories/:id', {
      error: error.message,
      stack: error.stack,
      storyId: id,
      userId: locals.user.id,
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
```

**Deliverable:**
- ✅ Dynamic route [id] created
- ✅ GET handler fully implemented
- ✅ UUID validation using isValidUUID()
- ✅ All error scenarios handled
- ✅ Logging for debugging

---

### Krok 2: Testowanie manualne

**2.1. Happy Path Tests**

```bash
# Get auth token first
TOKEN="eyJ..."

# Valid story ID (belonging to authenticated user)
STORY_ID="550e8400-e29b-41d4-a716-446655440000"

# Get story by ID
curl -X GET "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK
# Response: { id, user_id, subject, difficulty, darkness, question, answer, created_at }
```

**2.2. Validation Error Tests**

```bash
# Invalid UUID format - not a UUID
curl -X GET "https://localhost:5173/api/stories/not-a-uuid" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
# Error: "Nieprawidłowy format identyfikatora historii"

# Invalid UUID format - too short
curl -X GET "https://localhost:5173/api/stories/550e8400-e29b-41d4-a716" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request

# Invalid UUID format - wrong version (version 5 instead of 4)
curl -X GET "https://localhost:5173/api/stories/550e8400-e29b-51d4-a716-446655440000" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 400 Bad Request
```

**2.3. Authentication Error Tests**

```bash
# No token
curl -X GET "https://localhost:5173/api/stories/$STORY_ID"

# Expected: 401 Unauthorized

# Invalid token
curl -X GET "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer invalid_token"

# Expected: 401 Unauthorized
```

**2.4. Not Found Tests**

```bash
# Valid UUID format, but story doesn't exist
NON_EXISTENT_ID="00000000-0000-4000-8000-000000000001"

curl -X GET "https://localhost:5173/api/stories/$NON_EXISTENT_ID" \
  -H "Authorization: Bearer $TOKEN"

# Expected: 404 Not Found
# Error: "Nie znaleziono historii lub nie masz do niej dostępu"
```

**2.5. RLS Test (Different User)**

```bash
# User A token
TOKEN_A="user_a_token"

# User B creates a story
TOKEN_B="user_b_token"
STORY_B_ID=$(curl -X POST "https://localhost:5173/api/stories" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"subject":"User B Story","difficulty":1,"darkness":1,"question":"Q","answer":"A"}' \
  | jq -r '.id')

# User A tries to access User B's story
curl -X GET "https://localhost:5173/api/stories/$STORY_B_ID" \
  -H "Authorization: Bearer $TOKEN_A"

# Expected: 404 Not Found (RLS blocked)
# Error: "Nie znaleziono historii lub nie masz do niej dostępu"
```

**Deliverable:**
- ✅ All happy path tests passing
- ✅ All validation tests returning 400
- ✅ All auth tests returning 401
- ✅ 404 for non-existent stories
- ✅ RLS isolation verified (404 for different user's story)

---

### Krok 3: Testowanie RLS (Row Level Security)

**3.1. Verify RLS Policy**

```sql
-- Check SELECT policy
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stories' AND cmd = 'SELECT';

-- Should return: stories_select_own with USING (auth.uid() = user_id)
```

**3.2. Test RLS Enforcement via SQL**

```sql
-- Set user context A
SET request.jwt.claim.sub = '<user-a-uuid>';

-- User A creates story
INSERT INTO public.stories (subject, difficulty, darkness, question, answer, user_id)
VALUES ('User A Story', 1, 1, 'Q', 'A', auth.uid())
RETURNING id;

-- Get story ID: user-a-story-uuid

-- User A can see their story
SELECT * FROM public.stories WHERE id = '<user-a-story-uuid>';
-- Result: 1 row

-- Switch to user B
SET request.jwt.claim.sub = '<user-b-uuid>';

-- User B tries to see User A's story
SELECT * FROM public.stories WHERE id = '<user-a-story-uuid>';
-- Result: 0 rows (RLS blocked)
```

**Deliverable:**
- ✅ RLS policy `stories_select_own` active
- ✅ User A can see their stories
- ✅ User B cannot see User A's stories
- ✅ Same UUID returns different results for different users

---

### Krok 4: Weryfikacja performance (index usage)

**Sprawdź czy PostgreSQL używa primary key index:**

```sql
-- EXPLAIN ANALYZE for ID lookup
EXPLAIN ANALYZE
SELECT * FROM public.stories
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
  AND user_id = '<user-uuid>';

-- Expected output should include:
-- Index Scan using stories_pkey on stories
-- (NOT Seq Scan - that would be slow!)

-- Typical execution time: 1-5ms
```

**Deliverable:**
- ✅ PostgreSQL uses Index Scan (stories_pkey)
- ✅ Query execution time < 10ms
- ✅ No sequential scans

---

### Krok 5: Frontend Integration

**5.1. Create API Client Function**

Edytować: `src/lib/api/stories.ts`

```typescript
import type { StoryDTO, ErrorDTO } from '$lib/types';

// Existing functions: listStories(), createStory()

export async function getStoryById(
  id: string,
  token: string
): Promise<StoryDTO> {
  const response = await fetch(`/api/stories/${id}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error: ErrorDTO = await response.json();
    throw new Error(error.error.message);
  }

  return response.json();
}
```

**5.2. Create Story Detail Page**

Utworzyć: `src/routes/history/[id]/+page.svelte`

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { getStoryById } from '$lib/api/stories';
  import { getSupabase } from '$lib/supabase';
  import type { StoryDTO } from '$lib/types';

  let story: StoryDTO | null = null;
  let loading = false;
  let error = '';
  let answerRevealed = false;

  const storyId = $page.params.id;

  async function loadStory() {
    loading = true;
    error = '';

    try {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      story = await getStoryById(storyId, session.access_token);
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  function toggleAnswer() {
    answerRevealed = !answerRevealed;
  }

  onMount(loadStory);
</script>

<div class="container">
  {#if loading}
    <p>Ładowanie historii...</p>
  {:else if error}
    <div class="error-state">
      <h2>Wystąpił błąd</h2>
      <p>{error}</p>
      <a href="/history" class="btn">Wróć do listy historii</a>
    </div>
  {:else if story}
    <div class="story-detail">
      <h1>{story.subject}</h1>

      <div class="metadata">
        <span>Trudność: {story.difficulty}/3</span>
        <span>Mroczność: {story.darkness}/3</span>
        <span class="date">{new Date(story.created_at).toLocaleDateString('pl-PL')}</span>
      </div>

      <div class="question-section">
        <h2>Zagadka</h2>
        <p>{story.question}</p>
      </div>

      <div class="answer-section">
        <button on:click={toggleAnswer} class="btn-reveal">
          {answerRevealed ? 'Ukryj rozwiązanie' : 'Pokaż rozwiązanie'}
        </button>

        {#if answerRevealed}
          <div class="answer">
            <h3>Rozwiązanie</h3>
            <p>{story.answer}</p>
          </div>
        {/if}
      </div>

      <div class="actions">
        <a href="/history" class="btn-secondary">Wróć do listy</a>
        <a href="/history/{story.id}/edit" class="btn">Edytuj</a>
      </div>
    </div>
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  .story-detail {
    background: white;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .metadata {
    display: flex;
    gap: 1rem;
    margin: 1rem 0;
    color: #666;
    font-size: 0.9rem;
  }

  .question-section {
    margin: 2rem 0;
  }

  .answer-section {
    margin: 2rem 0;
  }

  .btn-reveal {
    padding: 0.75rem 1.5rem;
    background: #6366f1;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
  }

  .btn-reveal:hover {
    background: #4f46e5;
  }

  .answer {
    margin-top: 1rem;
    padding: 1rem;
    background: #f9fafb;
    border-left: 4px solid #6366f1;
    border-radius: 4px;
  }

  .actions {
    display: flex;
    gap: 1rem;
    margin-top: 2rem;
  }

  .error-state {
    text-align: center;
    padding: 3rem;
  }

  .error-state h2 {
    color: #ef4444;
    margin-bottom: 1rem;
  }
</style>
```

**Deliverable:**
- ✅ API client function created
- ✅ Story detail page implemented
- ✅ Answer reveal functionality
- ✅ Error handling
- ✅ Loading states

---

### Krok 6: E2E Testing (Playwright)

**Utworzyć:** `tests/api/stories/get-by-id.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('GET /api/stories/:id', () => {
  let authToken: string;
  let storyId: string;

  test.beforeAll(async ({ request }) => {
    // Login to get auth token
    const loginResponse = await request.post('/auth/v1/token?grant_type=password', {
      data: {
        email: 'test@example.com',
        password: 'test123456'
      }
    });

    const loginData = await loginResponse.json();
    authToken = loginData.access_token;

    // Create a test story
    const createResponse = await request.post('/api/stories', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        subject: 'E2E Test Story for GET',
        difficulty: 2,
        darkness: 2,
        question: 'E2E test question',
        answer: 'E2E test answer'
      }
    });

    const createData = await createResponse.json();
    storyId = createData.id;
  });

  test('should get story by valid ID', async ({ request }) => {
    const response = await request.get(`/api/stories/${storyId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(storyId);
    expect(data).toHaveProperty('subject');
    expect(data).toHaveProperty('question');
    expect(data).toHaveProperty('answer');
    expect(data).toHaveProperty('created_at');
    expect(data.subject).toBe('E2E Test Story for GET');
  });

  test('should return 400 for invalid UUID format', async ({ request }) => {
    const response = await request.get('/api/stories/not-a-uuid', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.field).toBe('id');
  });

  test('should return 401 without auth token', async ({ request }) => {
    const response = await request.get(`/api/stories/${storyId}`);

    expect(response.status()).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe('AUTHENTICATION_ERROR');
  });

  test('should return 404 for non-existent story', async ({ request }) => {
    const nonExistentId = '00000000-0000-4000-8000-000000000001';

    const response = await request.get(`/api/stories/${nonExistentId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error.code).toBe('NOT_FOUND');
  });

  test('should enforce RLS (different user)', async ({ request }) => {
    // Create second user
    await request.post('/auth/v1/signup', {
      data: {
        email: 'test2@example.com',
        password: 'test123456'
      }
    });

    const user2LoginResponse = await request.post('/auth/v1/token?grant_type=password', {
      data: {
        email: 'test2@example.com',
        password: 'test123456'
      }
    });

    const user2Token = (await user2LoginResponse.json()).access_token;

    // User 2 tries to access User 1's story
    const response = await request.get(`/api/stories/${storyId}`, {
      headers: { 'Authorization': `Bearer ${user2Token}` }
    });

    expect(response.status()).toBe(404);

    const data = await response.json();
    expect(data.error.code).toBe('NOT_FOUND');
    // Same message for "doesn't exist" and "no access" (security)
    expect(data.error.message).toContain('nie masz do niej dostępu');
  });
});
```

**Run tests:**
```bash
npx playwright test tests/api/stories/get-by-id.spec.ts
```

**Deliverable:**
- ✅ E2E tests written
- ✅ All tests passing
- ✅ Happy path covered
- ✅ UUID validation tested
- ✅ RLS isolation verified
- ✅ 404 scenarios tested

---

### Krok 7: Dokumentacja

**7.1. Update API Documentation**

Edytować: `docs/api/stories.md`

```markdown
# Stories API

## GET /api/stories/:id

Get a specific story by its UUID.

### Authentication
Required: Bearer token

### URL Parameters
- `id`: UUID v4 format (required)

### Request
```bash
GET /api/stories/550e8400-e29b-41d4-a716-446655440000
```

### Response (200 OK)
```json
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
```

### Errors
- 400: Invalid UUID format
- 401: Authentication error (no/invalid token)
- 404: Story not found or no access (RLS)
- 500: Internal error (database failure)

### Security
- RLS automatically filters by user_id
- User can only access their own stories
- 404 returned for both "doesn't exist" and "belongs to different user"

See full documentation in `.ai/view-implementation-plans/get-story-by-id-endpoint.md`
```

**7.2. Code Comments**

```typescript
/**
 * Get Story by ID API Endpoint
 *
 * @route GET /api/stories/:id
 * @auth Required (JWT Bearer token)
 *
 * @param {string} id - Story UUID (URL parameter)
 * @returns {StoryDTO} Full story object
 *
 * @throws {400} VALIDATION_ERROR - Invalid UUID format
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {404} NOT_FOUND - Story doesn't exist or no access (RLS)
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const GET: RequestHandler = async ({ params, locals }) => {
  // ...
};
```

**Deliverable:**
- ✅ API documentation updated
- ✅ Code comments added
- ✅ Implementation plan saved

---

### Krok 8: Deployment

**8.1. Deployment Checklist**

- ✅ All environment variables set in Cloudflare Pages
- ✅ Primary key index `stories_pkey` exists (automatic)
- ✅ RLS policies active
- ✅ Build succeeds locally (`npm run build`)
- ✅ All tests passing
- ✅ Manual testing on staging
- ✅ Deploy to production
- ✅ Smoke test on production

**8.2. Post-Deployment Verification**

```bash
# 1. Get story by ID via production API
PROD_STORY_ID="<existing-story-uuid>"

curl -X GET "https://mrocznehistorie.pl/api/stories/$PROD_STORY_ID" \
  -H "Authorization: Bearer $PROD_TOKEN"

# Expected: 200 OK with full story object

# 2. Test invalid UUID
curl -X GET "https://mrocznehistorie.pl/api/stories/invalid-uuid" \
  -H "Authorization: Bearer $PROD_TOKEN"

# Expected: 400 Bad Request

# 3. Test non-existent UUID
curl -X GET "https://mrocznehistorie.pl/api/stories/00000000-0000-4000-8000-000000000001" \
  -H "Authorization: Bearer $PROD_TOKEN"

# Expected: 404 Not Found

# 4. Verify RLS (try to access story created by different user)
# Expected: 404 Not Found
```

**Deliverable:**
- ✅ Deployed to production
- ✅ Smoke tests passed
- ✅ Performance verified (<100ms p95)

---

## 10. Podsumowanie implementacji

### 10.1. Główne komponenty

| Komponent       | Lokalizacja                              | Odpowiedzialność                        |
|-----------------|------------------------------------------|-----------------------------------------|
| API Route (GET) | `src/routes/api/stories/[id]/+server.ts` | GET handler, UUID validation, DB lookup |
| UUID Validation | `src/types.ts`                           | isValidUUID() function                  |
| Types           | `src/types.ts`                           | StoryDTO, ErrorDTO                      |
| Auth Middleware | `src/hooks.server.ts`                    | Global authentication (reused)          |
| API Client      | `src/lib/api/stories.ts`                 | getStoryById() function                 |
| Page            | `src/routes/history/[id]/+page.svelte`   | Story detail UI                         |

### 10.2. Kluczowe decyzje projektowe

1. **Dynamic route [id]** - SvelteKit folder structure
2. **isValidUUID()** - Reużycie existing function z types.ts
3. **Jednolita 404 message** - Security by obscurity (nie ujawniamy czy story exists)
4. **Primary key lookup** - Najszybszy możliwy query (O(log n) ≈ O(1))
5. **RLS auto-filtering** - Implicit WHERE user_id = auth.uid()
6. **.single()** - Zwraca pojedynczy obiekt (nie array)

### 10.3. Znane ograniczenia MVP

- ❌ Brak client-side caching
- ❌ Brak server-side caching (Redis)
- ❌ Brak CDN caching
- ❌ Brak analytics (most viewed stories)
- ❌ Brak lazy loading (answer on demand)

### 10.4. Następne kroki (Post-MVP)

1. **Client-side caching:** SvelteKit stores z 5-min TTL
2. **Server-side caching:** Redis cache z 1-hour TTL
3. **CDN caching:** Cloudflare cache headers
4. **Analytics:** Track most viewed stories
5. **Lazy loading:** GET /api/stories/:id/answer (reveal on demand)
6. **Performance monitoring:** Track p50/p95/p99 response times
7. **Rate limiting:** Prevent enumeration attacks

---

## Appendix: Przykładowe requesty

### Sukces (200 OK)
```bash
curl -X GET https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ..."
```

### Błąd walidacji - Invalid UUID (400)
```bash
curl -X GET https://mrocznehistorie.pl/api/stories/not-a-uuid \
  -H "Authorization: Bearer eyJ..."
```

### Brak autoryzacji (401)
```bash
curl -X GET https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000
```

### Not Found - Story doesn't exist (404)
```bash
curl -X GET https://mrocznehistorie.pl/api/stories/00000000-0000-4000-8000-000000000001 \
  -H "Authorization: Bearer eyJ..."
```

### Not Found - Different user's story (404)
```bash
# User A token trying to access User B's story
curl -X GET https://mrocznehistorie.pl/api/stories/<user-b-story-uuid> \
  -H "Authorization: Bearer $USER_A_TOKEN"

# Response: 404 (RLS blocked)
```