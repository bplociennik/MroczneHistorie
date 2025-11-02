# API Endpoint Implementation Plan: Create Story (POST /api/stories)

## 1. Przegląd punktu końcowego

Endpoint `POST /api/stories` odpowiada za zapisanie wygenerowanej historii do bazy danych PostgreSQL. Jest to drugi krok w typowym przepływie użytkownika: najpierw generuje historię przez `/api/stories/generate` (preview), następnie zapisuje ją przez ten endpoint.

**Kluczowe cechy:**

- Zapisuje historię do tabeli `public.stories`
- Automatyczne przypisanie do użytkownika przez RLS (auth.uid())
- Zwraca pełny obiekt StoryDTO z wygenerowanymi polami (id, created_at)
- Walidacja wszystkich pól przed zapisem

**Powiązane User Stories:**

- Epic 2, ID 2.3: "Jako użytkownik chcę zapisać wygenerowaną historię do mojej prywatnej kolekcji"
- Epic 3, ID 3.1: "Jako użytkownik chcę zobaczyć listę wszystkich moich zapisanych historii"

**Relacja z innymi endpoints:**

- **Poprzedza:** `POST /api/stories/generate` (generowanie treści)
- **Następuje:** `GET /api/stories` (wyświetlenie listy), `GET /api/stories/:id` (szczegóły)

---

## 2. Szczegóły żądania

### 2.1. Metoda HTTP

`POST`

### 2.2. Struktura URL

```
POST /api/stories
```

### 2.3. Nagłówki (Headers)

**Wymagane:**

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Opcjonalne:**

```
Accept: application/json
```

### 2.4. Parametry

**Parametry URL:**

- Brak

**Query Parameters:**

- Brak

**Request Body (JSON):**

| Pole         | Typ      | Wymagane | Ograniczenia                 | Opis                                     |
| ------------ | -------- | -------- | ---------------------------- | ---------------------------------------- |
| `subject`    | `string` | ✅ Tak   | Min: 1 znak, Max: 150 znaków | Temat historii (taki sam jak w generate) |
| `difficulty` | `number` | ✅ Tak   | Integer, zakres: 1-3         | Poziom trudności zagadki                 |
| `darkness`   | `number` | ✅ Tak   | Integer, zakres: 1-3         | Poziom mroczności                        |
| `question`   | `string` | ✅ Tak   | Min: 1 znak                  | Wygenerowane pytanie (zagadka)           |
| `answer`     | `string` | ✅ Tak   | Min: 1 znak                  | Wygenerowana odpowiedź (rozwiązanie)     |

**Przykładowe żądanie:**

```json
{
	"subject": "Tajemnicza latarnia morska",
	"difficulty": 2,
	"darkness": 3,
	"question": "Na szczycie latarni morskiej znaleziono martwego latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Co się stało?",
	"answer": "Latarnik zginął od uderzenia dużym soplem, który stopniał po upadku z sufitu. Morderca umieścił go tam zimą, wiedząc, że w końcu się stopi, a jako dowód zostanie jedynie woda."
}
```

### 2.5. Walidacja danych wejściowych

#### Subject Validation:

```typescript
// Reguły:
- typeof subject === 'string'
- subject.trim().length >= 1
- subject.trim().length <= 150

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Temat jest wymagany i musi zawierać od 1 do 150 znaków",
    "field": "subject"
  }
}
```

#### Difficulty Validation:

```typescript
// Reguły:
- typeof difficulty === 'number'
- Number.isInteger(difficulty)
- difficulty >= 1 && difficulty <= 3

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Poziom trudności musi być liczbą całkowitą od 1 do 3",
    "field": "difficulty"
  }
}
```

#### Darkness Validation:

```typescript
// Reguły:
- typeof darkness === 'number'
- Number.isInteger(darkness)
- darkness >= 1 && darkness <= 3

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Poziom mroczności musi być liczbą całkowitą od 1 do 3",
    "field": "darkness"
  }
}
```

#### Question Validation:

```typescript
// Reguły:
- typeof question === 'string'
- question.trim().length >= 1

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pytanie jest wymagane i nie może być puste",
    "field": "question"
  }
}
```

#### Answer Validation:

```typescript
// Reguły:
- typeof answer === 'string'
- answer.trim().length >= 1

// Błąd: 400 Bad Request
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Odpowiedź jest wymagana i nie może być pusta",
    "field": "answer"
  }
}
```

---

## 3. Wykorzystywane typy

### 3.1. Request DTO

```typescript
// src/types.ts (istniejący typ)
export type CreateStoryCommand = Pick<
	TablesInsert<'stories'>,
	'subject' | 'difficulty' | 'darkness' | 'question' | 'answer'
>;
```

**Struktura:**

```typescript
interface CreateStoryCommand {
	subject: string; // varchar(150)
	difficulty: number; // smallint (1-3)
	darkness: number; // smallint (1-3)
	question: string; // text
	answer: string; // text
}
```

### 3.2. Response DTO

```typescript
// src/types.ts (istniejący typ)
export type StoryDTO = Tables<'stories'>;
```

**Struktura:**

```typescript
interface StoryDTO {
	id: string; // uuid (generowane przez DB)
	user_id: string; // uuid (automatycznie z auth.uid())
	subject: string; // varchar(150)
	difficulty: number; // smallint (1-3)
	darkness: number; // smallint (1-3)
	question: string; // text
	answer: string; // text
	created_at: string; // timestamptz ISO 8601
}
```

### 3.3. Error DTO

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

### 3.4. Utility Types

```typescript
// src/types.ts (istniejące typy)
export type StoryDifficulty = 1 | 2 | 3;
export type StoryDarkness = 1 | 2 | 3;

export interface StoryParameters {
	difficulty: StoryDifficulty;
	darkness: StoryDarkness;
}
```

---

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (201 Created)

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

- `id`: UUID v4 wygenerowany przez PostgreSQL (gen_random_uuid())
- `user_id`: UUID użytkownika z auth.uid() (automatycznie przez RLS)
- `created_at`: Timestamp UTC w formacie ISO 8601
- Wszystkie inne pola są echem z request body

**HTTP Headers:**

```
HTTP/1.1 201 Created
Content-Type: application/json
Location: /api/stories/550e8400-e29b-41d4-a716-446655440000
```

**Uwaga:** Header `Location` wskazuje na nowo utworzony zasób (opcjonalny w MVP)

### 4.2. Błędy (4xx, 5xx)

#### 400 Bad Request - Błąd walidacji

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Pytanie jest wymagane i nie może być puste",
		"field": "question"
	}
}
```

**Możliwe komunikaty:**

- Subject: "Temat jest wymagany i musi zawierać od 1 do 150 znaków"
- Difficulty: "Poziom trudności musi być liczbą całkowitą od 1 do 3"
- Darkness: "Poziom mroczności musi być liczbą całkowitą od 1 do 3"
- Question: "Pytanie jest wymagane i nie może być puste"
- Answer: "Odpowiedź jest wymagana i nie może być pusta"
- Body: "Nieprawidłowy format JSON" (jeśli JSON malformed)

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
		"message": "Nie udało się zapisać historii. Spróbuj ponownie później"
	}
}
```

**Przyczyny:**

- INSERT query failed (database error)
- RLS policy blocked INSERT (nie powinno się zdarzyć)
- Foreign key violation (user nie istnieje - bardzo rzadkie)
- Unique constraint violation (duplicate UUID - ekstremalnie rzadkie)
- Database connection timeout
- Nieoczekiwany błąd serwera

---

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. POST /api/stories
       │    Authorization: Bearer <token>
       │    { subject, difficulty, darkness, question, answer }
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
│  Validation Service  │ ◄──── Validate all input fields
│  (lib/validation)    │
└──────┬───────────────┘
       │ 4. Input valid
       ▼
┌──────────────────────────────────────────┐
│  Supabase Database                       │
│  INSERT INTO public.stories              │
└──────┬───────────────────────────────────┘
       │ 5. RLS Check: auth.uid() = user_id
       ▼
┌──────────────────────┐
│  RLS Policy          │
│  stories_insert_own  │ ◄──── Enforce user isolation
└──────┬───────────────┘
       │ 6. RLS passed
       ▼
┌──────────────────────┐
│  PostgreSQL          │ ◄──── Execute INSERT
│  gen_random_uuid()   │       Generate ID, set timestamp
│  now()               │
└──────┬───────────────┘
       │ 7. Return inserted row (RETURNING *)
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │ ◄──── Format response
└──────┬───────────────────────────────────┘
       │ 8. 201 Created + StoryDTO
       ▼
┌─────────────┐
│   Client    │ ◄──── Redirect to /history or show success
└─────────────┘
```

### 5.2. Szczegółowy opis kroków

#### Krok 1: Client Request

- Frontend wysyła POST request z pełnymi danymi historii
- Typowo po wcześniejszym wygenerowaniu przez `/api/stories/generate`
- Dołącza JWT token w nagłówku `Authorization`

#### Krok 2-3: Authentication

- SvelteKit middleware (`src/hooks.server.ts`) weryfikuje JWT
- Supabase Auth waliduje token i zwraca user ID
- Jeśli token nieprawidłowy → 401 Unauthorized

#### Krok 4: Input Validation

- Validation Service sprawdza wszystkie 5 pól:
  - Subject: 1-150 znaków
  - Difficulty: integer 1-3
  - Darkness: integer 1-3
  - Question: min 1 znak
  - Answer: min 1 znak
- Jeśli walidacja niepoprawna → 400 Bad Request

#### Krok 5-6: Row Level Security Check

- PostgreSQL wykonuje RLS policy `stories_insert_own`
- Sprawdza czy `auth.uid() = user_id` (z JWT tokenu)
- **WAŻNE:** Klient NIE wysyła `user_id` - jest automatycznie ustawiane
- Jeśli RLS blokuje → 500 Internal Error (nie powinno się zdarzyć)

#### Krok 7: Database INSERT

- PostgreSQL generuje:
  - `id`: UUID v4 przez `gen_random_uuid()`
  - `user_id`: z `auth.uid()` (przez RLS)
  - `created_at`: przez `DEFAULT now()`
- Wykonuje INSERT z pozostałymi polami
- Zwraca pełny wiersz przez `RETURNING *`

#### Krok 8: Client Response

- API route formatuje odpowiedź jako `StoryDTO`
- Zwraca 201 Created z pełnym obiektem
- Frontend może przekierować do `/history` lub pokazać sukces

### 5.3. Interakcje z bazą danych

#### SQL Query (wykonywane przez Supabase SDK)

```sql
-- Supabase SDK generuje podobne zapytanie:
INSERT INTO public.stories (
  subject,
  difficulty,
  darkness,
  question,
  answer,
  user_id
)
VALUES (
  $1,  -- subject
  $2,  -- difficulty
  $3,  -- darkness
  $4,  -- question
  $5,  -- answer
  auth.uid()  -- automatycznie z JWT
)
RETURNING *;
```

**Wykorzystywane mechanizmy PostgreSQL:**

- `gen_random_uuid()` dla `id` (DEFAULT)
- `now()` dla `created_at` (DEFAULT)
- `auth.uid()` dla `user_id` (RLS context)
- Foreign key constraint: `user_id REFERENCES auth.users(id)`

#### Index Usage

- **Primary Key Index:** `stories_pkey` na `id` (automatyczny)
- **Composite Index:** `idx_stories_user_created` na `(user_id, created_at DESC)`
  - Używany przy kolejnych SELECT queries
  - Nie wpływa na INSERT performance (tylko rebuild index)

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

**Mechanizm:**

- JWT Bearer token verification przez Supabase Auth
- Token przechowywany w localStorage (frontend) lub HTTPOnly cookies
- Token wysyłany w każdym request jako `Authorization: Bearer <token>`

**Implementacja:**

```typescript
// src/hooks.server.ts (wspólny dla wszystkich endpoints)
export const handle: Handle = async ({ event, resolve }) => {
	const token = event.request.headers.get('authorization')?.split('Bearer ')[1];

	if (!token) {
		return new Response(
			JSON.stringify({
				error: {
					code: 'AUTHENTICATION_ERROR',
					message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
				}
			}),
			{ status: 401 }
		);
	}

	const {
		data: { user },
		error
	} = await event.locals.supabase.auth.getUser(token);

	if (error || !user) {
		return new Response(
			JSON.stringify({
				error: {
					code: 'AUTHENTICATION_ERROR',
					message: 'Brakujący lub nieprawidłowy token uwierzytelniający'
				}
			}),
			{ status: 401 }
		);
	}

	event.locals.user = user;
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

Polityka `stories_insert_own`:

```sql
CREATE POLICY stories_insert_own
ON public.stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

**Jak to działa:**

1. Klient NIE wysyła `user_id` w request body
2. Supabase SDK automatycznie używa `auth.uid()` z JWT context
3. RLS sprawdza czy `auth.uid() = user_id` (zawsze true jeśli poprawnie zaimplementowane)
4. INSERT dozwolony tylko jeśli warunek spełniony

**Security Guarantee:**

- Nawet jeśli klient próbuje wysłać `user_id` innego użytkownika, RLS zablokuje
- Zero Trust: Baza danych jest ostatecznym arbitrem bezpieczeństwa

**Implementacja w Supabase SDK:**

```typescript
// Supabase automatycznie wstrzykuje auth.uid()
const { data, error } = await locals.supabase
	.from('stories')
	.insert({
		subject: validated.subject,
		difficulty: validated.difficulty,
		darkness: validated.darkness,
		question: validated.question,
		answer: validated.answer
		// user_id jest automatycznie ustawiane przez RLS
	})
	.select()
	.single();
```

### 6.3. Walidacja i Sanityzacja Danych

#### XSS Prevention

**Zagrożenie:**
Złośliwy content w subject/question/answer:

```json
{
	"subject": "<script>alert('XSS')</script>",
	"question": "<img src=x onerror=alert('XSS')>",
	"answer": "Normal text"
}
```

**Mitigation:**

- Supabase SDK automatycznie escape'uje wszystkie wartości (parameterized queries)
- Frontend używa Svelte (auto-escaping w templates)
- Dodatkowa sanityzacja przy wyświetlaniu (DOMPurify jeśli potrzebne)

**WAŻNE:** W MVP nie sanitizujemy HTML bo:

1. Nie renderujemy jako HTML (tylko plain text)
2. Supabase chroni przed SQL injection
3. Svelte chroni przed XSS przy renderowaniu

#### SQL Injection Prevention

**Zagrożenie:**

```json
{
	"subject": "'; DROP TABLE stories; --"
}
```

**Mitigation:**

- Supabase SDK używa **parameterized queries**
- Nigdy nie konkatenujemy stringów do budowania SQL
- PostgreSQL type safety (varchar, text, integer)

#### Length Limits (DoS Prevention)

**Zagrożenie:**
Bardzo długie payloady mogące przeciążyć serwer:

```json
{
  "question": "A".repeat(1000000),  // 1MB string
  "answer": "B".repeat(10000000)    // 10MB string
}
```

**Mitigation:**

- Subject: Max 150 znaków (enforced w validation)
- Question/Answer: Brak limitu w MVP (typ `text`)
  - **Future:** Dodać max limit (np. 10,000 znaków)
  - **Future:** Rate limiting per user

**Request Size Limit (SvelteKit):**

```typescript
// svelte.config.js
export default {
	kit: {
		adapter: adapter(),
		csrf: {
			checkOrigin: true
		}
		// Future: Add max request body size
		// maxRequestBodySize: 1048576  // 1MB
	}
};
```

### 6.4. Foreign Key Integrity

**Constraint:**

```sql
user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

**Zabezpieczenie:**

- `user_id` musi istnieć w `auth.users`
- Jeśli nie istnieje → Foreign key violation → 500 Internal Error
- W praktyce nie powinno się zdarzyć (JWT verification zapewnia że user exists)

**ON DELETE CASCADE:**

- Jeśli użytkownik zostanie usunięty, wszystkie jego historie automatycznie znikają
- Zapewnia data integrity

### 6.5. CORS Configuration

**Dozwolone Origins:**

```typescript
// src/hooks.server.ts lub svelte.config.js
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
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
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

### 6.6. Audit Trail (Future Enhancement)

**Planned (Post-MVP):**

```sql
-- Log all story creations
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  action varchar(50) NOT NULL,  -- 'story_created', 'story_updated', etc.
  resource_id uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger on INSERT
CREATE TRIGGER audit_story_creation
AFTER INSERT ON public.stories
FOR EACH ROW
EXECUTE FUNCTION log_story_creation();
```

---

## 7. Obsługa błędów

### 7.1. Tabela błędów

| Error Code             | HTTP Status | Opis                         | User Message (PL)                                          | Retry Safe?          | Frontend Action                |
| ---------------------- | ----------- | ---------------------------- | ---------------------------------------------------------- | -------------------- | ------------------------------ |
| `VALIDATION_ERROR`     | 400         | Nieprawidłowe dane wejściowe | Pole-specific message                                      | ✅ Tak (po poprawie) | Show error under field         |
| `AUTHENTICATION_ERROR` | 401         | Brak lub nieprawidłowy token | "Brakujący lub nieprawidłowy token uwierzytelniający"      | ❌ Nie (wyloguj)     | Redirect to /login             |
| `INTERNAL_ERROR`       | 500         | Błąd bazy danych             | "Nie udało się zapisać historii. Spróbuj ponownie później" | ✅ Tak               | Show error toast, enable retry |

### 7.2. Szczegółowa obsługa błędów

#### 7.2.1. VALIDATION_ERROR (400)

**Scenariusze:**

**Subject Validation:**

```typescript
// Test cases:
"" → VALIDATION_ERROR (empty)
"   " → VALIDATION_ERROR (whitespace only, after trim)
"a".repeat(151) → VALIDATION_ERROR (too long)
null → VALIDATION_ERROR (missing)
undefined → VALIDATION_ERROR (missing)
123 → VALIDATION_ERROR (not string)

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Temat jest wymagany i musi zawierać od 1 do 150 znaków",
    "field": "subject"
  }
}
```

**Difficulty Validation:**

```typescript
// Test cases:
0 → VALIDATION_ERROR (out of range)
4 → VALIDATION_ERROR (out of range)
1.5 → VALIDATION_ERROR (not integer)
"2" → VALIDATION_ERROR (not number)
null → VALIDATION_ERROR (missing)

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Poziom trudności musi być liczbą całkowitą od 1 do 3",
    "field": "difficulty"
  }
}
```

**Darkness Validation:**

```typescript
// Test cases:
0 → VALIDATION_ERROR (out of range)
4 → VALIDATION_ERROR (out of range)
2.7 → VALIDATION_ERROR (not integer)
"3" → VALIDATION_ERROR (not number)
null → VALIDATION_ERROR (missing)

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Poziom mroczności musi być liczbą całkowitą od 1 do 3",
    "field": "darkness"
  }
}
```

**Question Validation:**

```typescript
// Test cases:
"" → VALIDATION_ERROR (empty)
"   " → VALIDATION_ERROR (whitespace only, after trim)
null → VALIDATION_ERROR (missing)
undefined → VALIDATION_ERROR (missing)
123 → VALIDATION_ERROR (not string)

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pytanie jest wymagane i nie może być puste",
    "field": "question"
  }
}
```

**Answer Validation:**

```typescript
// Test cases:
"" → VALIDATION_ERROR (empty)
"   " → VALIDATION_ERROR (whitespace only, after trim)
null → VALIDATION_ERROR (missing)
undefined → VALIDATION_ERROR (missing)
123 → VALIDATION_ERROR (not string)

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Odpowiedź jest wymagana i nie może być pusta",
    "field": "answer"
  }
}
```

**JSON Parse Error:**

```typescript
// Request body is malformed JSON
POST /api/stories
{ invalid json }

// Response:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Nieprawidłowy format JSON"
  }
}
```

**Frontend Action:**

- Wyświetl błąd pod odpowiednim polem formularza
- Zaznacz pole na czerwono
- Fokus na pierwszym błędnym polu
- Nie retry automatycznie (czekaj na poprawkę użytkownika)

#### 7.2.2. AUTHENTICATION_ERROR (401)

**Scenariusze:**

- Brak nagłówka `Authorization`
- Token w złym formacie (nie "Bearer <token>")
- Token wygasł
- Token nieprawidłowy (manipulowany)
- Użytkownik został wylogowany

**Response Example:**

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
- Zapisz intent (redirect back po zalogowaniu)

#### 7.2.3. INTERNAL_ERROR (500)

**Scenariusze:**

**Database INSERT Error:**

```typescript
// Supabase INSERT failed
const { data, error } = await locals.supabase
	.from('stories')
	.insert(validatedData)
	.select()
	.single();

if (error) {
	console.error('[DB_ERROR] INSERT failed', {
		code: error.code,
		message: error.message,
		details: error.details,
		hint: error.hint,
		userId: locals.user.id,
		timestamp: new Date().toISOString()
	});

	throw new InternalError('Database INSERT failed');
}
```

**RLS Policy Blocked (nie powinno się zdarzyć):**

```typescript
// RLS blocked INSERT - indicates implementation bug
if (error.code === '42501') {
	// insufficient_privilege
	console.error('[RLS_ERROR] RLS policy blocked INSERT', {
		userId: locals.user.id,
		error: error
	});

	// This should NEVER happen in production
	// If it does, it's a critical bug
	throw new InternalError('Authorization failed');
}
```

**Foreign Key Violation:**

```typescript
// User doesn't exist (very rare - JWT verification should prevent this)
if (error.code === '23503') {
	// foreign_key_violation
	console.error('[FK_ERROR] User does not exist', {
		userId: locals.user.id,
		error: error
	});

	throw new InternalError('User not found');
}
```

**Unique Constraint Violation:**

```typescript
// UUID collision (astronomically rare - 1 in 10^36)
if (error.code === '23505') {
	// unique_violation
	console.error('[UUID_COLLISION] Duplicate UUID generated', {
		error: error
	});

	throw new InternalError('UUID collision - retry');
}
```

**Database Timeout:**

```typescript
// Connection timeout or slow query
if (error.code === '57014') {
	// query_canceled
	console.error('[TIMEOUT] Database query timeout', {
		userId: locals.user.id,
		error: error
	});

	throw new InternalError('Database timeout');
}
```

**Response Example:**

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Nie udało się zapisać historii. Spróbuj ponownie później"
	}
}
```

**Frontend Action:**

- Pokaż error toast z generic message
- Włącz przycisk "Spróbuj ponownie"
- Zachowaj dane w formularzu (nie czyść)
- Opcjonalnie: Auto-retry raz po 2s

**Logging:**

```typescript
console.error('[API_ERROR] POST /api/stories', {
	error: error.message,
	stack: error.stack,
	userId: locals.user.id,
	request: {
		subject: validated.subject.substring(0, 50), // First 50 chars only
		difficulty: validated.difficulty,
		darkness: validated.darkness,
		questionLength: validated.question.length,
		answerLength: validated.answer.length
	},
	timestamp: new Date().toISOString()
});
```

### 7.3. Error Handling Flow Diagram

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
    │ Parse JSON   │
    └────┬────┬────┘
         │    │
    OK   │    │ FAIL
         │    └─────► 400 VALIDATION_ERROR (JSON malformed)
         ▼
    ┌──────────────┐
    │ Validate     │
    │ All Fields   │
    └────┬────┬────┘
         │    │
    OK   │    │ FAIL (subject/difficulty/darkness/question/answer)
         │    └─────► 400 VALIDATION_ERROR
         ▼
    ┌──────────────┐
    │ INSERT       │
    │ Into DB      │
    └────┬────┬────┬─────┬─────┐
         │    │    │     │     │
    OK   │    │    │     │     │
         │    │    │     │     │
         │  RLS  FK   UUID  Timeout
         │  Block Viol. Coll.
         │    │    │     │     │
         │    ▼    ▼     ▼     ▼
         │   500  500   500   500
         │   INTERNAL_ERROR
         ▼
    ┌──────────────┐
    │ Return 201   │
    │ + StoryDTO   │
    └──────────────┘
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła (Bottlenecks)

#### 8.1.1. Database INSERT Latency

**Problem:**

- Single INSERT operation
- Index rebuild (primary key + composite index)
- RLS policy evaluation
- Foreign key constraint check

**Wpływ:**

- ~50-300ms response time (target: <300ms)
- Bottleneck przy bardzo wysokim traffic (>100 INSERTs/second)

**Mitigation (MVP):**

- Wykorzystaj connection pooling (Supabase PgBouncer)
- Minimal indexes (tylko necessary)

**Future optimization:**

- Batch INSERT (jeśli user chce zapisać wiele historii naraz)
- Async INSERT + immediate return (optimistic UI)
- Caching generated IDs

#### 8.1.2. RLS Policy Evaluation

**Problem:**

- PostgreSQL musi sprawdzić `auth.uid() = user_id` dla każdego INSERT
- JWT parsing przy każdym request

**Wpływ:**

- +10-50ms latency per request

**Mitigation:**

- RLS policy jest bardzo prosta (single equality check)
- PostgreSQL cache'uje execution plan

**Future optimization:**

- Server-side session caching (Redis)
- JWT verification cache (5 min TTL)

#### 8.1.3. JSON Parsing

**Problem:**

- Request body może być duże (question/answer mogą być długie)
- JSON.parse() blokuje event loop

**Wpływ:**

- Minimalny w MVP (payload < 10KB typowo)
- Potencjalny problem jeśli question/answer > 100KB

**Mitigation (Future):**

- Limit request body size (1MB)
- Streaming JSON parser dla bardzo dużych payloads

#### 8.1.4. Validation Overhead

**Problem:**

- Zod validation dla 5 pól
- Regex checks, type coercion

**Wpływ:**

- <10ms typowo
- Minimalny overhead

**Mitigation:**

- Zod jest bardzo szybki
- Compile Zod schemas raz (nie przy każdym request)

### 8.2. Strategie optymalizacji

#### 8.2.1. Database Optimization

**Connection Pooling:**

```typescript
// Supabase automatycznie używa PgBouncer
// Transaction mode (optimal dla krótkich queries)
// Pool size: 15 connections (default)
```

**Index Strategy:**

```sql
-- Only necessary indexes
CREATE INDEX idx_stories_user_created
ON public.stories (user_id, created_at DESC);

-- Primary key (automatic)
-- stories_pkey ON (id)

-- NO additional indexes in MVP
-- Future: Full-text search index on question/answer
```

**Query Optimization:**

```typescript
// Use .select() to specify exact columns
// Use .single() for single row (avoids array wrapping)
const { data, error } = await locals.supabase
	.from('stories')
	.insert(validatedData)
	.select('*') // Could optimize to select only needed fields
	.single();
```

#### 8.2.2. Response Optimization

**Minimize Response Size:**

```typescript
// Return exactly what's needed (StoryDTO)
// Don't include unnecessary metadata in MVP

// Future: Support for sparse fieldsets
// GET /api/stories?fields=id,subject,created_at
```

**Compression:**

```typescript
// Enable gzip compression (Cloudflare Pages automatic)
// Reduces response size by ~70% for text content
```

#### 8.2.3. Caching Strategy (Future)

**Client-Side Caching:**

```typescript
// After successful creation, update local cache
// Avoid refetching full list
import { storiesStore } from '$lib/stores/stories';

// On success:
storiesStore.add(newStory); // Optimistic update
```

**Server-Side Caching:**

```typescript
// No server-side caching for mutations (CREATE/UPDATE/DELETE)
// Only cache GET requests (future)
```

#### 8.2.4. Optimistic UI (Future)

**Immediate Feedback:**

```typescript
// Frontend: Add story to list immediately
// Show loading state
// If INSERT fails, rollback and show error

async function createStory(data: CreateStoryCommand) {
	// Optimistically add to UI
	const tempId = crypto.randomUUID();
	const optimisticStory = {
		...data,
		id: tempId,
		user_id: currentUser.id,
		created_at: new Date().toISOString()
	};

	storiesStore.add(optimisticStory);

	try {
		const response = await fetch('/api/stories', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(data)
		});

		if (!response.ok) {
			throw new Error('Failed to create story');
		}

		const realStory = await response.json();

		// Replace optimistic with real
		storiesStore.replace(tempId, realStory);
	} catch (error) {
		// Rollback optimistic update
		storiesStore.remove(tempId);
		throw error;
	}
}
```

### 8.3. Performance Targets

| Metric                    | Target (MVP) | Target (Post-MVP) |
| ------------------------- | ------------ | ----------------- |
| API Response Time (p50)   | < 200ms      | < 150ms           |
| API Response Time (p95)   | < 300ms      | < 250ms           |
| API Response Time (p99)   | < 500ms      | < 400ms           |
| Error Rate (5xx)          | < 1%         | < 0.1%            |
| Database Query Time       | < 100ms      | < 50ms            |
| Validation Time           | < 10ms       | < 5ms             |
| Throughput (requests/sec) | 50           | 200               |

### 8.4. Load Testing Plan

**Scenarios:**

1. **Baseline:** 10 concurrent users, 1 story creation per minute each
2. **Normal Load:** 50 concurrent users, 5 creations per minute each
3. **Peak Load:** 100 concurrent users, 10 creations per minute each
4. **Stress Test:** 500 concurrent users, burst of creations

**Tools:**

- k6 for load testing
- Grafana for monitoring
- Supabase Dashboard for database metrics

**Metrics to Monitor:**

- Response time distribution (p50, p95, p99)
- Error rate by status code
- Database connection pool utilization
- INSERT query duration
- RLS policy evaluation time

**Sample k6 Script:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{ duration: '2m', target: 10 }, // Ramp-up to 10 users
		{ duration: '5m', target: 50 }, // Normal load
		{ duration: '2m', target: 100 }, // Peak load
		{ duration: '5m', target: 0 } // Ramp-down
	]
};

export default function () {
	const token = __ENV.AUTH_TOKEN;

	const payload = JSON.stringify({
		subject: 'Test Story',
		difficulty: 2,
		darkness: 2,
		question: 'This is a test question for load testing.',
		answer: 'This is a test answer for load testing.'
	});

	const params = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	};

	const res = http.post('https://mrocznehistorie.pl/api/stories', payload, params);

	check(res, {
		'status is 201': (r) => r.status === 201,
		'response time < 300ms': (r) => r.timings.duration < 300,
		'has id': (r) => JSON.parse(r.body).id !== undefined
	});

	sleep(1); // 1 creation per second per VU
}
```

---

## 9. Etapy wdrożenia

### Krok 1: Walidacja typu istnieje już

**Sprawdź czy walidacja z generate endpoint może być reużyta:**

Plik: `src/lib/validation/story.validation.ts`

```typescript
// Już powinno istnieć z generate endpoint:
export const GenerateStorySchema = z.object({
	subject: z.string().min(1).max(150).trim(),
	difficulty: z.number().int().min(1).max(3),
	darkness: z.number().int().min(1).max(3)
});

// Dodaj nowy schema dla create:
export const CreateStorySchema = GenerateStorySchema.extend({
	question: z.string().min(1, 'Pytanie jest wymagane i nie może być puste').trim(),

	answer: z.string().min(1, 'Odpowiedź jest wymagana i nie może być pusta').trim()
});

export type ValidatedCreateStoryCommand = z.infer<typeof CreateStorySchema>;
```

**Deliverable:**

- ✅ `CreateStorySchema` dodany do `story.validation.ts`
- ✅ Reużycie `GenerateStorySchema` (DRY principle)
- ✅ Type inference z Zod

---

### Krok 2: Utworzenie SvelteKit API Route

**Utworzyć:** `src/routes/api/stories/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { CreateStorySchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import type { ErrorDTO, StoryDTO } from '$lib/types';

export const POST: RequestHandler = async ({ request, locals }) => {
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

	// 2. Parse request body
	let body: unknown;
	try {
		body = await request.json();
	} catch (error) {
		return json<ErrorDTO>(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Nieprawidłowy format JSON'
				}
			},
			{ status: 400 }
		);
	}

	// 3. Validate input
	const validation = CreateStorySchema.safeParse(body);
	if (!validation.success) {
		return json<ErrorDTO>(formatValidationError(validation.error), { status: 400 });
	}

	const { subject, difficulty, darkness, question, answer } = validation.data;

	// 4. Insert story into database
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.insert({
				subject,
				difficulty,
				darkness,
				question,
				answer
				// user_id is automatically set by RLS (auth.uid())
			})
			.select()
			.single();

		if (error) {
			console.error('[DB_ERROR] INSERT failed', {
				code: error.code,
				message: error.message,
				details: error.details,
				hint: error.hint,
				userId: locals.user.id,
				timestamp: new Date().toISOString()
			});

			// Handle specific error codes
			if (error.code === '42501') {
				// RLS policy blocked (should never happen)
				console.error('[CRITICAL] RLS policy blocked INSERT for authenticated user');
			}

			return json<ErrorDTO>(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się zapisać historii. Spróbuj ponownie później'
					}
				},
				{ status: 500 }
			);
		}

		// 5. Return created story
		return json<StoryDTO>(data, {
			status: 201,
			headers: {
				Location: `/api/stories/${data.id}`
			}
		});
	} catch (error: any) {
		// 6. Handle unexpected errors
		console.error('[API_ERROR] POST /api/stories', {
			error: error.message,
			stack: error.stack,
			userId: locals.user.id,
			request: {
				subject: subject.substring(0, 50),
				difficulty,
				darkness,
				questionLength: question.length,
				answerLength: answer.length
			},
			timestamp: new Date().toISOString()
		});

		return json<ErrorDTO>(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się zapisać historii. Spróbuj ponownie później'
				}
			},
			{ status: 500 }
		);
	}
};
```

**Deliverable:**

- ✅ API route fully implemented
- ✅ All error scenarios handled
- ✅ Logging for debugging
- ✅ 201 Created response with Location header

---

### Krok 3: Testowanie manualne

**3.1. Happy Path Test**

```bash
# 1. Get auth token first (manual login or test account)
TOKEN="eyJ..."

# 2. Create story
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test Story",
    "difficulty": 2,
    "darkness": 2,
    "question": "This is a test question.",
    "answer": "This is a test answer."
  }'

# Expected: 201 Created
# Response should include id, user_id, created_at
```

**3.2. Validation Error Tests**

```bash
# Empty subject
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'

# Expected: 400 Bad Request
# Error: "Temat jest wymagany..."

# Subject too long
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "'$(printf 'a%.0s' {1..151})'",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'

# Expected: 400 Bad Request

# Invalid difficulty
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 5,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'

# Expected: 400 Bad Request

# Missing question
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 2,
    "darkness": 2,
    "answer": "Answer"
  }'

# Expected: 400 Bad Request

# Malformed JSON
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ invalid json }'

# Expected: 400 Bad Request
# Error: "Nieprawidłowy format JSON"
```

**3.3. Authentication Error Tests**

```bash
# No token
curl -X POST https://localhost:5173/api/stories \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'

# Expected: 401 Unauthorized

# Invalid token
curl -X POST https://localhost:5173/api/stories \
  -H "Authorization: Bearer invalid_token" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'

# Expected: 401 Unauthorized
```

**3.4. Database Verification**

```sql
-- Verify story was created
SELECT * FROM public.stories
WHERE user_id = '<your_user_id>'
ORDER BY created_at DESC
LIMIT 1;

-- Check all fields
-- Verify user_id matches authenticated user
-- Verify created_at is recent
```

**Deliverable:**

- ✅ All happy path tests passing
- ✅ All validation tests returning correct errors
- ✅ All auth tests returning 401
- ✅ Database records verified

---

### Krok 4: Testowanie RLS (Row Level Security)

**4.1. Verify RLS Policy**

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'stories';

-- Should return: rowsecurity = true

-- Check INSERT policy
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'stories' AND cmd = 'INSERT';

-- Should return: stories_insert_own with WITH CHECK (auth.uid() = user_id)
```

**4.2. Test RLS Enforcement (via SQL)**

```sql
-- Set user context
SET request.jwt.claim.sub = '<user_uuid>';

-- Try to insert story
INSERT INTO public.stories (subject, difficulty, darkness, question, answer, user_id)
VALUES ('Test', 2, 2, 'Question', 'Answer', auth.uid())
RETURNING *;

-- Should succeed

-- Try to insert for different user (should fail but RLS will override)
INSERT INTO public.stories (subject, difficulty, darkness, question, answer, user_id)
VALUES ('Test', 2, 2, 'Question', 'Answer', '<different_user_uuid>')
RETURNING *;

-- Should fail or RLS should override user_id to auth.uid()
```

**Deliverable:**

- ✅ RLS enabled on `public.stories`
- ✅ `stories_insert_own` policy active
- ✅ Cannot insert for different user

---

### Krok 5: Frontend Integration

**5.1. Create API Client Function**

Utworzyć: `src/lib/api/stories.ts`

```typescript
import type { CreateStoryCommand, StoryDTO, ErrorDTO } from '$lib/types';

export async function createStory(command: CreateStoryCommand, token: string): Promise<StoryDTO> {
	const response = await fetch('/api/stories', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(command)
	});

	if (!response.ok) {
		const error: ErrorDTO = await response.json();
		throw new Error(error.error.message);
	}

	return response.json();
}
```

**5.2. Use in Svelte Component**

```svelte
<script lang="ts">
	import { createStory } from '$lib/api/stories';
	import { getSupabase } from '$lib/supabase';
	import { goto } from '$app/navigation';

	let subject = '';
	let difficulty = 2;
	let darkness = 2;
	let question = '';
	let answer = '';

	let loading = false;
	let error = '';

	async function handleSubmit() {
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

			const story = await createStory(
				{ subject, difficulty, darkness, question, answer },
				session.access_token
			);

			// Redirect to story list or show success
			goto('/history');
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<input bind:value={subject} placeholder="Temat" required />
	<select bind:value={difficulty}>
		<option value={1}>Łatwa</option>
		<option value={2}>Średnia</option>
		<option value={3}>Trudna</option>
	</select>
	<select bind:value={darkness}>
		<option value={1}>Tajemnica</option>
		<option value={2}>Niepokojąca</option>
		<option value={3}>Brutalna</option>
	</select>
	<textarea bind:value={question} placeholder="Pytanie" required />
	<textarea bind:value={answer} placeholder="Odpowiedź" required />

	{#if error}
		<p class="error">{error}</p>
	{/if}

	<button type="submit" disabled={loading}>
		{loading ? 'Zapisywanie...' : 'Zapisz historię'}
	</button>
</form>
```

**Deliverable:**

- ✅ API client function created
- ✅ Component integrated
- ✅ Error handling implemented
- ✅ Loading states

---

### Krok 6: E2E Testing (Playwright)

**Utworzyć:** `tests/api/stories/create.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('POST /api/stories', () => {
	let authToken: string;

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
	});

	test('should create story with valid data', async ({ request }) => {
		const response = await request.post('/api/stories', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				subject: 'E2E Test Story',
				difficulty: 2,
				darkness: 2,
				question: 'This is an E2E test question.',
				answer: 'This is an E2E test answer.'
			}
		});

		expect(response.status()).toBe(201);

		const data = await response.json();
		expect(data).toHaveProperty('id');
		expect(data).toHaveProperty('user_id');
		expect(data).toHaveProperty('created_at');
		expect(data.subject).toBe('E2E Test Story');
		expect(data.difficulty).toBe(2);
		expect(data.darkness).toBe(2);
	});

	test('should return 400 for empty subject', async ({ request }) => {
		const response = await request.post('/api/stories', {
			headers: {
				Authorization: `Bearer ${authToken}`
			},
			data: {
				subject: '',
				difficulty: 2,
				darkness: 2,
				question: 'Question',
				answer: 'Answer'
			}
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.field).toBe('subject');
	});

	test('should return 401 without auth token', async ({ request }) => {
		const response = await request.post('/api/stories', {
			data: {
				subject: 'Test',
				difficulty: 2,
				darkness: 2,
				question: 'Question',
				answer: 'Answer'
			}
		});

		expect(response.status()).toBe(401);

		const data = await response.json();
		expect(data.error.code).toBe('AUTHENTICATION_ERROR');
	});
});
```

**Run tests:**

```bash
npx playwright test tests/api/stories/create.spec.ts
```

**Deliverable:**

- ✅ E2E tests written
- ✅ All tests passing
- ✅ Happy path covered
- ✅ Error scenarios covered

---

### Krok 7: Dokumentacja

**7.1. Update API Documentation**

Edytować: `docs/api/stories.md`

````markdown
# Stories API

## POST /api/stories

Create and save a story to the database.

### Authentication

Required: Bearer token

### Request

```json
{
	"subject": "Tajemnicza latarnia morska",
	"difficulty": 2,
	"darkness": 3,
	"question": "Na szczycie latarni morskiej...",
	"answer": "Latarnik zginął od uderzenia..."
}
```
````

### Response (201 Created)

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

- 400: Validation error (invalid input)
- 401: Authentication error (no/invalid token)
- 500: Internal error (database failure)

See full documentation in `.ai/view-implementation-plans/create-story-endpoint.md`

````

**7.2. Code Comments**

```typescript
/**
 * Create Story API Endpoint
 *
 * @route POST /api/stories
 * @auth Required (JWT Bearer token)
 *
 * @param {CreateStoryCommand} body - Story data to save
 * @returns {StoryDTO} Created story with generated id and timestamp
 *
 * @throws {400} VALIDATION_ERROR - Invalid input parameters
 * @throws {401} AUTHENTICATION_ERROR - Missing or invalid token
 * @throws {500} INTERNAL_ERROR - Database error
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  // ...
};
````

**Deliverable:**

- ✅ API documentation updated
- ✅ Code comments added
- ✅ Implementation plan saved

---

### Krok 8: Deployment

**8.1. Deployment Checklist**

- ✅ Environment variables set in Cloudflare Pages
- ✅ Database migration applied (table + RLS policies already exist)
- ✅ Build succeeds locally (`npm run build`)
- ✅ All tests passing
- ✅ Manual testing on staging
- ✅ Deploy to production
- ✅ Smoke test on production

**8.2. Post-Deployment Verification**

```bash
# 1. Create story via production API
curl -X POST https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Production Test",
    "difficulty": 2,
    "darkness": 2,
    "question": "Production test question",
    "answer": "Production test answer"
  }'

# 2. Verify in database
# Check Supabase Dashboard → Table Editor → stories

# 3. Verify via GET endpoint
curl https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer $PROD_TOKEN"
```

**8.3. Monitoring Setup (Optional in MVP)**

```typescript
// Future: Add monitoring
import * as Sentry from '@sentry/sveltekit';

// In API route:
try {
	// ... INSERT logic
} catch (error) {
	Sentry.captureException(error, {
		tags: { endpoint: '/api/stories' },
		extra: { userId, subject, difficulty, darkness }
	});

	throw error;
}
```

**Deliverable:**

- ✅ Deployed to production
- ✅ Smoke tests passed
- ✅ Monitoring configured (optional)

---

## 10. Podsumowanie implementacji

### 10.1. Główne komponenty

| Komponent       | Lokalizacja                              | Odpowiedzialność               |
| --------------- | ---------------------------------------- | ------------------------------ |
| API Route       | `src/routes/api/stories/+server.ts`      | POST handler, orchestration    |
| Validation      | `src/lib/validation/story.validation.ts` | CreateStorySchema (Zod)        |
| Types           | `src/types.ts`                           | CreateStoryCommand, StoryDTO   |
| Auth Middleware | `src/hooks.server.ts`                    | Global authentication (reused) |
| API Client      | `src/lib/api/stories.ts`                 | Frontend integration           |

### 10.2. Kluczowe decyzje projektowe

1. **Zod dla walidacji** - Reużycie GenerateStorySchema + extend dla question/answer
2. **Bezpośredni INSERT przez Supabase SDK** - Brak dodatkowej warstwy service w MVP
3. **RLS automatycznie ustawia user_id** - Klient nie wysyła tego pola
4. **201 Created response** - Zgodnie z REST best practices
5. **Location header** - Wskazuje na nowo utworzony zasób
6. **Generic error messages** - Nie ujawniamy szczegółów implementacji

### 10.3. Znane ograniczenia MVP

- ❌ Brak rate limiting per-user
- ❌ Brak request body size limit (może być DoS vector)
- ❌ Brak dedykowanej service layer (bezpośredni dostęp do DB w route)
- ❌ Brak optimistic UI
- ❌ Brak batch creation

### 10.4. Następne kroki (Post-MVP)

1. Request body size limit (1MB)
2. Rate limiting (10 creations/hour per user)
3. StoryService layer dla lepszej separacji concerns
4. Optimistic UI w frontend
5. Batch creation endpoint (`POST /api/stories/batch`)
6. Audit logging (kto, kiedy, co utworzył)
7. Soft delete zamiast hard delete (future DELETE endpoint)

---

## Appendix: Przykładowe requesty

### Sukces (201 Created)

```bash
curl -X POST https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Tajemnicza latarnia morska",
    "difficulty": 2,
    "darkness": 3,
    "question": "Na szczycie latarni morskiej znaleziono martwego latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Co się stało?",
    "answer": "Latarnik zginął od uderzenia dużym soplem, który stopniał po upadku z sufitu. Morderca umieścił go tam zimą, wiedząc, że w końcu się stopi, a jako dowód zostanie jedynie woda."
  }'
```

### Błąd walidacji (400) - Subject too long

```bash
curl -X POST https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "'$(printf 'a%.0s' {1..151})'",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'
```

### Błąd walidacji (400) - Missing question

```bash
curl -X POST https://mrocznehistorie.pl/api/stories \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 2,
    "darkness": 2,
    "answer": "Answer"
  }'
```

### Brak autoryzacji (401)

```bash
curl -X POST https://mrocznehistorie.pl/api/stories \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Test",
    "difficulty": 2,
    "darkness": 2,
    "question": "Question",
    "answer": "Answer"
  }'
```
