# Testing Patterns

**Analysis Date:** 2026-09-07

## Test Framework

**Runner:**
- Not detected. `package.json` has `dev`, `build`, `lint`, and `preview` scripts, but no `test` script or test-runner dependency.
- Config: Not detected. No `vitest.config.*`, `jest.config.*`, `playwright.config.*`, or `cypress.config.*` file exists at the repository root.

**Assertion Library:**
- Not detected in `package.json`; there is no Vitest, Jest, Chai, Testing Library, Playwright, or Cypress dependency.

**Run Commands:**
```bash
npm run lint           # Static lint checks through Oxlint; not a test suite
npm run build          # TypeScript project build plus Vite production build
# npm test             # Not available: package.json defines no test script
```

## Test File Organization

**Location:**
- Not detected. No co-located `*.test.*`/`*.spec.*` files, `__tests__/` directory, or separate test tree exists under `src/` or `supabase/`.
- Production code is organized under `src/components/`, `src/context/`, `src/data/`, `src/lib/`, and `src/pages/`; none of these directories currently contains automated tests.

**Naming:**
- Not applicable. The repository contains no established automated-test filename convention.
- When a test framework is introduced, choose and enforce one pattern before adding files; the current codebase offers no competing legacy naming scheme.

**Structure:**
```text
src/                   # Production code only
supabase/functions/    # Edge Function production code only
public/seed.json       # Capture/demo seed data, not a test fixture suite
```

## Test Structure

**Suite Organization:**
```typescript
// Not detected: no describe(), it(), test(), or expect() suites exist in
// `src/` or `supabase/`.
```

**Patterns:**
- Setup pattern: Not detected; there is no test setup module or DOM environment configuration in `package.json`.
- Teardown pattern: Not detected; no test lifecycle hooks exist in the repository.
- Assertion pattern: Not detected; correctness checks currently come from TypeScript compilation via `tsconfig.app.json`/`tsconfig.node.json` and Oxlint via `.oxlintrc.json`.
- Browser rendering is manually exercised through Vite using the `dev` and `preview` scripts in `package.json`.

## Mocking

**Framework:** Not detected

**Patterns:**
```typescript
// No mocking API or mock modules are present.
// Production boundaries that would require test doubles are `DataAdapter` in
// `src/data/adapter.ts`, Supabase access in `src/data/supabaseClient.ts`, and
// browser globals used by `src/context/DataContext.tsx`.
```

**What to Mock:**
- No repository-wide mocking rule exists. The explicit `DataAdapter` interface in `src/data/adapter.ts` is the primary seam for isolating React/domain behavior from localStorage and Supabase when tests are added.
- External/network boundaries are concentrated in `src/data/supabaseClient.ts`, `src/data/adapter.ts`, `src/lib/viacep.ts`, and `supabase/functions/enviar-email/index.ts`; automated tests do not currently substitute them.
- Browser side effects appear in `src/main.tsx`, `src/context/DataContext.tsx`, and `src/data/adapter.ts` through `fetch`, `localStorage`, `document`, `URL`, and downloads; there is no configured DOM test environment.

**What NOT to Mock:**
- No established rule exists. Pure transformations such as `emailsDoCliente` in `src/types.ts`, `emptyDatabase`/row mapping behavior in `src/data/adapter.ts`, and legacy conversion in `src/data/migrateLegacy.ts` are natural direct-test candidates because they do not require component mocking.
- Domain value helpers under `src/lib/` should be exercised directly once a runner exists; no tests or mocks currently cover these modules.

## Fixtures and Factories

**Test Data:**
```typescript
// No test fixture factory is implemented.
// Runtime entities are constructed inline with typed object literals in
// `src/context/DataContext.tsx` and `src/data/migrateLegacy.ts`.
```

**Location:**
- Not detected. There is no `fixtures/`, `factories/`, or test-data module.
- `public/seed.json` supplies browser capture/demo state through `src/main.tsx` when `import.meta.env.MODE === 'capture'`; do not treat it as isolated or resettable automated-test data.
- `EMPRESA_PADRAO` in `src/types.ts` and `emptyDatabase()` in `src/data/adapter.ts` are reusable production defaults, not test-only fixtures.

## Coverage

**Requirements:** None enforced. `package.json` defines no coverage command, threshold, provider, or reporting dependency.

**View Coverage:**
```bash
# Not available: no coverage provider or npm script is configured in package.json.
```

- No coverage artifacts or configuration are present; coverage percentage is unknown for all code under `src/` and `supabase/`.
- `npm run build` validates typing/buildability but does not measure executed branches or behavior.

## Test Types

**Unit Tests:**
- Not used. There are no tests for pure formatting/validation/business helpers under `src/lib/`, `src/types.ts`, or `src/data/migrateLegacy.ts`.
- High-value unit boundaries include money/date/document calculations in `src/lib/`, email de-duplication in `src/types.ts`, migration normalization in `src/data/migrateLegacy.ts`, and local persistence behavior in `src/data/adapter.ts`; these boundaries currently rely on manual verification.

**Integration Tests:**
- Not used. No automated checks exercise `DataProvider` with `DataAdapter`, authentication through `src/context/AuthContext.tsx`, or Supabase CRUD/RPC behavior in `src/data/adapter.ts`.
- The two storage modes—localStorage through `LocalAdapter` and Supabase through `SupabaseAdapter` in `src/data/adapter.ts`—share a contract but have no contract test proving equivalent behavior.
- The Edge Function at `supabase/functions/enviar-email/index.ts` has no request/response or service-integration test.

**E2E Tests:**
- Not used. No Playwright/Cypress dependency or browser-test configuration appears in `package.json` or the repository root.
- User flows routed by `src/App.tsx`—login, budgets, invoices, production, receivables, payables, clients, items, reports, profile, and settings—are not covered by automated browser scenarios.

## Common Patterns

**Async Testing:**
```typescript
// Not detected. Async production code currently uses Promise-returning adapter
// methods in `src/data/adapter.ts` and async context actions in
// `src/context/DataContext.tsx`, but no test runner awaits them.
```

- The async paths requiring eventual coverage include Supabase auth in `src/context/AuthContext.tsx`, data mutations and email invocation in `src/context/DataContext.tsx`, CRUD/RPC calls in `src/data/adapter.ts`, and the Edge Function in `supabase/functions/enviar-email/index.ts`.
- Until a runner is configured, use both `npm run lint` and `npm run build` as the repository's available automated quality gates from `package.json`.

**Error Testing:**
```typescript
// Not detected. Throwing branches such as an unavailable DataProvider in
// `src/context/DataContext.tsx` and invalid legacy backups in
// `src/data/migrateLegacy.ts` have no automated assertions.
```

- Error paths currently include invariant throws in `src/context/AuthContext.tsx`/`src/context/DataContext.tsx`, adapter failures in `src/data/adapter.ts`, migration validation in `src/data/migrateLegacy.ts`, and fallback catches in `src/main.tsx`/`src/data/adapter.ts`.
- No snapshot tests, error-boundary tests, rejection assertions, network-failure simulations, or malformed-backup tests are present.

---

*Testing analysis: 2026-09-07*
