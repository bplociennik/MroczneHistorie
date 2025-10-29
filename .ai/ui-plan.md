# Architektura UI dla MroczneHistorie (MVP)

## 1. Przegląd struktury UI

Architektura interfejsu użytkownika (UI) dla aplikacji "MroczneHistorie" zostanie zaimplementowana przy użyciu frameworka **SvelteKit** z **TypeScript**. Interfejs będzie zbudowany w oparciu o bibliotekę komponentów **DaisyUI** (działającą na **Tailwind CSS**), co zapewni szybki rozwój i spójny wygląd.

Zgodnie z wymaganiami (PRD 4.1, 4.2), architektura jest oparta na podejściu **Mobile-First** i będzie wspierać **wyłącznie tryb ciemny (Dark Mode)**, który zostanie skonfigurowany globalnie.

Zarządzanie stanem zostanie podzielone:
1.  **Stan Globalny:** Sesja użytkownika (zarządzana przez `hooks.server.ts` SvelteKit i Supabase), globalny stan ładowania (dla generowania AI) oraz powiadomienia (Toasty) będą obsługiwane przez Svelte Stores i udostępniane w globalnym layoucie.
2.  **Stan Lokalny:** Proste stany UI (np. widoczność odpowiedzi w trybie gry) będą zarządzane lokalnie w komponentach Svelte.
3.  **Zarządzanie Danymi:** Pobieranie danych (listy, szczegóły historii) będzie realizowane w funkcjach `load` (`+page.server.ts`). Mutacje danych (tworzenie, edycja) będą obsługiwane przez Akcje Serwerowe SvelteKit. Wyjątkiem jest usuwanie, które będzie realizowane po stronie klienta (`fetch`), aby uprościć odświeżanie listy.

## 2. Lista widoków

Poniżej znajduje się lista wszystkich kluczowych widoków (stron) aplikacji, opartych na strukturze routingu plików SvelteKit (`src/routes`).

---

### Widok 1: Globalny Layout
* **Ścieżka:** `src/routes/+layout.svelte` (obejmuje wszystkie strony)
* **Główny cel:** Zapewnienie spójnej nawigacji, struktury strony oraz globalnych kontenerów na stany (ładowanie, błędy).
* **Kluczowe informacje do wyświetlenia:** Nawigacja główna, treść bieżącej strony.
* **Kluczowe komponenty widoku:**
    * **`<Navbar />`:** Komponent nawigacyjny. (Mapuje: PRD 1.6, Sesja 4)
    * **`<slot />`:** (SvelteKit) Miejsce renderowania treści podstrony.
    * **`<GlobalLoader />`:** Pełnoekranowy loader (spinner + tekst "Tworzymy...") wyświetlany warunkowo podczas generowania AI. (Mapuje: PRD 2.5)
    * **`<ToastContainer />`:** Kontener na powiadomienia (Toasty) do wyświetlania błędów API (np. Timeout, 500). (Mapuje: PRD 2.6, Sesja 2)
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Zapewnia stałą nawigację na każdej podstronie.
    * **Bezpieczeństwo:** `+layout.server.ts` będzie odpowiedzialny za ładowanie i udostępnianie sesji użytkownika (lub jej braku) wszystkim podstronom.

---

### Widok 2: Strona Główna / Lista Historii
* **Ścieżka:** `/`
* **Główny cel:** Służy jako strona lądowania dla niezalogowanych użytkowników (PRD 1.1) lub jako główny pulpit (lista historii) dla zalogowanych (PRD 3.1).
* **Kluczowe informacje do wyświetlenia:**
    * *Niezalogowany:* Opis aplikacji, przyciski "Zaloguj się" i "Stwórz konto".
    * *Zalogowany (Lista niepusta):* Lista zapisanych historii (od najnowszej), przycisk "Losuj Historię".
    * *Zalogowany (Lista pusta):* Komunikat o pustym stanie i wezwanie do akcji.
* **Kluczowe komponenty widoku:**
    * **`<LandingPage />`:** (Warunkowo) Komponent `Hero` (DaisyUI) z H1 "Zostań Mistrzem Mrocznych Historii." (Mapuje: PRD 1.1)
    * **`<StoryList />`:** (Warunkowo) Kontener na listę `<StoryCard />`. (Mapuje: PRD 3.1)
    * **`<EmptyState />`:** (Warunkowo) Komunikat "Twoja księga mrocznych historii jest jeszcze pusta..." z przyciskiem "Wygeneruj nową historię". (Mapuje: PRD 3.3)
    * **`<ModalConfirmDelete />`:** (Ukryty) Modal (DaisyUI) potwierdzający usunięcie historii. (Mapuje: PRD 3.7, Sesja 3)
    * **Przycisk "Losuj Historię":** Przycisk nieaktywny (disabled), jeśli lista jest pusta. (Mapuje: PRD 3.12)
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Stan pusty (PRD 3.3) kieruje użytkownika do głównej pętli wartości (generowania). Usuwanie (PRD 3.7) jest bezpieczne dzięki modalowi potwierdzającemu.
    * **Bezpieczeństwo:** Dane ładowane w `+page.server.ts` (API 2.1.3), Supabase RLS zapewnia, że użytkownik widzi tylko swoje historie.

---

### Widok 3: Logowanie
* **Ścieżka:** `/login`
* **Główny cel:** Umożliwienie zalogowania się istniejącemu użytkownikowi. (Mapuje: PRD 1.4)
* **Kluczowe informacje do wyświetlenia:** Formularz logowania.
* **Kluczowe komponenty widoku:**
    * **`<AuthForm />`:** (DaisyUI `Card`) Formularz z polami E-mail, Hasło, przyciskiem "Zaloguj się" oraz linkiem do `/register`.
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Prosty, skoncentrowany formularz.
    * **Bezpieczeństwo:** Obsługiwane przez Akcję Serwerową SvelteKit wywołującą Supabase Auth (API 3.2). Zalogowani użytkownicy próbujący wejść na `/login` są przekierowywani na `/` (PRD 1.7).

---

### Widok 4: Rejestracja
* **Ścieżka:** `/register`
* **Główny cel:** Umożliwienie rejestracji nowego konta. (Mapuje: PRD 1.2, 1.3)
* **Kluczowe informacje do wyświetlenia:** Formularz rejestracji.
* **Kluczowe komponenty widoku:**
    * **`<AuthForm />`:** (DaisyUI `Card`) Formularz z polami E-mail, Hasło, Potwierdź Hasło, przyciskiem "Stwórz konto" oraz linkiem do `/login`.
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Walidacja błędów (np. "Hasła nie pasują") odbywa się inline (PRD 1.3).
    * **Bezpieczeństwo:** Obsługiwane przez Akcję Serwerową SvelteKit (API 3.2).

---

### Widok 5: Generator Historii
* **Ścieżka:** `/generate`
* **Główny cel:** Realizacja głównej pętli wartości: konfigurowanie, generowanie (przez AI) i podgląd nowej historii. (Mapuje: Epic 2)
* **Kluczowe informacje do wyświetlenia:** Strona posiada dwa dynamiczne stany (Sesja 5, 10).
* **Kluczowe komponenty widoku:**
    * **Stan 1: Formularz Generowania (Domyślny)**
        * Formularz (`<form method="POST" action="?/generate">`).
        * Pole `input` "Temat" (z walidacją HTML5 `required` i `maxlength="150"`). (Mapuje: PRD 2.2, Sesja 12)
        * Przycisk "Losuj" (obok pola Temat). (Mapuje: PRD 2.3)
        * Komponent `Select Box` (DaisyUI) "Trudność (1-3)". (Mapuje: PRD 2.4, Sesja 1)
        * Komponent `Select Box` (DaisyUI) "Mroczność (1-3)". (Mapuje: PRD 2.4, Sesja 1)
        * Przycisk `submit` "Generuj".
    * **Stan 2: Podgląd (Po udanym generowaniu)**
        * Wyświetlacz "Pytanie". (Mapuje: PRD 2.8)
        * Przełącznik "Odkryj/Ukryj odpowiedź".
        * Wyświetlacz "Odpowiedź" (warunkowo).
        * Formularz (`<form method="POST" action="?/save">`) z przyciskiem "Zapisz na mojej liście". (Mapuje: PRD 2.9)
        * Formularz (`<form method="POST" action="?/generate">`) z przyciskiem "Wygeneruj ponownie". (Mapuje: PRD 2.9)
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Pełnoekranowy loader (PRD 2.5) blokuje UI podczas oczekiwania na AI, dając jasny feedback. Przyciski są nieaktywne (`disabled` + spinner) podczas ładowania (Sesja 14).
    * **Bezpieczeństwo:** Strona chroniona; niezalogowani użytkownicy są przekierowywani na `/login` (PRD 1.7). Akcje SvelteKit (`?/generate`, `?/save`) wywołują odpowiednie endpointy API (API 2.1.1, 2.1.2).

---

### Widok 6: Tryb Gry
* **Ścieżka:** `/stories/[id]` (Zgodnie z Sesja 8)
* **Główny cel:** Zapewnienie minimalistycznego interfejsu dla Mistrza Gry do prowadzenia zagadki. (Mapuje: PRD 3.5)
* **Kluczowe informacje do wyświetlenia:** Tylko Pytanie i (na żądanie) Odpowiedź.
* **Kluczowe komponenty widoku:**
    * Wyświetlacz "Pytanie" (duża, czytelna czcionka).
    * Przycisk przełączający "Odkryj odpowiedź" / "Ukryj odpowiedź". (Mapuje: PRD 3.6)
    * Wyświetlacz "Odpowiedź" (renderowany warunkowo, z animacją `fade` - Sesja 7).
    * *Uwaga: Brak innych elementów UI poza globalną `<Navbar />`.*
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Ultra-minimalistyczny design (PRD 3.5) eliminuje rozpraszacze. Stan przycisku (Odkryj/Ukryj) jest zarządzany lokalnie (Sesja 7).
    * **Bezpieczeństwo:** Dane ładowane w `+page.server.ts` (API 2.1.4). Jeśli historia nie istnieje lub należy do innego użytkownika, RLS (API 3.4) zwróci 404, a funkcja `load` wyświetli błąd SvelteKit.

---

### Widok 7: Edycja Historii
* **Ścieżka:** `/stories/[id]/edit`
* **Główny cel:** Umożliwienie użytkownikowi poprawienia wygenerowanej przez AI treści. (Mapuje: PRD 3.8, 3.9)
* **Kluczowe informacje do wyświetlenia:** Formularz edycji z istniejącymi danymi.
* **Kluczowe komponenty widoku:**
    * Formularz (`<form method="POST">`) obsługiwany przez domyślną Akcję Serwerową.
    * Pola `textarea` dla "Pytanie" i "Odpowiedź".
    * Wyświetlacze (tylko do odczytu, `disabled`) dla "Trudność" i "Mroczność". (Mapuje: PRD 3.10)
    * Przycisk `submit` "Zapisz zmiany".
* **Względy UX, dostępności i bezpieczeństwa:**
    * **UX:** Brak przycisku "Anuluj" (Sesja 11); użytkownik opuszcza widok przez nawigację. Zablokowanie T/M upraszcza UI i jest zgodne z API (API 2.1.5).
    * **Bezpieczeństwo:** Strona chroniona (jak Tryb Gry). Akcja Serwerowa wysyła `PATCH` do API (API 2.1.5).

## 3. Mapa podróży użytkownika

Opisano główny przepływ użytkownika (tzw. "złotą ścieżkę") od rejestracji do posiadania pierwszej historii na liście.

1.  **Start (Niezalogowany):** Użytkownik ląduje na **Widoku 2: Strona Główna (`/`)**, gdzie widzi `<LandingPage />`.
2.  **Rejestracja:** Klika "Stwórz konto", przechodzi do **Widoku 4: Rejestracja (`/register`)**. Wypełnia formularz i klika "Stwórz konto".
3.  **Logowanie i Przekierowanie:** Akcja Serwerowa przetwarza rejestrację (API 3.2). Użytkownik jest automatycznie przekierowywany z powrotem na **Widok 2: Strona Główna (`/`)** (PRD 1.5).
4.  **Pusta Lista:** Ponieważ użytkownik jest teraz zalogowany i nie ma historii, widzi `<EmptyState />` (PRD 3.3).
5.  **Inicjacja Generowania:** Klika "Wygeneruj nową historię", przechodzi do **Widoku 5: Generator Historii (`/generate`)** (Stan 1: Formularz).
6.  **Konfiguracja AI:** Wypełnia formularz (Temat, T/M) (PRD 2.1-2.4) i klika "Generuj".
7.  **Stan Ładowania AI:** **Widok 1: Globalny Layout** wyświetla `<GlobalLoader />` (PRD 2.5). UI jest zablokowane.
8.  **Podgląd:** Po sukcesie API (API 2.1.1), loader znika. **Widok 5: Generator Historii** dynamicznie przełącza się na Stan 2 (Podgląd) (PRD 2.8, Sesja 5).
9.  **Decyzja o Zapisie:** Użytkownik przegląda historię i klika "Zapisz na mojej liście" (PRD 2.9).
10. **Zapis i Przekierowanie:** Akcja Serwerowa (`?/save`) przetwarza zapis (API 2.1.2) i przekierowuje użytkownika na **Widok 2: Strona Główna (`/`)** (PRD 2.9).
11. **Sukces:** Użytkownik widzi **Widok 2: Strona Główna (`/`)** z komponentem `<StoryList />` zawierającym jego pierwszą, nowo utworzoną historię.

## 4. Układ i struktura nawigacji

Nawigacja jest scentralizowana w komponencie `<Navbar />` (część **Widoku 1: Globalny Layout**) i jest zależna od stanu uwierzytelnienia użytkownika.

### Nawigacja Niezalogowanego Użytkownika
(Mapuje: PRD 1.1, Sesja 4)
* **Strona główna** -> `/` (Widok 2: Landing Page)
* **Zaloguj się** -> `/login` (Widok 3: Logowanie)
* **Stwórz konto** -> `/register` (Widok 4: Rejestracja)

### Nawigacja Zalogowanego Użytkownika
(Mapuje: PRD 1.6)
* **Moje Historie** -> `/` (Widok 2: Lista Historii)
* **Generuj (+)** -> `/generate` (Widok 5: Generator)
* **Wyloguj** -> (Akcja wylogowania, przekierowanie na `/`)

### Nawigacja Wewnątrztreściowa (Przepływy)
* **Lista -> Tryb Gry:** Kliknięcie tytułu na `<StoryCard />` -> `/stories/[id]` (Widok 6). (Mapuje: PRD 3.4)
* **Lista -> Edycja:** Kliknięcie ikony "Edytuj" na `<StoryCard />` -> `/stories/[id]/edit` (Widok 7). (Mapuje: PRD 3.8)
* **Edycja -> Lista:** Kliknięcie "Zapisz zmiany" na Widoku 7 -> Przekierowanie na `/` (Widok 2). (Mapuje: PRD 3.11)
* **Generator -> Lista:** Kliknięcie "Zapisz na mojej liście" na Widoku 5 -> Przekierowanie na `/` (Widok 2). (Mapuje: PRD 2.9)

## 5. Kluczowe komponenty

Poniżej znajdują się kluczowe, reużywalne komponenty (przeznaczone do `src/lib/components/`), które stanowią fundament interfejsu użytkownika.

* **`<Navbar />`:**
    * **Cel:** Globalna, responsywna nawigacja.
    * **Logika:** Renderuje linki warunkowo na podstawie przekazanego stanu sesji. Używa DaisyUI `Dropdown` dla widoków mobilnych.
* **`<StoryCard />`:**
    * **Cel:** Reprezentacja pojedynczej historii na liście (Widok 2).
    * **Logika:** (DaisyUI `Card`). Zawiera link `<a>` (do Trybu Gry) na pytaniu, `Badge` (T/M), link `<a>` (do Edycji) oraz przycisk `<button>` (do Usuwania). (Mapuje: PRD 3.2, Sesja 6)
* **`<AuthForm />`:**
    * **Cel:** Wspólny formularz dla Widoków 3 i 4.
    * **Logika:** Używa Akcji Serwerowych SvelteKit. Renderuje warunkowo pole "Potwierdź Hasło".
* **`<GlobalLoader />`:**
    * **Cel:** Pełnoekranowy wskaźnik ładowania dla generowania AI (PRD 2.5).
    * **Logika:** Kontrolowany przez globalny Svelte Store. Używa wysokiego `z-index` i stałego pozycjonowania, aby zablokować interfejs.
* **`<ToastContainer />`:**
    * **Cel:** Globalny system powiadomień o błędach (PRD 2.6).
    * **Logika:** Subskrybuje globalny Svelte Store i renderuje listę alertów (DaisyUI `Alert`) w rogu ekranu.
* **`<ModalConfirmDelete />`:**
    * **Cel:** Okno dialogowe potwierdzające usunięcie (PRD 3.7).
    * **Logika:** (DaisyUI `Modal`). Kontrolowany przez lokalny stan na Widoku 2. Przycisk "Potwierdź" przechodzi w stan ładowania (Sesja 14) i wywołuje logikę usuwania po stronie klienta (Sesja 9).