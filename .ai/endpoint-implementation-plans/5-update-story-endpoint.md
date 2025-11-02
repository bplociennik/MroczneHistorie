# API Endpoint Implementation Plan: Update Story (PATCH /api/stories/:id)

## 1. Przegląd punktu końcowego

Endpoint `PATCH /api/stories/:id` odpowiada za aktualizację treści istniejącej historii. Użytkownik może edytować **tylko** pole `question` (zagadka) i/lub `answer` (rozwiązanie). Wszystkie inne pola są read-only i nie mogą być modyfikowane.

**Kluczowe cechy:**

- Aktualizacja question i/lub answer w tabeli `public.stories`
- RLS automatycznie filtruje po user_id (user edytuje tylko swoje historie)
- Read-only fields: subject, difficulty, darkness, user_id, created_at
- Co najmniej jedno pole (question OR answer) musi być podane
- Zwraca pełny zaktualizowany obiekt StoryDTO

**Powiązane User Stories:**

- Epic 3, ID 3.8: "Jako użytkownik chcę edytować treść pytania (zagadki) w zapisanej historii"
- Epic 3, ID 3.9: "Jako użytkownik chcę edytować treść odpowiedzi (rozwiązania) w zapisanej historii"
- Epic 3, ID 3.10: "Jako użytkownik chcę zapisać edytowaną historię"

**Relacja z innymi endpoints:**

- **Poprzedza:** `GET /api/stories/:id` (szczegóły historii, formularz edycji)
- **Następuje:** `GET /api/stories/:id` (ponowne wyświetlenie szczegółów)

---

## 2. Szczegóły żądania

### 2.1. Metoda HTTP

`PATCH`

### 2.2. Struktura URL

```
PATCH /api/stories/:id
```

**Przykłady:**

```
PATCH /api/stories/550e8400-e29b-41d4-a716-446655440000
PATCH /api/stories/a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d
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

**URL Parameters:**

| Parametr | Typ      | Wymagany | Format  | Opis                            |
| -------- | -------- | -------- | ------- | ------------------------------- |
| `id`     | `string` | ✅ Tak   | UUID v4 | Unikalny identyfikator historii |

**Request Body (JSON):**

| Pole       | Typ      | Wymagany | Ograniczenia             | Opis                                          |
| ---------- | -------- | -------- | ------------------------ | --------------------------------------------- |
| `question` | `string` | ❌ Nie\* | Min: 1 znak (after trim) | Zaktualizowana treść pytania (zagadki)        |
| `answer`   | `string` | ❌ Nie\* | Min: 1 znak (after trim) | Zaktualizowana treść odpowiedzi (rozwiązania) |

**\*WAŻNE:** Co najmniej **jedno pole** (`question` OR `answer`) MUSI być podane. Jeśli żadne pole nie jest podane → 400 Bad Request.

**Read-only Fields (REJECTED if included):**

- `subject` → 400 Bad Request: "Pole 'subject' jest tylko do odczytu i nie może być aktualizowane"
- `difficulty` → 400 Bad Request: "Pole 'difficulty' jest tylko do odczytu i nie może być aktualizowane"
- `darkness` → 400 Bad Request: "Pole 'darkness' jest tylko do odczytu i nie może być aktualizowane"
- `user_id` → 400 Bad Request: "Pole 'user_id' jest tylko do odczytu i nie może być aktualizowane"
- `created_at` → 400 Bad Request: "Pole 'created_at' jest tylko do odczytu i nie może być aktualizowane"

**Przykładowe żądania:**

**Update both question and answer:**

```json
{
	"question": "Zaktualizowano tekst pytania. Nowe szczegóły zostały dodane.",
	"answer": "Zaktualizowano tekst odpowiedzi z bardziej szczegółowym wyjaśnieniem."
}
```

**Update only question:**

```json
{
	"question": "Zaktualizowano tylko pytanie, odpowiedź pozostaje bez zmian."
}
```

**Update only answer:**

```json
{
	"answer": "Zaktualizowano tylko odpowiedź, pytanie pozostaje bez zmian."
}
```

### 2.5. Walidacja danych wejściowych

#### UUID Format Validation:

```typescript
// Użyj isValidUUID() z types.ts (jak w GET /:id)
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

#### Read-only Fields Check:

```typescript
const readOnlyFields = ['subject', 'difficulty', 'darkness', 'user_id', 'created_at'];
const bodyKeys = Object.keys(body);

for (const field of bodyKeys) {
	if (readOnlyFields.includes(field)) {
		return json<ErrorDTO>(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: `Pole '${field}' jest tylko do odczytu i nie może być aktualizowane`,
					field
				}
			},
			{ status: 400 }
		);
	}
}
```

#### At Least One Field Required:

```typescript
// After Zod validation
if (!validation.data.question && !validation.data.answer) {
	return json<ErrorDTO>(
		{
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)'
			}
		},
		{ status: 400 }
	);
}

// Alternatively, use isValidUpdateStoryCommand() from types.ts
if (!isValidUpdateStoryCommand(validation.data)) {
	return json<ErrorDTO>(
		{
			error: {
				code: 'VALIDATION_ERROR',
				message: 'Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)'
			}
		},
		{ status: 400 }
	);
}
```

#### Question/Answer Validation:

```typescript
// Zod schema
const UpdateStorySchema = z.object({
	question: z.string().min(1, 'Pytanie nie może być puste').trim().optional(),

	answer: z.string().min(1, 'Odpowiedź nie może być pusta').trim().optional()
});
```

---

## 3. Wykorzystywane typy

### 3.1. Request DTO

```typescript
// src/types.ts (istniejący typ)
export type UpdateStoryCommand = Pick<TablesUpdate<'stories'>, 'question' | 'answer'>;

// Struktura:
interface UpdateStoryCommand {
	question?: string; // optional, min 1 char if provided
	answer?: string; // optional, min 1 char if provided
}
```

### 3.2. Response DTO

```typescript
// src/types.ts (istniejący typ)
export type StoryDTO = Tables<'stories'>;

// Rozwinięcie:
interface StoryDTO {
	id: string; // uuid (unchanged)
	user_id: string; // uuid (unchanged)
	subject: string; // varchar(150) (READ-ONLY - unchanged)
	difficulty: number; // smallint (1-3) (READ-ONLY - unchanged)
	darkness: number; // smallint (1-3) (READ-ONLY - unchanged)
	question: string; // text (UPDATED)
	answer: string; // text (UPDATED)
	created_at: string; // timestamptz ISO 8601 (unchanged)
}
```

### 3.3. Utility Functions

```typescript
// src/types.ts (już istnieją!)

// UUID validation
export function isValidUUID(id: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id);
}

// UpdateStoryCommand validation (at least one field)
export function isValidUpdateStoryCommand(
	cmd: UpdateStoryCommand
): cmd is
	| Required<Pick<UpdateStoryCommand, 'question'>>
	| Required<Pick<UpdateStoryCommand, 'answer'>>
	| Required<UpdateStoryCommand> {
	return cmd.question !== undefined || cmd.answer !== undefined;
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
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"user_id": "660e8400-e29b-41d4-a716-446655440001",
	"subject": "Tajemnicza latarnia morska",
	"difficulty": 2,
	"darkness": 3,
	"question": "Zaktualizowano tekst pytania. Nowe szczegóły zostały dodane.",
	"answer": "Zaktualizowano tekst odpowiedzi z bardziej szczegółowym wyjaśnieniem.",
	"created_at": "2025-01-26T10:30:00.000Z"
}
```

**Charakterystyka odpowiedzi:**

- Pełny obiekt StoryDTO z zaktualizowanymi polami
- `question` i/lub `answer` zawierają nowe wartości
- Wszystkie inne pola (subject, difficulty, darkness, created_at) pozostają niezmienione
- Zwraca 200 OK (nie 204 No Content) - klient otrzymuje zaktualizowany obiekt

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

#### 400 Bad Request - Empty question/answer

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Pytanie nie może być puste",
		"field": "question"
	}
}
```

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Odpowiedź nie może być pusta",
		"field": "answer"
	}
}
```

#### 400 Bad Request - No fields provided

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)"
	}
}
```

#### 400 Bad Request - Read-only field included

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Pole 'subject' jest tylko do odczytu i nie może być aktualizowane",
		"field": "subject"
	}
}
```

**Przykłady read-only field attempts:**

```json
// Attempt to update subject
{
  "subject": "New subject",
  "question": "New question"
}
→ 400 Bad Request: "Pole 'subject' jest tylko do odczytu..."

// Attempt to update difficulty
{
  "difficulty": 3,
  "answer": "New answer"
}
→ 400 Bad Request: "Pole 'difficulty' jest tylko do odczytu..."
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

#### 500 Internal Server Error - Błąd bazy danych

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Nie udało się zaktualizować historii. Spróbuj ponownie później"
	}
}
```

---

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │ 1. PATCH /api/stories/550e8400-e29b-41d4-a716-446655440000
       │    Authorization: Bearer <token>
       │    { "question": "Updated...", "answer": "Updated..." }
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
┌──────────────────────┐
│  Parse Request Body  │
└──────┬───────────────┘
       │ 4. Check for read-only fields
       ▼
┌──────────────────────┐
│  Read-only Fields    │
│  Check               │
└──────┬───────┬───────┘
       │       │
  Pass │       │ Contains read-only
       │       └──────► 400 VALIDATION_ERROR
       ▼
┌──────────────────────┐
│  Validate with Zod   │ ◄──── UpdateStorySchema
│  UpdateStorySchema   │
└──────┬───────┬───────┘
       │       │
  Pass │       │ Fail (empty fields)
       │       └──────► 400 VALIDATION_ERROR
       ▼
┌──────────────────────┐
│  Check At Least One  │ ◄──── isValidUpdateStoryCommand()
│  Field Provided      │
└──────┬───────┬───────┘
       │       │
  Pass │       │ Fail (no fields)
       │       └──────► 400 VALIDATION_ERROR
       ▼
┌──────────────────────────────────────────┐
│  Supabase Database                       │
│  UPDATE public.stories                   │
│  SET question = ?, answer = ?            │
│  WHERE id = ?                            │
└──────┬───────────────────────────────────┘
       │ 5. RLS Check: stories_update_own
       ▼
┌──────────────────────┐
│  RLS Policy          │
│  stories_update_own  │ ◄──── USING (auth.uid() = user_id)
└──────┬───────┬───────┘
       │       │
  Pass │       │ Block (different user)
       │       └──────► Empty result → 404 NOT_FOUND
       ▼
┌──────────────────────┐
│  PostgreSQL          │ ◄──── Execute UPDATE
│  Primary key lookup  │       stories_pkey (id)
└──────┬───────┬───────┘
       │       │
 Found │       │Not Found
       │       └──────► Empty result → 404 NOT_FOUND
       ▼
┌──────────────────────────────────────────┐
│  SvelteKit API Route                     │ ◄──── Return updated StoryDTO
└──────┬───────────────────────────────────┘
       │ 6. 200 OK + updated StoryDTO
       ▼
┌─────────────┐
│   Client    │ ◄──── Display updated story
│             │       Redirect to detail view
└─────────────┘
```

### 5.2. Szczegółowy opis kroków

#### Krok 1: Client Request

- Frontend wysyła PATCH request z zaktualizowanymi polami
- Typowo z formularza edycji historii
- Dołącza JWT token w nagłówku `Authorization`

#### Krok 2: Extract & Validate ID

- Extract `id` z URL params
- Wywołaj `isValidUUID(id)`
- Jeśli invalid → 400 Bad Request

#### Krok 3: Authentication

- SvelteKit middleware weryfikuje JWT
- Jeśli invalid → 401 Unauthorized

#### Krok 4: Check Read-only Fields

- Parse request body
- Sprawdź czy zawiera read-only fields (subject, difficulty, darkness, user_id, created_at)
- **Jeśli TAK → 400 Bad Request** z message wskazującym które pole

**Dlaczego to ważne:**

- Zapobiega przypadkowej/celowej manipulacji metadanych
- Explicit error message informuje użytkownika
- Security by design

#### Krok 5: Validate with Zod

- Waliduj question/answer przez UpdateStorySchema
- Sprawdź czy question/answer nie są puste (after trim)
- Jeśli validation fails → 400 Bad Request

#### Krok 6: Check At Least One Field

- Wywołaj `isValidUpdateStoryCommand()` (już istnieje w types.ts!)
- Sprawdź czy question OR answer jest podane
- Jeśli żadne pole → 400 Bad Request

#### Krok 7: Row Level Security Check

- PostgreSQL wykonuje RLS policy `stories_update_own`
- Sprawdza czy `auth.uid() = user_id`
- **Jeśli historia należy do innego użytkownika:**
  - RLS blokuje UPDATE
  - Query zwraca empty result
  - API endpoint zwraca 404 Not Found

#### Krok 8: Database UPDATE

- PostgreSQL wykonuje:
  ```sql
  UPDATE public.stories
  SET
    question = COALESCE($1, question),  -- if null, keep old value
    answer = COALESCE($2, answer)        -- if null, keep old value
  WHERE id = $3
    AND user_id = auth.uid()  -- RLS auto-adds
  RETURNING *;
  ```
- Wykorzystuje primary key index `stories_pkey`
- Typowy czas: ~10-20ms

**Rezultaty:**

- **Found & Updated:** Zwraca zaktualizowany row
- **Not Found:** Empty result (RLS blocked LUB ID doesn't exist) → 404

#### Krok 9: Client Response

- API route formatuje odpowiedź jako `StoryDTO`
- Zwraca 200 OK z zaktualizowanym obiektem
- Frontend może wyświetlić sukces i przekierować do szczegółów

### 5.3. Interakcje z bazą danych

#### SQL Query (wykonywane przez Supabase SDK)

```sql
-- Supabase SDK generuje zapytanie:
UPDATE public.stories
SET
  question = COALESCE($1, question),  -- Jeśli question = undefined, zachowaj starą wartość
  answer = COALESCE($2, answer)        -- Jeśli answer = undefined, zachowaj starą wartość
WHERE id = $3
  AND user_id = auth.uid()  -- RLS auto-adds
RETURNING *;

-- Parameters:
-- $1 = 'Updated question text' OR null (if not provided)
-- $2 = 'Updated answer text' OR null (if not provided)
-- $3 = '550e8400-e29b-41d4-a716-446655440000'
```

**WAŻNE:** W Supabase SDK, partial update działa tak:

```typescript
// Only update question (answer remains unchanged)
.update({ question: 'New question' })

// Only update answer (question remains unchanged)
.update({ answer: 'New answer' })

// Update both
.update({ question: 'New question', answer: 'New answer' })
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
- RLS filter: Minimal overhead
- Typowy czas: 10-20ms

---

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie (Authentication)

**Mechanizm:**

- JWT Bearer token verification przez Supabase Auth
- Token wysyłany jako `Authorization: Bearer <token>`

**Implementacja:**

```typescript
// src/hooks.server.ts (wspólny dla wszystkich endpoints)
// Już zaimplementowany - reused
```

### 6.2. Autoryzacja (Authorization)

**Mechanizm: Row Level Security (RLS)**

Polityka `stories_update_own`:

```sql
CREATE POLICY stories_update_own
ON public.stories
FOR UPDATE
USING (auth.uid() = user_id);
```

**Jak to działa:**

1. PostgreSQL automatycznie dodaje warunek `WHERE auth.uid() = user_id`
2. Użytkownik może edytować TYLKO swoje historie
3. Jeśli próbuje edytować cudzą historię → RLS zwraca empty result → 404

**Security Guarantee:**

- Zero Trust: Baza danych jest ostatecznym arbitrem
- Nawet jeśli aplikacja ma bug, RLS blokuje dostęp
- **Nie ujawniamy** czy story doesn't exist vs belongs to different user (jak w GET /:id)

### 6.3. Read-only Fields Protection

**Problem:**
Użytkownik może próbować zaktualizować read-only fields:

```json
{
	"subject": "Hacked subject",
	"difficulty": 1,
	"darkness": 1,
	"question": "Legitimate question update"
}
```

**Mitigation:**

```typescript
// Explicit check BEFORE Zod validation
const readOnlyFields = ['subject', 'difficulty', 'darkness', 'user_id', 'created_at', 'id'];
const bodyKeys = Object.keys(body);

for (const field of bodyKeys) {
	if (readOnlyFields.includes(field)) {
		return json<ErrorDTO>(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: `Pole '${field}' jest tylko do odczytu i nie może być aktualizowane`,
					field
				}
			},
			{ status: 400 }
		);
	}
}
```

**Dlaczego to ważne:**

- **Zapobiega manipulacji metadanych:** subject/difficulty/darkness określają charakter historii
- **Nie można "upgradeować" difficulty:** User nie może zmienić difficulty=3 → difficulty=1
- **Immutable metadata:** subject/difficulty/darkness są set at creation time
- **Security by design:** Explicit rejection z jasnym error message

**Logging:**

```typescript
// Log attempts to update read-only fields (security monitoring)
console.warn('[SECURITY] Attempt to update read-only field', {
	field,
	userId: locals.user.id,
	storyId: id,
	timestamp: new Date().toISOString()
});
```

### 6.4. Mass Assignment Prevention

**Problem:**
Client może wysłać dodatkowe pola:

```json
{
	"question": "Legitimate update",
	"user_id": "different-user-uuid", // Attempt to hijack story
	"created_at": "2020-01-01T00:00:00Z" // Attempt to fake timestamp
}
```

**Mitigation:**

1. **Read-only fields check** (krok wyżej) - rejects user_id/created_at
2. **Explicit pick** tylko question/answer w UPDATE query:

```typescript
// Build update object with ONLY allowed fields
const updateData: Partial<UpdateStoryCommand> = {};
if (validated.question !== undefined) {
	updateData.question = validated.question;
}
if (validated.answer !== undefined) {
	updateData.answer = validated.answer;
}

// Supabase SDK: .update(updateData)
// Only question/answer are sent to DB
```

### 6.5. UUID Validation & Injection Prevention

**Jak w GET /:id:**

- UUID validation zapobiega SQL injection
- Supabase SDK używa parameterized queries
- Brak ryzyka injection

### 6.6. Information Disclosure Prevention

**Jednolita 404 message:**

- "Nie znaleziono historii lub nie masz do niej dostępu"
- Nie rozróżniamy: story doesn't exist vs belongs to different user
- Zapobiega information leakage (jak w GET /:id)

---

## 7. Obsługa błędów

### 7.1. Tabela błędów

| Error Code             | HTTP Status | Opis                         | User Message (PL)                                                | Retry Safe? | Frontend Action                  |
| ---------------------- | ----------- | ---------------------------- | ---------------------------------------------------------------- | ----------- | -------------------------------- |
| `VALIDATION_ERROR`     | 400         | Invalid UUID format          | "Nieprawidłowy format identyfikatora historii"                   | ❌ Nie      | Show error, redirect to /history |
| `VALIDATION_ERROR`     | 400         | Empty question/answer        | "Pytanie/Odpowiedź nie może być puste"                           | ✅ Tak      | Show error under field, focus    |
| `VALIDATION_ERROR`     | 400         | No fields provided           | "Musisz podać przynajmniej jedno pole do aktualizacji"           | ✅ Tak      | Show error, highlight form       |
| `VALIDATION_ERROR`     | 400         | Read-only field included     | "Pole '{field}' jest tylko do odczytu..."                        | ❌ Nie      | Show error, remove field         |
| `AUTHENTICATION_ERROR` | 401         | No/invalid token             | "Brakujący lub nieprawidłowy token uwierzytelniający"            | ❌ Nie      | Redirect to /login               |
| `NOT_FOUND`            | 404         | Story not found or no access | "Nie znaleziono historii lub nie masz do niej dostępu"           | ❌ Nie      | Show 404 page                    |
| `INTERNAL_ERROR`       | 500         | Database UPDATE error        | "Nie udało się zaktualizować historii. Spróbuj ponownie później" | ✅ Tak      | Show error toast, enable retry   |

### 7.2. Szczegółowa obsługa błędów

#### 7.2.1. VALIDATION_ERROR (400) - Invalid UUID

**Scenariusz:**

```bash
PATCH /api/stories/not-a-uuid
```

**Response:**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Nieprawidłowy format identyfikatora historii",
		"field": "id"
	}
}
```

**Frontend Action:**

- Show error message
- Redirect to `/history`

#### 7.2.2. VALIDATION_ERROR (400) - Empty Fields

**Scenariusz:**

```json
{
	"question": "   ", // Only whitespace
	"answer": "" // Empty
}
```

**Response:**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Pytanie nie może być puste",
		"field": "question"
	}
}
```

**Frontend Action:**

- Show error under question field
- Focus on field
- User can fix and retry

#### 7.2.3. VALIDATION_ERROR (400) - No Fields Provided

**Scenariusz:**

```json
{} // Empty body
```

**Response:**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)"
	}
}
```

**Frontend Action:**

- Show error at top of form
- Highlight both fields
- User must fill at least one

#### 7.2.4. VALIDATION_ERROR (400) - Read-only Field

**Scenariusz:**

```json
{
	"subject": "Trying to update subject",
	"question": "Also updating question"
}
```

**Response:**

```json
{
	"error": {
		"code": "VALIDATION_ERROR",
		"message": "Pole 'subject' jest tylko do odczytu i nie może być aktualizowane",
		"field": "subject"
	}
}
```

**Frontend Action:**

- Show error: "Nie możesz edytować pola 'subject'"
- Remove read-only field from request
- Retry with only editable fields

**Logging:**

```typescript
// IMPORTANT: Log attempts to update read-only fields
console.warn('[SECURITY] Attempt to update read-only field', {
	field: 'subject',
	userId: locals.user.id,
	storyId: id,
	attemptedValue: body.subject,
	timestamp: new Date().toISOString()
});
```

**Wszystkie read-only fields:**

- subject → "Pole 'subject' jest tylko do odczytu..."
- difficulty → "Pole 'difficulty' jest tylko do odczytu..."
- darkness → "Pole 'darkness' jest tylko do odczytu..."
- user_id → "Pole 'user_id' jest tylko do odczytu..."
- created_at → "Pole 'created_at' jest tylko do odczytu..."

#### 7.2.5. AUTHENTICATION_ERROR (401)

**Jak w GET /:id:**

- Brak/invalid token → 401
- Redirect to /login

#### 7.2.6. NOT_FOUND (404)

**Scenariusze:**

**Przypadek 1: Story nie istnieje**

```typescript
// Valid UUID, ale story nie istnieje w bazie
const { data, error } = await locals.supabase
	.from('stories')
	.update(updateData)
	.eq('id', id)
	.select()
	.single();

// data = null (empty result)
```

**Przypadek 2: Story należy do innego użytkownika (RLS blocked)**

```typescript
// Valid UUID, story exists, ale belongs to different user
// RLS policy blokuje UPDATE
// Query zwraca empty result

// data = null (RLS blocked)
```

**Jednolita odpowiedź:**

```json
{
	"error": {
		"code": "NOT_FOUND",
		"message": "Nie znaleziono historii lub nie masz do niej dostępu"
	}
}
```

**Frontend Action:**

- Wyświetl 404 page
- Przycisk: "Wróć do moich historii" → `/history`

**Logging:**

```typescript
console.warn('[NOT_FOUND] Story not found or no access during UPDATE', {
	storyId: id,
	userId: locals.user.id,
	updateFields: Object.keys(updateData),
	timestamp: new Date().toISOString()
});
```

#### 7.2.7. INTERNAL_ERROR (500)

**Scenariusz:**

**Database UPDATE Error:**

```typescript
const { data, error } = await locals.supabase
	.from('stories')
	.update(updateData)
	.eq('id', id)
	.select()
	.single();

if (error) {
	console.error('[DB_ERROR] UPDATE failed', {
		code: error.code,
		message: error.message,
		storyId: id,
		userId: locals.user.id,
		updateData,
		timestamp: new Date().toISOString()
	});

	throw new InternalError('Database UPDATE failed');
}
```

**Response:**

```json
{
	"error": {
		"code": "INTERNAL_ERROR",
		"message": "Nie udało się zaktualizować historii. Spróbuj ponownie później"
	}
}
```

**Frontend Action:**

- Show error toast
- Enable "Spróbuj ponownie" button
- Zachowaj dane w formularzu (nie czyść)

### 7.3. Error Handling Flow Diagram

```
┌─────────────────┐
│  API Request    │
│  PATCH /:id     │
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
    │ Parse Body   │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Check        │
    │ Read-only    │
    │ Fields       │
    └────┬────┬────┘
         │    │
    Pass │    │ Contains read-only
         │    └─────► 400 VALIDATION_ERROR
         ▼
    ┌──────────────┐
    │ Validate     │
    │ with Zod     │
    └────┬────┬────┘
         │    │
    Pass │    │ Fail (empty fields)
         │    └─────► 400 VALIDATION_ERROR
         ▼
    ┌──────────────┐
    │ Check At     │
    │ Least One    │
    │ Field        │
    └────┬────┬────┘
         │    │
    Pass │    │ Fail (no fields)
         │    └─────► 400 VALIDATION_ERROR
         ▼
    ┌──────────────┐
    │ UPDATE       │
    │ Database     │
    └────┬────┬────┐
         │    │    │
  Found  │  Empty Error
         │    │    │
         │    ▼    ▼
         │   404  500
         │   NOT_FOUND
         │   INTERNAL_ERROR
         ▼
    ┌──────────────┐
    │ Return 200   │
    │ + Updated    │
    │ StoryDTO     │
    └──────────────┘
```

---

## 8. Rozważania dotyczące wydajności

### 8.1. Potencjalne wąskie gardła (Bottlenecks)

#### 8.1.1. Database UPDATE Performance

**Problem:**

- UPDATE by primary key jest szybkie, ale RLS check adds overhead

**Wpływ:**

- ~10-30ms response time (typowo)

**Mitigation:**

- Primary key index `stories_pkey` zapewnia O(log n) lookup
- RLS policy jest prosta (single equality check)

**Performance:**

```sql
EXPLAIN ANALYZE UPDATE stories
SET question = 'New question', answer = 'New answer'
WHERE id = 'uuid' AND user_id = 'user-uuid';

-- Result:
-- Index Scan using stories_pkey on stories
-- Planning Time: 0.1 ms
-- Execution Time: 5-15 ms
```

#### 8.1.2. Validation Overhead

**Problem:**

- Multiple validation steps:
  1. UUID validation
  2. Read-only fields check
  3. Zod schema validation
  4. At least one field check

**Wpływ:**

- +5-15ms latency

**Mitigation:**

- Każda walidacja jest szybka (< 5ms)
- Early returns (fail fast)
- Zod jest very performant

### 8.2. Strategie optymalizacji

#### 8.2.1. Database Optimization

**Index Strategy:**

```sql
-- Primary key index (already exists)
-- stories_pkey ON (id)

-- Perfect for WHERE id = :id queries
```

**Query Optimization:**

```typescript
// Use .select() after UPDATE to return updated row
const { data, error } = await locals.supabase
	.from('stories')
	.update(updateData)
	.eq('id', id)
	.select()
	.single();

// Advantage: Single roundtrip (UPDATE + SELECT in one query)
```

#### 8.2.2. Validation Optimization

**Early Returns:**

```typescript
// Fail fast - check UUID first
if (!isValidUUID(id)) {
  return json(..., { status: 400 });
}

// Then check auth
if (!locals.user) {
  return json(..., { status: 401 });
}

// Then validate body
// Each step returns immediately on failure
```

**Reuse Existing Functions:**

```typescript
// Use isValidUUID() from types.ts (already optimized)
// Use isValidUpdateStoryCommand() from types.ts (already optimized)
```

#### 8.2.3. Optimistic UI (Frontend - Future)

```typescript
// Frontend: Update UI immediately, then sync with server
async function updateStory(id: string, data: UpdateStoryCommand) {
	// 1. Optimistically update local state
	storiesStore.update((stories) => stories.map((s) => (s.id === id ? { ...s, ...data } : s)));

	try {
		// 2. Sync with server
		const updated = await fetch(`/api/stories/${id}`, {
			method: 'PATCH',
			body: JSON.stringify(data)
		});

		// 3. Replace with server version
		storiesStore.replace(id, updated);
	} catch (error) {
		// 4. Rollback on error
		storiesStore.revert(id);
		throw error;
	}
}
```

### 8.3. Performance Targets

| Metric                    | Target (MVP) | Target (Post-MVP) |
| ------------------------- | ------------ | ----------------- |
| API Response Time (p50)   | < 100ms      | < 75ms            |
| API Response Time (p95)   | < 200ms      | < 150ms           |
| API Response Time (p99)   | < 300ms      | < 250ms           |
| Database UPDATE Time      | < 20ms       | < 10ms            |
| Validation Time           | < 15ms       | < 10ms            |
| Throughput (requests/sec) | 200          | 1000              |

### 8.4. Load Testing Plan

**Scenarios:**

1. **Baseline:** 10 concurrent users, 2 updates per minute each
2. **Normal Load:** 50 concurrent users, 5 updates per minute each
3. **Peak Load:** 100 concurrent users, 10 updates per minute each
4. **Concurrent Updates:** Multiple users editing different stories simultaneously

**Sample k6 Script:**

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
	stages: [
		{ duration: '2m', target: 10 },
		{ duration: '5m', target: 50 },
		{ duration: '2m', target: 100 },
		{ duration: '5m', target: 0 }
	]
};

const storyIds = [
	'550e8400-e29b-41d4-a716-446655440000'
	// ... more IDs
];

export default function () {
	const token = __ENV.AUTH_TOKEN;
	const storyId = storyIds[Math.floor(Math.random() * storyIds.length)];

	const payload = JSON.stringify({
		question: `Updated question at ${Date.now()}`,
		answer: `Updated answer at ${Date.now()}`
	});

	const params = {
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		}
	};

	const res = http.patch(`https://mrocznehistorie.pl/api/stories/${storyId}`, payload, params);

	check(res, {
		'status is 200': (r) => r.status === 200,
		'response time < 200ms': (r) => r.timings.duration < 200,
		'has updated question': (r) => JSON.parse(r.body).question.includes('Updated')
	});

	sleep(Math.random() * 5);
}
```

---

## 9. Etapy wdrożenia

### Krok 1: Walidacja schema (Zod)

**Edytować:** `src/lib/validation/story.validation.ts`

```typescript
// Już istnieje GenerateStorySchema, CreateStorySchema, ListStoriesQueryParamsSchema
// Dodaj UpdateStorySchema:

import { z } from 'zod';

export const UpdateStorySchema = z.object({
	question: z.string().min(1, 'Pytanie nie może być puste').trim().optional(),

	answer: z.string().min(1, 'Odpowiedź nie może być pusta').trim().optional()
});

export type ValidatedUpdateStoryCommand = z.infer<typeof UpdateStorySchema>;

// Custom validation helper
export function validateAtLeastOneField(data: ValidatedUpdateStoryCommand): boolean {
	return data.question !== undefined || data.answer !== undefined;
}
```

**Deliverable:**

- ✅ UpdateStorySchema created
- ✅ Validation for empty fields
- ✅ Helper function for "at least one field" check

---

### Krok 2: Dodanie PATCH handler do existing route

**Edytować:** `src/routes/api/stories/[id]/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isValidUUID, isValidUpdateStoryCommand } from '$lib/types';
import { UpdateStorySchema } from '$lib/validation/story.validation';
import { formatValidationError } from '$lib/utils/validation';
import type { ErrorDTO, StoryDTO, UpdateStoryCommand } from '$lib/types';

// Existing GET handler
export const GET: RequestHandler = async ({ params, locals }) => {
	// ... existing GET implementation
};

// New PATCH handler
export const PATCH: RequestHandler = async ({ params, locals, request }) => {
	// 1. Authentication check
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

	// 2. Validate UUID
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

	// 3. Parse request body
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

	// 4. Check for read-only fields
	const readOnlyFields = ['subject', 'difficulty', 'darkness', 'user_id', 'created_at', 'id'];
	const bodyKeys = Object.keys(body as object);

	for (const field of bodyKeys) {
		if (readOnlyFields.includes(field)) {
			console.warn('[SECURITY] Attempt to update read-only field', {
				field,
				userId: locals.user.id,
				storyId: id,
				timestamp: new Date().toISOString()
			});

			return json<ErrorDTO>(
				{
					error: {
						code: 'VALIDATION_ERROR',
						message: `Pole '${field}' jest tylko do odczytu i nie może być aktualizowane`,
						field
					}
				},
				{ status: 400 }
			);
		}
	}

	// 5. Validate with Zod
	const validation = UpdateStorySchema.safeParse(body);
	if (!validation.success) {
		return json<ErrorDTO>(formatValidationError(validation.error), { status: 400 });
	}

	// 6. Check at least one field provided
	if (!isValidUpdateStoryCommand(validation.data)) {
		return json<ErrorDTO>(
			{
				error: {
					code: 'VALIDATION_ERROR',
					message: 'Musisz podać przynajmniej jedno pole do aktualizacji (question lub answer)'
				}
			},
			{ status: 400 }
		);
	}

	// 7. Build update object (only provided fields)
	const updateData: Partial<UpdateStoryCommand> = {};
	if (validation.data.question !== undefined) {
		updateData.question = validation.data.question;
	}
	if (validation.data.answer !== undefined) {
		updateData.answer = validation.data.answer;
	}

	// 8. Update story in database
	try {
		const { data, error } = await locals.supabase
			.from('stories')
			.update(updateData)
			.eq('id', id)
			.select()
			.single();

		if (error) {
			// Check if "not found" (common case)
			if (error.code === 'PGRST116') {
				console.warn('[NOT_FOUND] Story not found or no access during UPDATE', {
					storyId: id,
					userId: locals.user.id,
					updateFields: Object.keys(updateData),
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
			console.error('[DB_ERROR] UPDATE failed', {
				code: error.code,
				message: error.message,
				storyId: id,
				userId: locals.user.id,
				updateData,
				timestamp: new Date().toISOString()
			});

			return json<ErrorDTO>(
				{
					error: {
						code: 'INTERNAL_ERROR',
						message: 'Nie udało się zaktualizować historii. Spróbuj ponownie później'
					}
				},
				{ status: 500 }
			);
		}

		// 9. Check if data is null (RLS blocked or not found)
		if (!data) {
			console.warn('[NOT_FOUND] Story not found or no access (RLS) during UPDATE', {
				storyId: id,
				userId: locals.user.id,
				updateFields: Object.keys(updateData),
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

		// 10. Return success response
		return json<StoryDTO>(data, { status: 200 });
	} catch (error: any) {
		// 11. Handle unexpected errors
		console.error('[API_ERROR] PATCH /api/stories/:id', {
			error: error.message,
			stack: error.stack,
			storyId: id,
			userId: locals.user.id,
			updateData,
			timestamp: new Date().toISOString()
		});

		return json<ErrorDTO>(
			{
				error: {
					code: 'INTERNAL_ERROR',
					message: 'Nie udało się zaktualizować historii. Spróbuj ponownie później'
				}
			},
			{ status: 500 }
		);
	}
};
```

**Deliverable:**

- ✅ PATCH handler added to existing [id]/+server.ts
- ✅ All validation steps implemented
- ✅ Read-only fields protection
- ✅ At least one field check
- ✅ RLS enforcement
- ✅ Comprehensive error handling

---

### Krok 3: Testowanie manualne

**3.1. Happy Path Tests**

```bash
TOKEN="eyJ..."
STORY_ID="550e8400-e29b-41d4-a716-446655440000"

# Update both question and answer
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Updated question text with new details.",
    "answer": "Updated answer text with more explanation."
  }'

# Expected: 200 OK with full updated StoryDTO

# Update only question
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Only question updated, answer unchanged."
  }'

# Expected: 200 OK, question updated, answer unchanged

# Update only answer
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "answer": "Only answer updated, question unchanged."
  }'

# Expected: 200 OK, answer updated, question unchanged
```

**3.2. Validation Error Tests**

```bash
# Invalid UUID
curl -X PATCH "https://localhost:5173/api/stories/not-a-uuid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "Test"}'

# Expected: 400 Bad Request
# Error: "Nieprawidłowy format identyfikatora historii"

# Empty question
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "   ",
    "answer": "Valid answer"
  }'

# Expected: 400 Bad Request
# Error: "Pytanie nie może być puste"

# No fields provided
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 400 Bad Request
# Error: "Musisz podać przynajmniej jedno pole..."

# Read-only field attempt - subject
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Trying to update subject",
    "question": "Also updating question"
  }'

# Expected: 400 Bad Request
# Error: "Pole 'subject' jest tylko do odczytu..."

# Read-only field attempt - difficulty
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "difficulty": 3,
    "answer": "Trying to upgrade difficulty"
  }'

# Expected: 400 Bad Request
# Error: "Pole 'difficulty' jest tylko do odczytu..."
```

**3.3. Authentication Error Tests**

```bash
# No token
curl -X PATCH "https://localhost:5173/api/stories/$STORY_ID" \
  -H "Content-Type: application/json" \
  -d '{"question": "Test"}'

# Expected: 401 Unauthorized
```

**3.4. Not Found Tests**

```bash
# Non-existent story
NON_EXISTENT_ID="00000000-0000-4000-8000-000000000001"

curl -X PATCH "https://localhost:5173/api/stories/$NON_EXISTENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question": "Test"}'

# Expected: 404 Not Found
```

**3.5. RLS Test (Different User)**

```bash
TOKEN_A="user_a_token"
TOKEN_B="user_b_token"

# User A creates story
STORY_A_ID=$(curl -X POST "https://localhost:5173/api/stories" \
  -H "Authorization: Bearer $TOKEN_A" \
  -d '{"subject":"User A","difficulty":1,"darkness":1,"question":"Q","answer":"A"}' \
  | jq -r '.id')

# User B tries to update User A's story
curl -X PATCH "https://localhost:5173/api/stories/$STORY_A_ID" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"question": "Hacked by User B"}'

# Expected: 404 Not Found (RLS blocked)
```

**Deliverable:**

- ✅ All happy path tests passing
- ✅ All validation tests returning 400
- ✅ Read-only fields rejected
- ✅ Auth tests returning 401
- ✅ 404 for non-existent stories
- ✅ RLS isolation verified

---

### Krok 4: Frontend Integration

**4.1. Create API Client Function**

Edytować: `src/lib/api/stories.ts`

```typescript
import type { UpdateStoryCommand, StoryDTO, ErrorDTO } from '$lib/types';

// Existing: listStories(), createStory(), getStoryById()

export async function updateStory(
	id: string,
	data: UpdateStoryCommand,
	token: string
): Promise<StoryDTO> {
	const response = await fetch(`/api/stories/${id}`, {
		method: 'PATCH',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(data)
	});

	if (!response.ok) {
		const error: ErrorDTO = await response.json();
		throw new Error(error.error.message);
	}

	return response.json();
}
```

**4.2. Create Story Edit Page**

Utworzyć: `src/routes/history/[id]/edit/+page.svelte`

```svelte
<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getStoryById, updateStory } from '$lib/api/stories';
	import { getSupabase } from '$lib/supabase';
	import type { StoryDTO } from '$lib/types';

	let story: StoryDTO | null = null;
	let question = '';
	let answer = '';
	let loading = false;
	let loadingStory = false;
	let error = '';

	const storyId = $page.params.id;

	async function loadStory() {
		loadingStory = true;
		error = '';

		try {
			const supabase = getSupabase();
			const {
				data: { session }
			} = await supabase.auth.getSession();

			if (!session) {
				throw new Error('Not authenticated');
			}

			story = await getStoryById(storyId, session.access_token);
			question = story.question;
			answer = story.answer;
		} catch (err: any) {
			error = err.message;
		} finally {
			loadingStory = false;
		}
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
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

			await updateStory(storyId, { question, answer }, session.access_token);

			// Redirect to story details
			goto(`/history/${storyId}`);
		} catch (err: any) {
			error = err.message;
		} finally {
			loading = false;
		}
	}

	onMount(loadStory);
</script>

<div class="container">
	{#if loadingStory}
		<p>Ładowanie historii...</p>
	{:else if story}
		<h1>Edytuj historię</h1>

		<div class="metadata">
			<p><strong>Temat:</strong> {story.subject}</p>
			<p><strong>Trudność:</strong> {story.difficulty}/3</p>
			<p><strong>Mroczność:</strong> {story.darkness}/3</p>
			<p class="note">
				Możesz edytować tylko pytanie i odpowiedź. Temat, trudność i mroczność są tylko do odczytu.
			</p>
		</div>

		<form on:submit={handleSubmit}>
			<div class="field">
				<label for="question">Pytanie (Zagadka)</label>
				<textarea
					id="question"
					bind:value={question}
					required
					rows="5"
					placeholder="Wpisz treść pytania..."
				/>
			</div>

			<div class="field">
				<label for="answer">Odpowiedź (Rozwiązanie)</label>
				<textarea
					id="answer"
					bind:value={answer}
					required
					rows="5"
					placeholder="Wpisz treść odpowiedzi..."
				/>
			</div>

			{#if error}
				<p class="error">{error}</p>
			{/if}

			<div class="actions">
				<a href="/history/{storyId}" class="btn-secondary">Anuluj</a>
				<button type="submit" class="btn" disabled={loading}>
					{loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
				</button>
			</div>
		</form>
	{:else}
		<div class="error-state">
			<h2>Wystąpił błąd</h2>
			<p>{error}</p>
			<a href="/history" class="btn">Wróć do listy historii</a>
		</div>
	{/if}
</div>

<style>
	.container {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.metadata {
		background: #f9fafb;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.metadata p {
		margin: 0.5rem 0;
	}

	.note {
		font-size: 0.875rem;
		color: #6b7280;
		font-style: italic;
	}

	.field {
		margin-bottom: 1.5rem;
	}

	label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-family: inherit;
		font-size: 1rem;
	}

	textarea:focus {
		outline: none;
		border-color: #6366f1;
		ring: 2px;
		ring-color: #6366f1;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	.error {
		color: #ef4444;
		margin-top: 1rem;
	}

	.error-state {
		text-align: center;
		padding: 3rem;
	}
</style>
```

**Deliverable:**

- ✅ API client function created
- ✅ Edit page implemented
- ✅ Read-only fields clearly indicated
- ✅ Error handling
- ✅ Loading states

---

### Krok 5: E2E Testing (Playwright)

**Utworzyć:** `tests/api/stories/update.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('PATCH /api/stories/:id', () => {
	let authToken: string;
	let storyId: string;

	test.beforeAll(async ({ request }) => {
		// Login
		const loginResponse = await request.post('/auth/v1/token?grant_type=password', {
			data: {
				email: 'test@example.com',
				password: 'test123456'
			}
		});

		const loginData = await loginResponse.json();
		authToken = loginData.access_token;

		// Create test story
		const createResponse = await request.post('/api/stories', {
			headers: { Authorization: `Bearer ${authToken}` },
			data: {
				subject: 'E2E Test Story for UPDATE',
				difficulty: 2,
				darkness: 2,
				question: 'Original question',
				answer: 'Original answer'
			}
		});

		const createData = await createResponse.json();
		storyId = createData.id;
	});

	test('should update both question and answer', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Updated question',
				answer: 'Updated answer'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.id).toBe(storyId);
		expect(data.question).toBe('Updated question');
		expect(data.answer).toBe('Updated answer');
		expect(data.subject).toBe('E2E Test Story for UPDATE'); // unchanged
		expect(data.difficulty).toBe(2); // unchanged
	});

	test('should update only question', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Only question updated'
			}
		});

		expect(response.status()).toBe(200);

		const data = await response.json();
		expect(data.question).toBe('Only question updated');
		expect(data.answer).toBe('Updated answer'); // from previous test
	});

	test('should return 400 for invalid UUID', async ({ request }) => {
		const response = await request.patch('/api/stories/not-a-uuid', {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Test'
			}
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.field).toBe('id');
	});

	test('should return 400 for empty question', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: '   ' // only whitespace
			}
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.message).toContain('puste');
	});

	test('should return 400 for no fields provided', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {}
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.message).toContain('przynajmniej jedno pole');
	});

	test('should return 400 for read-only field (subject)', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				subject: 'Trying to update subject',
				question: 'Also updating question'
			}
		});

		expect(response.status()).toBe(400);

		const data = await response.json();
		expect(data.error.code).toBe('VALIDATION_ERROR');
		expect(data.error.message).toContain('tylko do odczytu');
		expect(data.error.field).toBe('subject');
	});

	test('should return 401 without auth token', async ({ request }) => {
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Test'
			}
		});

		expect(response.status()).toBe(401);

		const data = await response.json();
		expect(data.error.code).toBe('AUTHENTICATION_ERROR');
	});

	test('should return 404 for non-existent story', async ({ request }) => {
		const nonExistentId = '00000000-0000-4000-8000-000000000001';

		const response = await request.patch(`/api/stories/${nonExistentId}`, {
			headers: {
				Authorization: `Bearer ${authToken}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Test'
			}
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

		// User 2 tries to update User 1's story
		const response = await request.patch(`/api/stories/${storyId}`, {
			headers: {
				Authorization: `Bearer ${user2Token}`,
				'Content-Type': 'application/json'
			},
			data: {
				question: 'Hacked by User 2'
			}
		});

		expect(response.status()).toBe(404);

		const data = await response.json();
		expect(data.error.code).toBe('NOT_FOUND');
	});
});
```

**Run tests:**

```bash
npx playwright test tests/api/stories/update.spec.ts
```

**Deliverable:**

- ✅ E2E tests written
- ✅ All tests passing
- ✅ Happy path covered
- ✅ Validation tests
- ✅ Read-only fields protection tested
- ✅ RLS isolation verified

---

### Krok 6: Dokumentacja

**6.1. Update API Documentation**

Edytować: `docs/api/stories.md`

````markdown
# Stories API

## PATCH /api/stories/:id

Update story question and/or answer. Subject, difficulty, and darkness are read-only.

### Authentication

Required: Bearer token

### URL Parameters

- `id`: UUID v4 format (required)

### Request Body

```json
{
	"question": "Updated question text (optional)",
	"answer": "Updated answer text (optional)"
}
```
````

**At least one field required.** Read-only fields: `subject`, `difficulty`, `darkness`, `user_id`, `created_at`.

### Response (200 OK)

```json
{
	"id": "550e8400-e29b-41d4-a716-446655440000",
	"user_id": "660e8400-e29b-41d4-a716-446655440001",
	"subject": "Tajemnicza latarnia morska",
	"difficulty": 2,
	"darkness": 3,
	"question": "Updated question...",
	"answer": "Updated answer...",
	"created_at": "2025-01-26T10:30:00.000Z"
}
```

### Errors

- 400: Invalid UUID, empty fields, no fields provided, or read-only field included
- 401: Authentication error
- 404: Story not found or no access (RLS)
- 500: Database error

See full documentation in `.ai/view-implementation-plans/update-story-endpoint.md`

````

**Deliverable:**
- ✅ API documentation updated

---

### Krok 7: Deployment

**7.1. Deployment Checklist**

- ✅ All environment variables set
- ✅ RLS policy `stories_update_own` active
- ✅ Primary key index exists
- ✅ Build succeeds locally
- ✅ All tests passing
- ✅ Manual testing on staging
- ✅ Deploy to production
- ✅ Smoke test on production

**7.2. Post-Deployment Verification**

```bash
# 1. Update story via production API
PROD_STORY_ID="<existing-story-uuid>"

curl -X PATCH "https://mrocznehistorie.pl/api/stories/$PROD_STORY_ID" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Production test update",
    "answer": "Production test answer"
  }'

# Expected: 200 OK with updated story

# 2. Verify read-only field rejection
curl -X PATCH "https://mrocznehistorie.pl/api/stories/$PROD_STORY_ID" \
  -H "Authorization: Bearer $PROD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Trying to update subject"
  }'

# Expected: 400 Bad Request

# 3. Verify RLS
# Try to update story created by different user
# Expected: 404 Not Found
````

**Deliverable:**

- ✅ Deployed to production
- ✅ Smoke tests passed

---

## 10. Podsumowanie implementacji

### 10.1. Główne komponenty

| Komponent         | Lokalizacja                                 | Odpowiedzialność                                |
| ----------------- | ------------------------------------------- | ----------------------------------------------- |
| API Route (PATCH) | `src/routes/api/stories/[id]/+server.ts`    | PATCH handler, validation, DB update            |
| Validation Schema | `src/lib/validation/story.validation.ts`    | UpdateStorySchema (Zod)                         |
| Types             | `src/types.ts`                              | UpdateStoryCommand, isValidUpdateStoryCommand() |
| Auth Middleware   | `src/hooks.server.ts`                       | Global authentication (reused)                  |
| API Client        | `src/lib/api/stories.ts`                    | updateStory() function                          |
| Edit Page         | `src/routes/history/[id]/edit/+page.svelte` | Story edit UI                                   |

### 10.2. Kluczowe decyzje projektowe

1. **Read-only fields protection** - Explicit rejection z jasnym error message
2. **At least one field required** - isValidUpdateStoryCommand() (already in types.ts)
3. **Partial update** - Tylko podane pola są aktualizowane
4. **RLS enforcement** - stories_update_own policy (auth.uid() = user_id)
5. **200 OK response** - Zwraca pełny zaktualizowany obiekt (nie 204 No Content)
6. **Security logging** - Log attempts to update read-only fields

### 10.3. Znane ograniczenia MVP

- ❌ Brak version history (audit trail)
- ❌ Brak optimistic locking (concurrent updates conflict)
- ❌ Brak "undo" functionality
- ❌ Brak diff view (show what changed)

### 10.4. Następne kroki (Post-MVP)

1. **Version history:** Track all changes (who, when, what)
2. **Optimistic locking:** Prevent concurrent update conflicts
3. **Audit trail:** Full change log for each story
4. **Undo/Redo:** Allow users to revert changes
5. **Diff view:** Show what changed in edit history
6. **Collaboration:** Multiple users editing (future feature)

---

## Appendix: Przykładowe requesty

### Sukces - Update both (200 OK)

```bash
curl -X PATCH https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Updated question",
    "answer": "Updated answer"
  }'
```

### Sukces - Update only question (200 OK)

```bash
curl -X PATCH https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Only question updated"
  }'
```

### Błąd - Read-only field (400)

```bash
curl -X PATCH https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Trying to update subject",
    "question": "Also updating question"
  }'
```

### Błąd - No fields provided (400)

```bash
curl -X PATCH https://mrocznehistorie.pl/api/stories/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Błąd - Not Found (404)

```bash
curl -X PATCH https://mrocznehistorie.pl/api/stories/00000000-0000-4000-8000-000000000001 \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Test"
  }'
```
