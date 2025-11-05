# MroczneHistorie

Aplikacja webowa (mobile-first) do generowania zagadek w stylu "Czarnych Historii" przy użyciu AI (OpenAI). Umożliwia tworzenie, przechowywanie i prowadzenie gier towarzyskich.

> 🛑 **Informacja:** Projekt został w większości wygenerowany przy
> wsparciu modeli AI (głównie Gemini 2.5 Pro, Claude Code Sonnet 4.5 oraz Haiku 4.5) na potrzeby kursu [10xdevs AI](https://www.10xdevs.pl/).

## 🚀 Kluczowe Funkcjonalności

- **Generowanie AI:** Tworzenie unikalnych zagadek (Pytanie + Odpowiedź) na podstawie tematu podanego przez użytkownika.
- **Kontrola parametrów:** Możliwość dostosowania **Trudności** (1-3) i **Mroczności** (1-3) generowanej historii.
- **Prywatna biblioteka:** Przechowywanie wszystkich wygenerowanych historii na prywatnym koncie użytkownika (sortowanie od najnowszej).
- **Tryb gry:** Dedykowany, minimalistyczny widok (`/history/[id]`) dla Mistrza Gry, pozwalający na wygodne prowadzenie rozgrywki z opcją odkrywania i ukrywania rozwiązania.
- **Zarządzanie zagadkami:** Pełne operacje CRUD – edycja treści pytania i odpowiedzi oraz usuwanie historii z biblioteki.
- **Uwierzytelnianie:** System rejestracji i logowania użytkowników oparty o e-mail i hasło.
- **Design:** Aplikacja zaprojektowana w podejściu **Mobile-First** i dostępna wyłącznie w **Trybie Ciemnym (Dark Mode)**.

## 🛠️ Stos Technologiczny

- **Frontend:** SvelteKit (Svelte 5) z TypeScript.
- **Backend:** Endpointy API w SvelteKit.
- **Baza Danych i Auth:** Supabase (Zarządzana baza PostgreSQL, Uwierzytelnianie, Row Level Security).
- **AI:** Integracja z API OpenAI.
- **Styling:** Tailwind CSS z biblioteką komponentów DaisyUI.
- **Testowanie:**
  - Testy jednostkowe: Vitest
  - Testy End-to-End: Playwright
- **CI/CD i Hosting:** GitHub Actions oraz Cloudflare Pages.

## 🌐 Demo

Aplikacja jest dostępna publicznie pod adresem:
**[https://mrocznehistorie.pages.dev/login](https://mrocznehistorie.pages.dev/login)**

## ⚙️ Proces CI/CD

Projekt wykorzystuje **GitHub Actions** do automatyzacji procesów budowania i testowania.

Każdy `push` oraz `pull_request` do gałęzi `main` uruchamia workflow, który wykonuje następujące zadania:

1.  **🔬 Linting:** Sprawdzenie spójności kodu za pomocą ESLint i Prettier (`npm run lint`).
2.  **🧪 Unit Tests:** Uruchomienie testów jednostkowych za pomocą Vitest (`npm run test:unit`).
3.  **🎭 E2E Tests:** Uruchomienie pełnych testów End-to-End przy użyciu Playwright (`npm run test:e2e`).

Jeśli wszystkie powyższe kroki zakończą się sukcesem, a zmiana dotyczy gałęzi `main`, automatycznie uruchamiany jest deployment na **Cloudflare Pages**.

## 🏁 Postawienie Środowiska (Uruchomienie Lokalne)

### Wymagania wstępne

- Node.js wersja 22.x
- NPM wersja 10.x
- Konto Supabase (oraz klucze API)
- Klucz API OpenAI

### Kroki instalacji

1.  Sklonuj repozytorium:

    ```bash
    git clone git@github.com:bplociennik/MroczneHistorie.git
    cd MroczneHistorie
    ```

2.  Zainstaluj zależności:

    ```bash
    npm install
    ```

3.  Skonfiguruj zmienne środowiskowe:
    Skopiuj plik przykładowy:
    ```bash
    cp .env.example .env
    ```
    Następnie uzupełnij plik `.env` wymaganymi kluczami (Supabase, OpenAI). Dla testów E2E może być wymagane stworzenie analogicznego pliku `.env.e2e`.

### Uruchomienie aplikacji

```bash
# Uruchom serwer deweloperski
npm run dev
```

Aplikacja będzie dostępna pod adresem http://localhost:5173.

### Dostępne skrypty

```bash
# Sprawdzenie formatowania i błędów (Lint)
npm run lint

# Automatyczne formatowanie kodu
npm run format

# Uruchomienie testów jednostkowych (Vitest)
npm run test:unit

# Uruchomienie testów E2E (Playwright) - wymaga pliku .env.e2e
npm run test:e2e:local

# Uruchomienie testów E2E w trybie UI (Playwright)
npm run test:e2e:ui:local
```

### Wnioski z podejścia AI-first w tym projekcie

1. `Gemini 2.5 Pro` okazał się mega dobrym toolem do wszystkich
   zadań planistycznych i koncepcyjnych, które nie wymagały
   bezpośredniego generowania kodu (poradził sobie o wiele lepiej
   niż GPT-5)
2. Kluczowe było strategiczne przełączanie się między modelami
3. `Sonnet 4.5 (regular dev)` jest świetny do analizy kodu,
   planowania złożonych ficzerów i refaktoryzacji, ale koszmarnie
   szybko zżera dzienny limit tokenów
4. `Haiku 4.5 (junior dev)` idealny do implementacji dobrze
   rozpisanych zadań (mega szybko działa), ale wymaga precyzyjnego
   taska w Jirze. Używałem go do większości zadań
   implementacyjnych przez co mogłem trochę przyciąć na zużyciu
   tokenów (albo stracic czas jak nie napisałem elaboratu samemu
   bądź z Sonnetem)
5. Mega dobrze poszło AI z generowaniem unit testów
6. Z testami E2E w playwright natomiast beznadziejnie. Straciłem
   tutaj najwięcej czasu... Modele notorycznie robiły te same
   błędy jak używanie nieprawidłowych selektorów, szukanie
   nieistniejacych tekstów. Co gorsza, nawet mając szczegółowe logi
   błędów często nie pomagały a jeszcze bardziej
   przeszkadzały. AI próbowało wykonywać naprawy i dodatkowe
   optymalizacje, które potrafiły popsuć nawet inne testy, których
   miało nie ruszać. Były to często proste błędy, które mógłbym
   naprawić szybko z ręki, ale nie chciałem ingerować (to był cel
   projektu). Tutaj spędzenie więcej na fazie planowania i analizy
   na pewno zmniejszyłoby ilość kółek, jakie wykonałem podczas
   implementacji.
7. Bardzo sprawnie poszło z konfiguracją całego projektu – od
   package.json, przez skrypty npm (lint, testy), aż po wdrożenie pełnego procesu CI/CD na GitHub Actions
8. Obawiałem się pracy ze SvelteKit (który ma mniejszą społeczność niż np. React), ale AI poradziło sobie zaskakująco dobrze. W całym projekcie musiałem interweniować ręcznie z 4 razy, aby nakierować model na oficjalną dokumentację i uniknąć halucynacji
9. Początkowo miałem problemy ze stylowaniem formularzy (Tailwind/DaisyUI). Jednak gdy tylko nakierowałem AI na konkretne przykłady i rozwiązania, model natychmiast "podchwycił" kontekst i poprawnie zaimplementował resztę formularzy w aplikacji
10. Najbardziej frustrujące były limity dzienne w Claude Pro, które
    potrafiły popsuć fajną zabawę i mój context focus na danym
    ficzerze

### Potencjalne TODO

- [ ] Naprawa testów E2E oznaczonych jako `fixme`
- [ ] Dodanie dodatkowego środowiska staging i zmiana sposobu deploymentu na manual trigger
- [ ] Dodanie coverage na testach
- [ ] Umożliwienie na formularzu generowania wyboru modelu jaki ma
      zostać użyty (obecnie o3-mini używam)
- [ ] Dorzucenie testów security + włączenie Github security scanning
- [ ] Job generujący diagram architektury w oparciu o mermaid
- [ ] ...
