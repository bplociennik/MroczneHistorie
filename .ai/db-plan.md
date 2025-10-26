# Schemat Bazy Danych - MroczneHistorie (MVP)

## 1. Tabele

### 1.1. `auth.users`
**Uwaga:** Tabela zarządzana przez Supabase. Nie wymaga tworzenia ręcznego schematu. Wykorzystywana jako tabela nadrzędna dla relacji z `public.stories`.

**Kluczowe kolumny (Supabase):**
- `id` - `uuid` (Primary Key)
- `email` - `varchar` (NOT NULL UNIQUE)
- `encrypted_password` - `varchar` (NOT NULL)
- `created_at` - `timestamptz` (NOT NULL DEFAULT now())
- (...)

---

### 1.2. `public.stories`
Główna tabela aplikacji przechowująca wygenerowane przez użytkowników historie.

| Kolumna      | Typ danych     | Ograniczenia                                           | Opis                                                  |
|:-------------|:---------------|:-------------------------------------------------------|:------------------------------------------------------|
| `id`         | `uuid`         | `PRIMARY KEY DEFAULT gen_random_uuid()`                | Unikalny identyfikator historii                       |
| `user_id`    | `uuid`         | `NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE` | Właściciel historii (klucz obcy do auth.users)        |
| `subject`    | `varchar(150)` | `NOT NULL`                                             | Temat podany przez użytkownika (max 150 znaków)       |
| `difficulty` | `smallint`     | `NOT NULL DEFAULT 1`                                   | Poziom trudności historii (1-3, walidacja frontendu)  |
| `darkness`   | `smallint`     | `NOT NULL DEFAULT 1`                                   | Poziom mroczności historii (1-3, walidacja frontendu) |
| `question`   | `text`         | `NOT NULL`                                             | Pytanie (zagadka) wygenerowane przez AI               |
| `answer`     | `text`         | `NOT NULL`                                             | Odpowiedź (rozwiązanie) wygenerowane przez AI         |
| `created_at` | `timestamptz`  | `NOT NULL DEFAULT now()`                               | Znacznik czasu utworzenia historii                    |

**SQL:**
```sql
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject varchar(150) NOT NULL,
  difficulty smallint NOT NULL DEFAULT 1,
  darkness smallint NOT NULL DEFAULT 1,
  question text NOT NULL,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## 2. Relacje między Tabelami

### 2.1. `auth.users` → `public.stories` (Jeden-do-Wielu)
- **Typ relacji:** Jeden użytkownik może mieć wiele historii
- **Implementacja:** Klucz obcy `stories.user_id` odnosi się do `auth.users.id`
- **Reguła usuwania:** `ON DELETE CASCADE` - usunięcie użytkownika automatycznie usuwa wszystkie jego historie
- **Kardynalność:**
  - Jeden `auth.users` → Wiele `public.stories`
  - Jedna `public.stories` → Jeden `auth.users`

**Diagram:**
```
auth.users (1) ──< (N) public.stories
    id              user_id (FK)
```

---

## 3. Indeksy

### 3.1. Indeksy Automatyczne
- **PK Index:** `stories_pkey` na kolumnie `id` (tworzony automatycznie przez PRIMARY KEY)

### 3.2. Indeksy Niestandardowe

#### Index: `idx_stories_user_created`
- **Kolumny:** `(user_id, created_at DESC)`
- **Typ:** Composite B-tree Index
- **Cel:** Optymalizacja głównego zapytania aplikacji - pobierania listy historii użytkownika posortowanej od najnowszej (Epic 3.1, ID 3.1)
- **Zapytanie docelowe:**
  ```sql
  SELECT * FROM stories
  WHERE user_id = <current_user_id>
  ORDER BY created_at DESC;
  ```

**SQL:**
```sql
CREATE INDEX idx_stories_user_created
ON public.stories (user_id, created_at DESC);
```

---

## 4. Zasady PostgreSQL (Row Level Security)

### 4.1. Aktywacja RLS
```sql
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
```

### 4.2. Polityki RLS

#### Policy: `stories_select_own`
- **Operacja:** `SELECT`
- **Warunek:** `auth.uid() = user_id`
- **Opis:** Użytkownik może przeglądać tylko swoje własne historie

```sql
CREATE POLICY stories_select_own
ON public.stories
FOR SELECT
USING (auth.uid() = user_id);
```

#### Policy: `stories_insert_own`
- **Operacja:** `INSERT`
- **Warunek:** `auth.uid() = user_id`
- **Opis:** Użytkownik może dodawać historie tylko przypisane do swojego konta

```sql
CREATE POLICY stories_insert_own
ON public.stories
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### Policy: `stories_update_own`
- **Operacja:** `UPDATE`
- **Warunek:** `auth.uid() = user_id`
- **Opis:** Użytkownik może edytować tylko swoje własne historie (Epic 3, ID 3.8-3.9)

```sql
CREATE POLICY stories_update_own
ON public.stories
FOR UPDATE
USING (auth.uid() = user_id);
```

#### Policy: `stories_delete_own`
- **Operacja:** `DELETE`
- **Warunek:** `auth.uid() = user_id`
- **Opis:** Użytkownik może usuwać tylko swoje własne historie (Epic 3, ID 3.7)

```sql
CREATE POLICY stories_delete_own
ON public.stories
FOR DELETE
USING (auth.uid() = user_id);
```

---

## 5. Uwagi Projektowe

### 5.1. Decyzje Architektoniczne

#### Typ `uuid` dla Kluczy Głównych
Wybór `uuid` zamiast `serial`/`bigserial` ma dwa kluczowe uzasadnienia:
1. **Bezpieczeństwo:** Zapobiega enumeracji zasobów (użytkownicy nie mogą odgadnąć ID poprzez modyfikację URL `/history/[id]`)
2. **Spójność:** Zgodny ze standardem Supabase (`auth.users.id` jest `uuid`)

### 5.2. Wydajność

#### Indeks Composite `(user_id, created_at DESC)`
Zapytanie pobierające listę historii (`WHERE user_id = X ORDER BY created_at DESC`) jest głównym read query aplikacji. Dedykowany indeks zapewnia:
- **Filtering:** Szybkie filtrowanie po `user_id` (pierwsza kolumna indeksu)
- **Sorting:** Bezpośrednie użycie indeksu dla sortowania malejącego po `created_at` (bez dodatkowego kroku sortowania)
- **Covering Index (potencjalnie):** W zależności od zapytania, PostgreSQL może użyć Index-Only Scan

### 5.3. Bezpieczeństwo

#### Row Level Security (RLS)
Kompletny zestaw 4 polityk RLS (SELECT, INSERT, UPDATE, DELETE) zapewnia **pełną izolację danych użytkowników**. Kluczowe właściwości:
- **Zero Trust:** Nawet jeśli błąd w kodzie aplikacji spróbuje pobrać cudze dane, PostgreSQL zablokuje dostęp na poziomie bazy
- **Supabase Auth Integration:** Funkcja `auth.uid()` automatycznie zwraca ID zalogowanego użytkownika z JWT token
- **Brak Publicznych Danych:** MVP nie zawiera funkcji publicznych (ID 82, pkt 4) - RLS całkowicie blokuje cross-user access

#### `ON DELETE CASCADE`
Reguła `ON DELETE CASCADE` dla `stories.user_id` zapewnia integralność referencyjną:
- Automatyczne czyszczenie historii po usunięciu konta użytkownika
- Mimo że MVP nie zawiera UI do usuwania konta, reguła zabezpiecza przyszłą funkcjonalność i operacje administracyjne
