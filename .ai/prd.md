# Dokument Wymagań Projektowych (PRD): MroczneHistorie (MVP)

## 1. Wprowadzenie i Cel

"MroczneHistorie" to aplikacja internetowa (mobile-first) zaprojektowana, aby rozwiązać problem trudności związanych z tworzeniem zagadek w stylu "Czarnych Historii". Dzięki integracji z AI (OpenAI), aplikacja umożliwia użytkownikom błyskawiczne generowanie unikalnych, mrocznych zagadek na podstawie ich własnych pomysłów.

Celem tego MVP (Minimum Viable Product) jest szybka walidacja głównej hipotezy: czy użytkownicy widzą wartość w asystencie AI do tworzenia historii i czy będą z niego regularnie korzystać do przechowywania swoich prywatnych zagadek.

## 2. Problem Użytkownika

Wymyślanie angażujących, logicznych i odpowiednio mrocznych zagadek jest czasochłonne i trudne. Osoby chcące poprowadzić grę towarzyską często borykają się z brakiem pomysłów lub tworzą historie, które są zbyt proste lub nielogiczne.

**Rozwiązanie:** Aplikacja, która (1) generuje wysokiej jakości historie na żądanie, (2) opiera je na pomyśle użytkownika oraz (3) przechowuje je w jednym miejscu, gotowe do wykorzystania w dowolnym momencie.

## 3. Kluczowe Cele i Metryki Sukcesu

### Cele Biznesowe
1.  Walidacja zapotrzebowania rynkowego na narzędzie do generowania "Czarnych Historii" wspierane przez AI.
2.  Zbudowanie początkowej bazy użytkowników w celu zebrania opinii przed rozwojem płatnych funkcji.

### Metryki Sukcesu (Kryteria Sukcesu)
1.  **Aktywacja:** 70% nowo zarejestrowanych użytkowników wygeneruje (i zapisze) co najmniej jedną historię.
2.  **Retencja/Zaangażowanie:** 30% użytkowników wygeneruje (i zapisze) więcej niż 3 historie w ciągu pierwszego miesiąca od rejestracji.

**Sposób Pomiaru:**
* Wymagany jest dostęp do tabel `users` (z `user_id` i `registration_date`) oraz `stories` (z `story_id`, `user_id` i `created_at`).

## 4. Architektura i Założenia Techniczne

1.  **Platforma:** Responsywna aplikacja webowa (RWA) działająca w przeglądarce, zaprojektowana w podejściu **Mobile-First**.
2.  **Design:** Aplikacja będzie dostępna wyłącznie w **trybie ciemnym (Dark Mode)**.
3.  **API AI:** Wykorzystane zostanie API OpenAI.
4.  **Język:** Aplikacja i generowane treści będą dostępne wyłącznie w języku polskim.

---

## 5. Wymagania Funkcjonalne (Historyjki Użytkownika)

### Epic 1: Uwierzytelnianie i Architektura Strony

| ID  | Jako (Użytkownik)         | Chcę (Funkcja)                                                     | Aby (Cel)                                                     | Uwagi                                                                                                                                |
|:----|:--------------------------|:-------------------------------------------------------------------|:--------------------------------------------------------------|:-------------------------------------------------------------------------------------------------------------------------------------|
| 1.1 | Niezalogowany użytkownik  | Widzieć stronę główną (`/`) z opisem aplikacji                     | Zrozumieć, co robi aplikacja i zdecydować się na rejestrację. | Strona zawiera tekst (H1: "Zostań Mistrzem Mrocznych Historii.") i przyciski "Zaloguj się" oraz "Stwórz konto".                      |
| 1.2 | Niezalogowany użytkownik  | Przejść na dedykowaną stronę rejestracji (`/register`)             | Założyć nowe konto.                                           |                                                                                                                                      |
| 1.3 | Niezalogowany użytkownik  | Móc się zarejestrować używając e-maila i hasła                     | Stworzyć konto i uzyskać dostęp do aplikacji.                 | **Poza zakresem:** Resetowanie hasła. Walidacja błędów (np. "Hasła nie pasują") odbywa się inline.                                   |
| 1.4 | Niezalogowany użytkownik  | Przejść na dedykowaną stronę logowania (`/login`)                  | Zalogować się na istniejące konto.                            | Formularz logowania i rejestracji są na osobnych stronach (nie w zakładkach).                                                        |
| 1.5 | Zarejestrowany użytkownik | Być automatycznie przekierowanym na `/` (listę historii)           | Rozpocząć korzystanie z aplikacji zaraz po rejestracji.       |                                                                                                                                      |
| 1.6 | Zalogowany użytkownik     | Widzieć spójną nawigację na górze każdej podstrony                 | Łatwo poruszać się po aplikacji.                              | Nawigacja zawiera linki: "Moje Historie" (`/`), "Generuj (+)" (`/generate`) i "Wyloguj".                                             |
| 1.7 | Użytkownik                | Być odpowiednio przekierowywanym w zależności od statusu logowania | Zachować bezpieczeństwo i logikę przepływu.                   | *Zalogowany* na `/login` -> `/`. <br> *Niezalogowany* na `/generate` -> `/login`. <br> *Niezalogowany* na `/` -> widzi Landing Page. |

### Epic 2: Generowanie Historii (Główna Pętla Wartości)

| ID  | Jako (Użytkownik)     | Chcę (Funkcja)                                                   | Aby (Cel)                                                         | Uwagi                                                                                                                                 |
|:----|:----------------------|:-----------------------------------------------------------------|:------------------------------------------------------------------|:--------------------------------------------------------------------------------------------------------------------------------------|
| 2.1 | Zalogowany użytkownik | Mieć dostęp do formularza generowania (`/generate`)              | Stworzyć nową historię.                                           | Formularz zawiera: Pole Temat, Suwak Trudności, Suwak Mroczności, Przycisk "Generuj".                                                 |
| 2.2 | Użytkownik            | Wpisać temat historii (do 150 znaków)                            | Oprzeć generowanie na moim pomyśle.                               | Pole jest **wymagane**. Walidacja błędów (max 150 znaków, wymagane) odbywa się inline.                                                |
| 2.3 | Użytkownik            | Mieć przycisk "Losuj" obok pola Temat                            | Szybko wypełnić pole temat losowym słowem, jeśli nie mam pomysłu. | Lista 50 słów jest zaszyta w kodzie frontendu. Kliknięcie *zastępuje* obecną treść pola.                                              |
| 2.4 | Użytkownik            | Wybrać Trudność (1-3) i Mroczność (1-3)                          | Dopasować historię do moich preferencji.                          | Używamy **Select Box** (list rozwijanych). Domyślna wartość: 1. Pokazują cyfrę i nazwę (np. "1 - Łatwa").                             |
| 2.5 | Użytkownik            | Widzieć pełnoekranowy wskaźnik ładowania po kliknięciu "Generuj" | Wiedzieć, że proces trwa i cierpliwie czekać.                     | Loader (spinner + tekst "Tworzymy Twoją mroczną historię...") blokuje cały interfejs (w tym nawigację). Timeout: **45 sekund**.       |
| 2.6 | Użytkownik            | Otrzymać toast z błędem, jeśli generowanie się nie powiedzie     | Wiedzieć, co poszło nie tak.                                      | Toasty (widoczne 5s, z "X") dla błędów API i Timeout. Przycisk "Generuj" i "Losuj" są nieaktywne podczas ładowania.                   |
| 2.7 | Backend               | Walidować (parsować) odpowiedź od AI                             | Upewnić się, że historia ma Pytanie i Odpowiedź.                  | Jeśli parsowanie zawiedzie, zwracamy błąd (Toast dla użytkownika).                                                                    |
| 2.8 | Użytkownik            | Zobaczyć ekran "Podglądu" po udanym generowaniu                  | Zdecydować, czy chcę zapisać historię.                            | Ekran pokazuje: Pytanie, przycisk "Odkryj odpowiedź", ukrytą Odpowiedź.                                                               |
| 2.9 | Użytkownik            | Mieć przyciski "Zapisz na mojej liście" i "Wygeneruj ponownie"   | Zarządzać wygenerowaną treścią.                                   | "Zapisz" -> przekierowuje na `/`. <br> "Wygeneruj ponownie" -> uruchamia ponowne generowanie (z loaderem) z tymi samymi ustawieniami. |

### Epic 3: Zarządzanie Stworzonymi Historiami

| ID   | Jako (Użytkownik)     | Chcę (Funkcja)                                                   | Aby (Cel)                                      | Uwagi                                                                                                           |
|:-----|:----------------------|:-----------------------------------------------------------------|:-----------------------------------------------|:----------------------------------------------------------------------------------------------------------------|
| 3.1  | Zalogowany użytkownik | Widzieć listę moich zapisanych historii na stronie głównej (`/`) | Mieć dostęp do moich historii.                 | Sortowanie: od najnowszej do najstarszej.                                                                       |
| 3.2  | Użytkownik            | Widzieć czytelne karty historii na liście                        | Szybko zidentyfikować historię.                | Karta zawiera: pełny tekst Pytania, numery Trudności i Mroczności (np. T:2, M:3), ikonę Edycji, ikonę Usuwania. |
| 3.3  | Użytkownik            | Widzieć specjalny komunikat, gdy moja lista jest pusta           | Wiedzieć, co robić dalej.                      | Tekst: "Twoja księga mrocznych historii jest jeszcze pusta..." i przycisk "Wygeneruj nową historię".            |
| 3.4  | Użytkownik            | Kliknąć w tekst pytania na karcie                                | Przejść do "trybu gry".                        | Przenosi na `/history/[id]`.                                                                                    |
| 3.5  | Mistrz Gry            | Widzieć ultra-prosty ekran gry (`/history/[id]`)                 | Móc komfortowo prowadzić grę bez rozpraszaczy. | Ekran zawiera *tylko* górną nawigację, Pytanie i przycisk "Odkryj odpowiedź".                                   |
| 3.6  | Mistrz Gry            | Klikać "Odkryj odpowiedź" / "Ukryj odpowiedź"                    | Kontrolować widoczność rozwiązania.            | Przycisk działa jako przełącznik (toggle).                                                                      |
| 3.7  | Użytkownik            | Kliknąć ikonę "Usuń" na liście historii                          | Pozbyć się niechcianej historii.               | Musi pojawić się okno dialogowe z potwierdzeniem "Czy na pewno chcesz usunąć?".                                 |
| 3.8  | Użytkownik            | Kliknąć ikonę "Edytuj" na liście historii                        | Poprawić błędy w wygenerowanej historii.       | Przenosi na `/history/[id]/edit`.                                                                               |
| 3.9  | Użytkownik            | Widzieć ekran edycji z wypełnionymi danymi                       | Edytować tekst pytania i odpowiedzi.           | Ekran zawiera dwa pola `textarea` (Pytanie, Odpowiedź) i przycisk "Zapisz zmiany".                              |
| 3.10 | Użytkownik            | Widzieć poziomy Trudności i Mroczności na ekranie edycji         | Mieć kontekst edytowanej historii.             | Pola te są widoczne, ale **zablokowane do edycji** (tylko do odczytu).                                          |
| 3.11 | Użytkownik            | Być przekierowanym na `/` po zapisaniu edycji                    | Zobaczyć zaktualizowaną listę.                 |                                                                                                                 |
| 3.12 | Użytkownik            | Kliknąć przycisk "Losuj" na liście moich historii                | Otworzyć losową historię z mojej listy.        | Przycisk "Losuj" jest nieaktywny (disabled), jeśli lista jest pusta.                                            |

## 6. Co NIE WCHODZI w zakres MVP

Poniższe funkcje są świadomie wykluczone z tego zakresu, aby zapewnić szybkie dostarczenie produktu:

* System resetowania hasła.
* System oceniania historii.
* Eksport historii do PDF.
* Publiczna strona/biblioteka z historiami innych użytkowników.
* Limity generowania (poza blokadą przycisków podczas ładowania).
* Przełącznik trybu Jasny/Ciemny (dostępny tylko Ciemny).
* Wsparcie dla wielu języków (tylko polski).
* Możliwość ręcznego tworzenia historii od zera (bez AI).
