# AI Rules for MroczneHistorie

## Description (in Polish language)

"MroczneHistorie" to aplikacja internetowa (mobile-first) zaprojektowana, aby rozwiązać problem trudności związanych z tworzeniem zagadek w stylu "Czarnych Historii". Dzięki integracji z AI (OpenAI), aplikacja umożliwia użytkownikom błyskawiczne generowanie unikalnych, mrocznych zagadek na podstawie ich własnych pomysłów.

Celem tego MVP (Minimum Viable Product) jest szybka walidacja głównej hipotezy: czy użytkownicy widzą wartość w asystencie AI do tworzenia historii i czy będą z niego regularnie korzystać do przechowywania swoich prywatnych zagadek.

## FRONTEND

### Guidelines for SVELTE

#### SVELTE_KIT

- Use server-side load functions to fetch data before rendering pages
- Implement form actions for handling form submissions with progressive enhancement
- Use page stores ($page) to access route parameters and other page data
- Leverage SvelteKit's server-only modules for sensitive operations
- Implement +error.svelte files for custom error handling at the route level
- Use the enhance function for progressive enhancement of forms
- Leverage SvelteKit hooks for global middleware functionality
- Implement route groups (folders with parentheses) for logical organization without URL impact
- Use the new Embedded SvelteKit plugin system
- Implement content negotiation with accept header in load functions

#### SVELTE_CODING_STANDARDS

- Use runes for $state, $effect and $props management instead of the $ prefix
- Use the $ prefix for reactive store values instead of manual store subscription
- Use slot props for better component composition
- Leverage the :global() modifier sparingly for global CSS
- Implement Svelte transitions and animations for smooth UI changes
- Use $effect rune for derived state
- Use simple callback props instead of createEventDispatcher
- Use lifecycle functions (onMount, onDestroy) for setup and cleanup
- Leverage special elements like <svelte:window> and <svelte:component> for dynamic behavior

### Guidelines for STYLING

#### TAILWIND

- Use the @layer directive to organize styles into components, utilities, and base layers
- Implement Just-in-Time (JIT) mode for development efficiency and smaller CSS bundles
- Use arbitrary values with square brackets (e.g., w-[123px]) for precise one-off designs
- Leverage the @apply directive in component classes to reuse utility combinations
- Implement the Tailwind configuration file for customizing theme, plugins, and variants
- Use component extraction for repeated UI patterns instead of copying utility classes
- Leverage the theme() function in CSS for accessing Tailwind theme values
- Implement dark mode with the dark: variant
- Use responsive variants (sm:, md:, lg:, etc.) for adaptive designs
- Leverage state variants (hover:, focus:, active:, etc.) for interactive elements

## CODING_PRACTICES

### Guidelines for STATIC_ANALYSIS

#### ESLINT

- Configure project-specific rules in eslint.config.js to enforce consistent coding standards
- Use shareable configs like eslint-config-airbnb or eslint-config-standard as a foundation
- Implement custom rules for {{project_specific_patterns}} to maintain codebase consistency
- Configure integration with Prettier to avoid rule conflicts for code formatting
- Use the --fix flag in CI/CD pipelines to automatically correct fixable issues
- Implement staged linting with husky and lint-staged to prevent committing non-compliant code

#### PRETTIER

- Define a consistent .prettierrc configuration across all {{project_repositories}}
- Configure editor integration to format on save for immediate feedback
- Use .prettierignore to exclude generated files, build artifacts, and {{specific_excluded_patterns}}
- Set printWidth based on team preferences (80-120 characters) to improve code readability
- Configure consistent quote style and semicolon usage to match team conventions
- Implement CI checks to ensure all committed code adheres to the defined style

## TESTING

### Guidelines for E2E

#### PLAYWRIGHT

- Initialize configuration only with Chromium/Desktop Chrome browser
- Use browser contexts for isolating test environments
- Implement the Page Object Model for maintainable tests
- Use locators for resilient element selection
- Leverage API testing for backend validation
- Implement visual comparison with expect(page).toHaveScreenshot()
- Use the codegen tool for test recording
- Leverage trace viewer for debugging test failures
- Implement test hooks for setup and teardown
- Use expect assertions with specific matchers
- Leverage parallel execution for faster test runs

### Guidelines for UNIT

#### VITEST

- Leverage the `vi` object for test doubles - Use `vi.fn()` for function mocks, `vi.spyOn()` to monitor existing functions, and `vi.stubGlobal()` for global mocks. Prefer spies over mocks when you only need to verify interactions without changing behavior.
- Master `vi.mock()` factory patterns - Place mock factory functions at the top level of your test file, return typed mock implementations, and use `mockImplementation()` or `mockReturnValue()` for dynamic control during tests. Remember the factory runs before imports are processed.
- Create setup files for reusable configuration - Define global mocks, custom matchers, and environment setup in dedicated files referenced in your `vitest.config.ts`. This keeps your test files clean while ensuring consistent test environments.
- Use inline snapshots for readable assertions - Replace complex equality checks with `expect(value).toMatchInlineSnapshot()` to capture expected output directly in your test file, making changes more visible in code reviews.
- Monitor coverage with purpose and only when asked - Configure coverage thresholds in `vitest.config.ts` to ensure critical code paths are tested, but focus on meaningful tests rather than arbitrary coverage percentages.
- Make watch mode part of your workflow - Run `vitest --watch` during development for instant feedback as you modify code, filtering tests with `-t` to focus on specific areas under development.
- Explore UI mode for complex test suites - Use `vitest --ui` to visually navigate large test suites, inspect test results, and debug failures more efficiently during development.
- Handle optional dependencies with smart mocking - Use conditional mocking to test code with optional dependencies by implementing `vi.mock()` with the factory pattern for modules that might not be available in all environments.
- Configure jsdom for DOM testing - Set `environment: 'jsdom'` in your configuration for frontend component tests and combine with testing-library utilities for realistic user interaction simulation.
- Structure tests for maintainability - Group related tests with descriptive `describe` blocks, use explicit assertion messages, and follow the Arrange-Act-Assert pattern to make tests self-documenting.
- Leverage TypeScript type checking in tests - Enable strict typing in your tests to catch type errors early, use `expectTypeOf()` for type-level assertions, and ensure mocks preserve the original type signatures.
