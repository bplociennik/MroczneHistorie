# MroczneHistorie

Aplikacja webowa (mobile-first) do generowania zagadek w stylu "Czarnych Historii" z wykorzystaniem AI.

## O Projekcie

MroczneHistorie to narzdzie, które rozwizuje problem trudno[ci w tworzeniu anga|ujcych zagadek logicznych. Aplikacja wykorzystuje API OpenAI do generowania unikalnych, mrocznych historii na podstawie pomysBów u|ytkownika, umo|liwiajc ich przechowywanie i zarzdzanie w jednym miejscu.

### GBówne Funkcjonalno[ci

- Generowanie zagadek AI z kontrol trudno[ci i mroczno[ci
- Prywatna biblioteka wygenerowanych historii
- Tryb gry dla Mistrza Gry (czysty interfejs bez rozpraszaczy)
- Edycja i zarzdzanie zapisanymi historiami
- Losowanie historii z biblioteki
- Responsywny design (mobile-first, dark mode)

## Tech Stack

Projekt wykorzystuje nowoczesny stack technologiczny:

- **Frontend:** SvelteKit + TypeScript + Tailwind CSS + DaisyUI
- **Backend:** SvelteKit API Routes + Supabase (PostgreSQL, Auth, RLS)
- **AI:** OpenAI API
- **Testy:** Playwright
- **CI/CD:** GitHub Actions + Cloudflare Pages

SzczegóBowe informacje o stosie technologicznym znajduj si w [.ai/tech-stack.md](.ai/tech-stack.md).

## Rozpoczcie Pracy

### Wymagania

- Node.js (najnowsza wersja LTS)
- Konto Supabase
- Klucz API OpenAI

### Instalacja

```bash
# Sklonuj repozytorium
git clone git@github.com:bplociennik/MroczneHistorie.git
cd MroczneHistorie

# Zainstaluj zale|no[ci
npm install

# Skonfiguruj zmienne [rodowiskowe
cp .env.example .env
# UzupeBnij .env odpowiednimi kluczami API
```

### Uruchomienie Projektu

```bash
# Tryb deweloperski
npm run dev

# Build produkcyjny
npm run build

# Podgld buildu
npm run preview
```

### Testowanie

```bash
# Uruchom testy E2E
npm run test
```

## Dokumentacja

- [Product Requirements Document (PRD)](.ai/prd.md) - szczegóBowe wymagania funkcjonalne i biznesowe
- [Tech Stack](.ai/tech-stack.md) - peBny opis stosu technologicznego