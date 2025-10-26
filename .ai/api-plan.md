# REST API Plan - MroczneHistorie (MVP)

## 1. Resources

### 1.1. Users
- **Database Table:** `auth.users`
- **Management:** Managed by Supabase Auth
- **Description:** User accounts with email/password authentication

### 1.2. Stories
- **Database Table:** `public.stories`
- **Description:** User-generated dark mystery stories (questions and answers)
- **Relationship:** Each story belongs to one user (many-to-one)

---

## 2. Endpoints

### 2.1. Stories Endpoints

All story endpoints are implemented as **SvelteKit API routes** (`/api/stories/*`) and require authentication.

#### 2.1.1. Generate Story (AI)
- **Method:** POST
- **URL:** `/api/stories/generate`
- **Description:** Generate a new story using OpenAI API (does not save to database)
- **Authentication:** Required (Bearer token)
- **Request Body:**
```json
{
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3
}
```
- **Validation:**
  - `subject`: Required, string, max 150 characters, min 1 character
  - `difficulty`: Required, integer, range 1-3
  - `darkness`: Required, integer, range 1-3
- **Success Response (200):**
```json
{
  "question": "Na szczycie latarni morskiej znaleziono martwego latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Co się stało?",
  "answer": "Latarnik zginął od uderzenia dużym soplem, który stopniał po upadku z sufitu. Morderca umieścił go tam zimą, wiedząc, że w końcu się stopi, a jako dowód zostanie jedynie woda."
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation error (invalid subject, difficulty, or darkness)
  - `401 Unauthorized`: Missing or invalid authentication token
  - `408 Request Timeout`: OpenAI API did not respond within 45 seconds
  - `500 Internal Server Error`: OpenAI API error or failed to parse AI response
  - `503 Service Unavailable`: OpenAI API rate limit exceeded

#### 2.1.2. Create Story
- **Method:** POST
- **URL:** `/api/stories`
- **Description:** Save a story to the database (typically after generating and previewing)
- **Authentication:** Required (Bearer token)
- **Request Body:**
```json
{
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej znaleziono...",
  "answer": "Latarnik zginął od uderzenia..."
}
```
- **Validation:**
  - `subject`: Required, string, max 150 characters, min 1 character
  - `difficulty`: Required, integer, range 1-3
  - `darkness`: Required, integer, range 1-3
  - `question`: Required, string, min 1 character
  - `answer`: Required, string, min 1 character
- **Success Response (201):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej znaleziono...",
  "answer": "Latarnik zginął od uderzenia...",
  "created_at": "2025-01-26T10:30:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation error
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database error

#### 2.1.3. List User Stories
- **Method:** GET
- **URL:** `/api/stories`
- **Description:** Retrieve all stories belonging to the authenticated user, sorted by creation date (newest first)
- **Authentication:** Required (Bearer token)
- **Query Parameters:**
  - `limit` (optional): Integer, max number of stories to return (default: 25)
  - `offset` (optional): Integer, number of stories to skip (default: 0)
- **Request Body:** None
- **Success Response (200):**
```json
{
  "stories": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "subject": "Tajemnicza latarnia morska",
      "difficulty": 2,
      "darkness": 3,
      "question": "Na szczycie latarni morskiej znaleziono...",
      "answer": "Latarnik zginął od uderzenia...",
      "created_at": "2025-01-26T10:30:00Z"
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "subject": "Znikający autostopowicz",
      "difficulty": 1,
      "darkness": 2,
      "question": "Kierowca zabiera autostopowicza...",
      "answer": "Autostopowicz był duchem...",
      "created_at": "2025-01-25T15:20:00Z"
    }
  ],
  "total": 2
}
```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid authentication token
  - `500 Internal Server Error`: Database error

#### 2.1.4. Get Story by ID
- **Method:** GET
- **URL:** `/api/stories/:id`
- **Description:** Retrieve a specific story by ID (user can only access their own stories due to RLS)
- **Authentication:** Required (Bearer token)
- **URL Parameters:**
  - `id`: UUID of the story
- **Request Body:** None
- **Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej znaleziono...",
  "answer": "Latarnik zginął od uderzenia...",
  "created_at": "2025-01-26T10:30:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Invalid UUID format
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Story does not exist or user does not have access
  - `500 Internal Server Error`: Database error

#### 2.1.5. Update Story
- **Method:** PATCH
- **URL:** `/api/stories/:id`
- **Description:** Update story question and/or answer (difficulty and darkness are read-only)
- **Authentication:** Required (Bearer token)
- **URL Parameters:**
  - `id`: UUID of the story
- **Request Body:**
```json
{
  "question": "Zaktualizowano tekst pytania...",
  "answer": "Zaktualizowany tekst odpowiedzi..."
}
```
- **Validation:**
  - `question` (optional): String, min 1 character
  - `answer` (optional): String, min 1 character
  - At least one field must be provided
  - `subject`, `difficulty`, `darkness` cannot be updated (rejected if included)
- **Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subject": "Tajemnicza latarnia morska",
  "difficulty": 2,
  "darkness": 3,
  "question": "Zaktualizowano tekst pytania...",
  "answer": "Zaktualizowany tekst odpowiedzi...",
  "created_at": "2025-01-26T10:30:00Z"
}
```
- **Error Responses:**
  - `400 Bad Request`: Validation error or attempted to update read-only fields
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Story does not exist or user does not have access
  - `500 Internal Server Error`: Database error

#### 2.1.6. Delete Story
- **Method:** DELETE
- **URL:** `/api/stories/:id`
- **Description:** Delete a story permanently
- **Authentication:** Required (Bearer token)
- **URL Parameters:**
  - `id`: UUID of the story
- **Request Body:** None
- **Success Response (204):** No Content
- **Error Responses:**
  - `400 Bad Request`: Invalid UUID format
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: Story does not exist or user does not have access
  - `500 Internal Server Error`: Database error

#### 2.1.7. Get Random Story
- **Method:** GET
- **URL:** `/api/stories/random`
- **Description:** Retrieve a random story from the authenticated user's collection
- **Authentication:** Required (Bearer token)
- **Request Body:** None
- **Success Response (200):**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "subject": "Znikający autostopowicz",
  "difficulty": 1,
  "darkness": 2,
  "question": "Kierowca zabiera autostopowicza...",
  "answer": "Autostopowicz był duchem...",
  "created_at": "2025-01-25T15:20:00Z"
}
```
- **Error Responses:**
  - `401 Unauthorized`: Missing or invalid authentication token
  - `404 Not Found`: User has no stories in their collection
  - `500 Internal Server Error`: Database error

---

## 3. Authentication and Authorization

### 3.1. Authentication Mechanism
- **Provider:** Supabase Auth
- **Method:** JWT (JSON Web Token) Bearer authentication
- **Token Lifetime:** Configurable in Supabase (default: 1 hour for access token)
- **Token Refresh:** Automatic via Supabase SDK using refresh tokens

### 3.2. Client-Side Implementation
The frontend uses `@supabase/supabase-js` SDK to:
1. **Register:** Call `supabase.auth.signUp({email, password})`
2. **Login:** Call `supabase.auth.signInWithPassword({email, password})`
3. **Logout:** Call `supabase.auth.signOut()`
4. **Get Session:** Call `supabase.auth.getSession()` to retrieve current JWT
5. **Auto-Refresh:** SDK automatically refreshes expired tokens

### 3.3. Server-Side Implementation (SvelteKit API Routes)
Each protected API endpoint must:
1. Extract JWT token from `Authorization: Bearer <token>` header
2. Verify token using Supabase Admin Client or pass it to Supabase queries
3. Supabase automatically applies Row Level Security (RLS) based on `auth.uid()`

**Example SvelteKit API Route Pattern:**
```typescript
export async function GET({ request, locals }) {
  // locals.supabase is initialized with user's JWT via hooks
  const { data, error } = await locals.supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }

  return new Response(JSON.stringify({ stories: data, total: data.length }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 3.4. Row Level Security (RLS)
All operations on `public.stories` are protected by PostgreSQL RLS policies:

#### Policy: `stories_select_own`
- **Operation:** SELECT
- **Rule:** `auth.uid() = user_id`
- **Effect:** Users can only view their own stories

#### Policy: `stories_insert_own`
- **Operation:** INSERT
- **Rule:** `auth.uid() = user_id`
- **Effect:** Users can only create stories assigned to their account

#### Policy: `stories_update_own`
- **Operation:** UPDATE
- **Rule:** `auth.uid() = user_id`
- **Effect:** Users can only update their own stories

#### Policy: `stories_delete_own`
- **Operation:** DELETE
- **Rule:** `auth.uid() = user_id`
- **Effect:** Users can only delete their own stories

**Security Guarantee:** Even if the application code has a bug attempting to access another user's data, PostgreSQL will block the query at the database level.

### 3.5. CORS Configuration
- **Allowed Origins:** Application domain only (configured in Supabase dashboard)
- **Allowed Methods:** GET, POST, PATCH, DELETE, OPTIONS
- **Allowed Headers:** Authorization, Content-Type
- **Credentials:** Include (to allow cookies/tokens)

---

## 4. Validation and Business Logic

### 4.1. Input Validation Rules

#### Story Creation/Generation
| Field        | Type    | Required          | Constraints                 | Error Message                                                  |
|:-------------|:--------|:------------------|:----------------------------|:---------------------------------------------------------------|
| `subject`    | string  | Yes               | Min: 1 char, Max: 150 chars | "Subject is required and must be between 1 and 150 characters" |
| `difficulty` | integer | Yes               | Range: 1-3                  | "Difficulty must be an integer between 1 and 3"                |
| `darkness`   | integer | Yes               | Range: 1-3                  | "Darkness must be an integer between 1 and 3"                  |
| `question`   | string  | Yes (when saving) | Min: 1 char                 | "Question is required and cannot be empty"                     |
| `answer`     | string  | Yes (when saving) | Min: 1 char                 | "Answer is required and cannot be empty"                       |

#### Story Update
| Field              | Type   | Required | Constraints                           | Error Message                                              |
|:-------------------|:-------|:---------|:--------------------------------------|:-----------------------------------------------------------|
| `question`         | string | No       | Min: 1 char (if provided)             | "Question cannot be empty if provided"                     |
| `answer`           | string | No       | Min: 1 char (if provided)             | "Answer cannot be empty if provided"                       |
| At least one field | -      | Yes      | Must update question, answer, or both | "At least one field (question or answer) must be provided" |

**Rejected Fields on Update:**
- `subject`, `difficulty`, `darkness`, `user_id`, `created_at`
- **Error Response:** `400 Bad Request` with message "Field '{field}' is read-only and cannot be updated"

#### UUID Validation
All ID parameters (`:id`) must be valid UUID v4 format:
- **Pattern:** `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- **Error Response:** `400 Bad Request` with message "Invalid story ID format"

### 4.2. Business Logic Implementation

#### 4.2.1. AI Story Generation (`POST /api/stories/generate`)

**Process Flow:**
1. Validate input (subject, difficulty, darkness)
2. Construct prompt for OpenAI API:
   ```
   Jesteś mistrzem mrocznych zagadek w stylu "Czarnych Historii". Wygeneruj mroczną historię (w języku polskim) na podstawie poniższych parametrów:

   Temat: {subject}
   Poziom Trudności: {difficulty}
   Poziom Mroczności: {darkness}
   
   Wykorzystaj poniższe definicje poziomów:
   Definicje Trudności:
   - 1 (Łatwa): Rozwiązanie jest proste i logiczne, opiera się na 1-2 kluczowych, oczywistych faktach.
   - 2 (Średnia): Rozwiązanie wymaga zadania kilku pytań i celowo zawiera 1-2 'zmyłki', aby skierować graczy na fałszywy trop.
   - 3 (Trudna): Rozwiązanie jest nieszablonowe, wielowątkowe i bardzo trudne do odgadnięcia bez dogłębnej analizy i myślenia 'poza pudełkiem'.

   Definicje Mroczności:
   - 1 (Tajemnica): Historia jest mroczna w sensie nastroju i tajemnicy. Unikaj jawnych opisów przemocy, krwi czy obrażeń. Skup się na psychologii, niewyjaśnionych zdarzeniach i niepokojącym nastroju.
   - 2 (Niepokojąca): Dopuszczalne są opisy sugerujące przemoc lub jej skutki. Możesz wspomnieć o 'krwi', 'ciele' lub 'walce', ale bez naturalistycznych, brutalnych szczegółów. Ton ma być wyraźnie niepokojący.
   - 3 (Brutalna): Pełna dowolność. Historia może być brutalna, krwawa i zawierać naturalistyczne opisy przemocy, śmierci lub obrażeń fizycznych. Celem jest wywołanie silnego wrażenia, nawet szoku.

   Zwróć obiekt JSON zawierający:
   - "question": "Tajemniczy scenariusz (2-4 zdania), który można rozwiązać zadając pytania 'tak' lub 'nie'"
   - "answer": "Kompletne rozwiązanie wyjaśniające, co się wydarzyło"

   Pytanie musi być intrygujące i logiczne. Odpowiedź powinna być zaskakująca, ale możliwa do wydedukowania.
   ```
3. Call OpenAI API with:
   - Model: `gpt-4o`
   - Temperature: `0.7` (balance creativity and consistency)
   - Max tokens: `500`
   - Timeout: **45 seconds**
4. Parse JSON response
5. Validate response structure (must contain `question` and `answer` keys)
6. Return generated content to client

**Error Handling:**
- **Timeout (45s):** Return `408 Request Timeout`
- **OpenAI API Error:** Return `500 Internal Server Error` with generic message
- **Invalid JSON Response:** Return `500 Internal Server Error` with message "Failed to parse AI response"
- **Missing Fields:** Return `500 Internal Server Error` with message "AI response missing required fields"

**Environment Variables:**
- `OPENAI_API_KEY`: Required for OpenAI API authentication
- `OPENAI_MODEL`: Model name (default: `gpt-4o`)
- `OPENAI_TIMEOUT`: Request timeout in milliseconds (default: `45000`)

#### 4.2.2. Story Listing with Sorting (`GET /api/stories`)

**Query Logic:**
```sql
SELECT * FROM public.stories
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT {limit} OFFSET {offset};
```

**Database Optimization:**
- Uses composite index `idx_stories_user_created` on `(user_id, created_at DESC)`
- PostgreSQL performs index-only scan for maximum performance

**Default Behavior (MVP):**
- No pagination limit (returns all user stories)
- Frontend can implement infinite scroll in future iterations

#### 4.2.3. Random Story Selection (`GET /api/stories/random`)

**Query Logic:**
```sql
SELECT * FROM public.stories
WHERE user_id = auth.uid()
ORDER BY RANDOM()
LIMIT 1;
```

**Business Rules:**
- Returns `404 Not Found` if user has zero stories
- Frontend disables "Random" button when list is empty (PRD 3.12)

#### 4.2.4. Story Deletion with Confirmation (`DELETE /api/stories/:id`)

**API Behavior:**
- Backend simply deletes the record after RLS verification
- Frontend must implement confirmation dialog before calling API (PRD 3.7)
- No soft delete in MVP (permanent deletion)

**Database Cascade:**
- If user account is deleted, all stories are automatically deleted (`ON DELETE CASCADE`)

### 4.3. Error Response Format

All error responses follow a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Temat jest wymagany i musi zawierać od 1 do 150 znaków",
    "field": "subject"
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR`: Input validation failure
- `AUTHENTICATION_ERROR`: Missing or invalid token
- `AUTHORIZATION_ERROR`: User lacks permission for resource
- `NOT_FOUND`: Resource does not exist
- `TIMEOUT_ERROR`: Request exceeded time limit
- `EXTERNAL_API_ERROR`: OpenAI API failure
- `INTERNAL_ERROR`: Unexpected server error

### 4.4. Rate Limiting

**MVP Scope:**
- No explicit rate limiting implemented
- Relies on Supabase's built-in rate limits for database queries
- OpenAI API has its own rate limits (handled by returning `503 Service Unavailable`)

**Future Considerations:**
- Implement per-user rate limiting for AI generation (e.g., 10 requests/hour)
- Add Redis-based rate limiting for SvelteKit API routes

### 4.5. Performance Considerations

#### Database Query Optimization
- **Index Usage:** Composite index on `(user_id, created_at DESC)` optimizes main list query
- **RLS Performance:** Minimal overhead due to simple `auth.uid() = user_id` condition
- **Connection Pooling:** Managed by Supabase (PgBouncer in transaction mode)

#### API Response Times (Target)
- `GET /api/stories`: < 200ms (indexed query)
- `GET /api/stories/:id`: < 100ms (primary key lookup)
- `POST /api/stories`: < 300ms (single INSERT)
- `POST /api/stories/generate`: 5-45s (depends on OpenAI API)
- `PATCH /api/stories/:id`: < 200ms (single UPDATE)
- `DELETE /api/stories/:id`: < 150ms (single DELETE)

#### Caching Strategy (Future)
- Client-side caching of story list in SvelteKit stores
- No server-side caching in MVP (data is always fresh)

---

## 5. API Versioning Strategy

**MVP Approach:**
- No versioning (endpoints at `/api/stories/*`)
- Breaking changes avoided during MVP phase

**Future Strategy:**
- Introduce versioning when needed: `/api/v1/stories/*`, `/api/v2/stories/*`
- Maintain backward compatibility for at least one major version

---

## 6. Testing Strategy

### 6.1. Unit Tests
- Validation logic (subject length, difficulty range, UUID format)
- AI response parsing
- Error message formatting

### 6.2. Integration Tests
- SvelteKit API routes with mocked Supabase client
- OpenAI API integration with mock responses

### 6.3. End-to-End Tests (Playwright)
- Full user flows:
  1. Register → Generate story → Save → View list
  2. Login → Edit story → Verify changes
  3. Delete story → Verify removal from list
  4. Random story selection

### 6.4. Security Tests
- RLS policy enforcement (attempt to access other user's stories)
- JWT token expiration handling
- SQL injection prevention (handled by Supabase SDK)

---

## 7. Deployment and Environment Configuration

### 7.1. Environment Variables

**Required:**
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous/public key (for client-side auth)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (for server-side admin operations)
- `OPENAI_API_KEY`: OpenAI API key

**Optional:**
- `OPENAI_MODEL`: AI model (default: `gpt-4o`)
- `OPENAI_TIMEOUT`: Generation timeout in ms (default: `45000`)
- `API_BASE_URL`: Base URL for API (for development/staging)

### 7.2. Deployment Platforms
- **Frontend + API:** Cloudflare Pages (SvelteKit adapter)
- **Database + Auth:** Supabase Cloud
- **CI/CD:** GitHub Actions

---

## 8. API Documentation and Client SDK

### 8.1. Documentation Format
- OpenAPI 3.0 specification (generated from this plan)
- Interactive docs using Swagger UI or Scalar (hosted at `/api/docs`)

### 8.2. Client SDK (Future)
- TypeScript SDK generated from OpenAPI spec
- Provides type-safe API calls for frontend

**Example Usage:**
```typescript
import { MroczneHistorieClient } from '@mrocznehistorie/sdk';

const client = new MroczneHistorieClient(supabaseClient);

// Generate story
const generated = await client.stories.generate({
  subject: 'A haunted mirror',
  difficulty: 2,
  darkness: 3
});

// Save story
const story = await client.stories.create({
  ...generated,
  subject: 'A haunted mirror',
  difficulty: 2,
  darkness: 3
});
```

---

## 9. Migration Path and Backward Compatibility

### 9.1. Database Migrations
- Managed via Supabase migrations (`supabase/migrations/`)
- Version-controlled SQL files
- Rollback support for production

### 9.2. API Evolution
When adding new features:
- **Additive changes** (new endpoints, optional fields) → No version bump
- **Breaking changes** (removing endpoints, changing response structure) → Version bump

**Example Breaking Change:**
- Old: `GET /api/stories` returns `[{story1}, {story2}]`
- New: `GET /api/v2/stories` returns `{stories: [{story1}, {story2}], meta: {...}}`

---

## 10. Monitoring and Observability

### 10.1. Logging
- **Client Errors (4xx):** Log request details for debugging
- **Server Errors (5xx):** Log full stack trace + context
- **OpenAI API Calls:** Log request/response (excluding sensitive data)

### 10.2. Metrics (Future)
- API response times (p50, p95, p99)
- Error rates by endpoint
- OpenAI API success/failure rate
- Database query performance

### 10.3. Alerting (Future)
- 5xx error rate > 5%
- OpenAI API timeout rate > 10%
- Database connection failures

---

## Appendix A: Quick Reference

### A.1. Endpoint Summary Table

| Method | Endpoint                             | Auth | Description           |
|:-------|:-------------------------------------|:-----|:----------------------|
| POST   | `/auth/v1/signup`                    | No   | Register new user     |
| POST   | `/auth/v1/token?grant_type=password` | No   | Login user            |
| POST   | `/auth/v1/logout`                    | Yes  | Logout user           |
| GET    | `/auth/v1/user`                      | Yes  | Get current user      |
| POST   | `/api/stories/generate`              | Yes  | Generate story via AI |
| POST   | `/api/stories`                       | Yes  | Create/save story     |
| GET    | `/api/stories`                       | Yes  | List user's stories   |
| GET    | `/api/stories/:id`                   | Yes  | Get story details     |
| PATCH  | `/api/stories/:id`                   | Yes  | Update story          |
| DELETE | `/api/stories/:id`                   | Yes  | Delete story          |
| GET    | `/api/stories/random`                | Yes  | Get random story      |
| GET    | `/api/health`                        | No   | Health check          |

### A.2. HTTP Status Codes Used

| Code | Meaning               | Usage                               |
|:-----|:----------------------|:------------------------------------|
| 200  | OK                    | Successful GET, PATCH               |
| 201  | Created               | Successful POST (resource created)  |
| 204  | No Content            | Successful DELETE                   |
| 400  | Bad Request           | Validation error, invalid input     |
| 401  | Unauthorized          | Missing/invalid authentication      |
| 404  | Not Found             | Resource doesn't exist or no access |
| 408  | Request Timeout       | AI generation timeout (45s)         |
| 500  | Internal Server Error | Unexpected error                    |
| 503  | Service Unavailable   | External API (OpenAI) unavailable   |

---

## Appendix B: Sample Payloads

### B.1. Complete Story Object
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "660e8400-e29b-41d4-a716-446655440001",
  "subject": "Tajemniczy latarnik",
  "difficulty": 2,
  "darkness": 3,
  "question": "Na szczycie latarni morskiej znaleziono ciało latarnika. Wszystkie drzwi i okna były zamknięte od wewnątrz. W pobliżu ciała znajdowała się kałuża wody. Brak śladów przemocy. Co się stało?",
  "answer": "Latarnik został zamordowany dużym soplem lodu. Zabójca umieścił sopel na mechanizmie czasowym, który miał spadać z sufitu po stopieniu. Po zabiciu ofiary sopel całkowicie się stopił, pozostawiając jedynie kałużę wody jako dowód. Zamknięcie pomieszczenia było możliwe, ponieważ zabójca wyszedł, zanim sopel spadł.",
  "created_at": "2025-01-26T10:30:00.000Z"
}
```

### B.2. Error Response Examples

**Validation Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Temat jest wymagany i musi zawierać od 1 do 150 znaków",
    "field": "subject"
  }
}
```

**Authentication Error:**
```json
{
  "error": {
    "code": "AUTHENTICATION_ERROR",
    "message": "Brakujący lub nieprawidłowy token uwierzytelniający"
  }
}
```

**Not Found Error:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Nie znaleziono historii lub nie masz do niej dostępu"
  }
}
```

**OpenAI Timeout:**
```json
{
  "error": {
    "code": "TIMEOUT_ERROR",
    "message": "Upłynął limit czasu generowania historii. Spróbuj ponownie"
  }
}
```