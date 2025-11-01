# Stos Technologiczny MroczneHistorie

## Backend

- **SvelteKit (API Endpoints)**
  - Implementacja logiki biznesowej i dedykowanych endpointów API przy użyciu serwerowych funkcjonalności SvelteKit (API Routes).
- **Supabase (Backend-as-a-Service)**
  - Główny BaaS: zarządzana baza danych PostgreSQL, uwierzytelnianie (RLS) i auto-generowane API. Stanowi warstwę danych dla endpointów SvelteKit.
  - **Komponenty:**
    - **Baza Danych:** PostgreSQL (zarządzana)
    - **API:** Auto-generowane API REST
    - **Uwierzytelnianie:** Zarządzanie tożsamością i RLS

## Frontend

- **SvelteKit z TypeScript**
  - Framework aplikacyjny zintegrowany z TypeScriptem.
- **Tailwind CSS**
  - Framework CSS typu utility-first do stylizacji komponentów.
- **DaisyUI**
  - Biblioteka komponentów UI dla Tailwind CSS.

## Jakość Kodu

- **ESLint**
  - Narzędzie do statycznej analizy kodu JavaScript/TypeScript, wykrywające problemy i wymuszające spójny styl kodowania.
  - Konfiguracja: eslint.config.js z integracją Svelte i TypeScript.
- **Prettier**
  - Automatyczny formatter kodu zapewniający spójne formatowanie.
  - Integracja z Tailwind CSS (prettier-plugin-tailwindcss) i Svelte (prettier-plugin-svelte).

## Testowanie

- **Vitest**
  - Framework do testów jednostkowych (unit tests) zbudowany na Vite.
  - Szybkie wykonywanie testów dzięki natywnym ESM.
  - Integracja z @testing-library/svelte do testowania komponentów.
- **Playwright**
  - Framework do testów End-to-End (E2E).

## Infrastruktura (CI/CD i Hosting)

- **GitHub Actions**
  - Platforma CI/CD do automatyzacji workflow (build, test, deploy).
- **Cloudflare Pages**
  - Platforma hostingowa zintegrowana z GitHub (CI/CD) i globalną siecią CDN.
