# Coding Conventions

**Analysis Date:** 2026-09-07

## Naming Patterns

**Files:**
- Use PascalCase for React components and route pages: `src/components/ClienteSelect.tsx`, `src/components/DocumentoView.tsx`, `src/pages/ContasReceber.tsx`, and `src/pages/Configuracoes.tsx`.
- Use camelCase for non-component TypeScript modules: `src/data/supabaseClient.ts`, `src/data/migrateLegacy.ts`, `src/lib/documento.ts`, and `src/lib/whatsapp.ts`.
- Name React context modules with the `Context.tsx` suffix: `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, and `src/context/ToastContext.tsx`.
- Keep shared domain declarations in the generic plural module `src/types.ts`; no feature-local type modules or barrel files are present.

**Functions:**
- Use PascalCase for React components and providers, such as `App`, `Gate`, `AuthProvider`, `DataProvider`, `Modal`, and `DataTable` in `src/App.tsx`, `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, and `src/components/ui.tsx`.
- Prefix context hooks with `use`, as in `useAuth`, `useData`, and `useToast` in `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, and `src/context/ToastContext.tsx`.
- Use camelCase for business helpers and adapter operations, including `emailsDoCliente` in `src/types.ts`, `ordemTopo` in `src/context/DataContext.tsx`, `emptyDatabase` in `src/data/adapter.ts`, and `migrateLegacyBackup` in `src/data/migrateLegacy.ts`.
- Domain names are predominantly Portuguese (`clienteById`, `faturarOrcamento`, `registrarPagamento`) while framework and infrastructure vocabulary remains English (`bootstrap`, `load`, `upsert`) in `src/context/DataContext.tsx`, `src/main.tsx`, and `src/data/adapter.ts`.

**Variables:**
- Use camelCase for local variables, props, and object properties: `dataVencimento`, `formaPagamento`, `proximoNumFatura`, and `emailsAdicionais` in `src/context/DataContext.tsx` and `src/types.ts`.
- Use concise callback variables only in tight collection operations (`c`, `f`, `p`, `r`), as seen in `src/context/DataContext.tsx` and `src/data/adapter.ts`; use domain names for values that survive beyond a callback.
- Use boolean names that state a condition, such as `cloudMode`, `loading`, `ready`, `isSupabaseConfigured`, `ordenavel`, and `ativo` in `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, `src/data/supabaseClient.ts`, and `src/components/ui.tsx`.
- Use UPPER_SNAKE_CASE for module-level lookup tables and fixed collections: `BUTTON_STYLES`, `STATUS_STYLES`, `STATUS_LABELS`, `PAGE_SIZE`, `LOCAL_KEY`, `TABLE_BY_COLLECTION`, and `COLLECTIONS` in `src/components/ui.tsx` and `src/data/adapter.ts`.

**Types:**
- Use PascalCase singular names for interfaces and type aliases: `Cliente`, `DocumentoItem`, `FaturaStatus`, `DataAdapter`, and `AuthContextValue` in `src/types.ts`, `src/data/adapter.ts`, and `src/context/AuthContext.tsx`.
- Model finite domain states with string-literal unions rather than enums, for example `OrcamentoStatus`, `FormaPagamento`, and `EtapaProducao` in `src/types.ts`.
- Add generic constraints where required by shared UI/data behavior, as in `DataTable<T extends { id: string }>` in `src/components/ui.tsx` and `upsertIn<T extends { id: string }>` in `src/context/DataContext.tsx`.
- Use `import type` for type-only dependencies, enforced by `verbatimModuleSyntax` in `tsconfig.app.json`; examples appear in `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, and `src/data/adapter.ts`.

## Code Style

**Formatting:**
- No Prettier, Biome, or other formatter configuration is present in the repository root; formatting is maintained manually across `src/**/*.ts` and `src/**/*.tsx`.
- Match the established style: two-space indentation, single-quoted strings, no semicolons, and trailing commas in multiline argument/object/array lists, as demonstrated by `src/App.tsx`, `src/components/ui.tsx`, and `vite.config.ts`.
- Keep JSX props on separate lines when a component or intrinsic element has several props; retain compact one-line JSX only for short leaf elements, following `src/components/ui.tsx`.
- Wrap long function signatures and conditional expressions across lines, following `src/context/DataContext.tsx` and `src/data/migrateLegacy.ts`.

**Linting:**
- Run `npm run lint`, which executes Oxlint through the `lint` script in `package.json`.
- Preserve React hook correctness: `react/rules-of-hooks` is an error in `.oxlintrc.json`.
- Avoid mixing non-component exports into hot-reloaded component modules unless they are constants: `react/only-export-components` is a warning with `allowConstantExport: true` in `.oxlintrc.json`.
- Treat unused locals, unused parameters, and fallthrough switch cases as compile-time failures under `tsconfig.app.json` and `tsconfig.node.json`.
- Keep syntax compatible with TypeScript's `erasableSyntaxOnly` and bundler resolution settings in `tsconfig.app.json`.

## Import Organization

**Order:**
1. Import React/framework/runtime values first, as in `src/App.tsx`, `src/components/ui.tsx`, and `src/context/AuthContext.tsx`.
2. Place type-only imports immediately after related runtime imports, using `import type`, as in `src/components/ui.tsx` and `src/context/DataContext.tsx`.
3. Import project modules with relative paths, generally moving from domain/data modules to contexts or local helpers, as in `src/context/DataContext.tsx` and `src/data/adapter.ts`.
4. Import stylesheet side effects before the application component at the entry point, as in `src/main.tsx`.

**Path Aliases:**
- Not detected. Use relative paths such as `../lib/dates`, `../data/adapter`, and `./context/AuthContext`; no alias is configured in `tsconfig.app.json` or `vite.config.ts`.
- Source imports normally omit extensions (`./context/AuthContext`), while `src/main.tsx` explicitly imports `./App.tsx`; follow the dominant extensionless convention for new internal imports.

## Error Handling

**Patterns:**
- Throw when an invariant or required infrastructure precondition fails. `useAuth` and `useData` throw outside their providers in `src/context/AuthContext.tsx` and `src/context/DataContext.tsx`; `SupabaseAdapter` throws for missing configuration/session and malformed RPC results in `src/data/adapter.ts`.
- Let adapter methods propagate Supabase failures after checking returned `error` values in `src/data/adapter.ts`; do not silently accept failed persistence.
- Route data mutations through the `run` helper in `src/context/DataContext.tsx`. It awaits persistence, updates React state immutably, logs the original error, shows a user-facing toast, and rethrows for callers that need local handling.
- Return `string | null` for expected authentication failures in `src/context/AuthContext.tsx`: authentication methods translate Supabase errors into messages rather than throwing.
- Use silent fallback catches only for explicitly recoverable initialization. `src/main.tsx` ignores failure to load capture seed data, and `LocalAdapter.load` resets invalid local JSON to `emptyDatabase()` in `src/data/adapter.ts`.
- Validate imported legacy data before conversion and throw a Portuguese user-facing error for invalid input in `src/data/migrateLegacy.ts`.

## Logging

**Framework:** console

**Patterns:**
- Use `console.error(err)` only at the context boundary where persistence/load failures are also converted into user-facing toast messages in `src/context/DataContext.tsx`.
- No structured logger, log levels, remote log transport, or instrumentation wrapper is present in `package.json` or `src/`.
- Avoid routine debug logging; the scanned source contains error logging but no persistent `console.log` convention in `src/`.

## Comments

**When to Comment:**
- Write comments in Portuguese and explain business representation or non-obvious technical constraints, such as centavos/meters/date formats in `src/types.ts` and the PostgreSQL integer limit behind `ordemTopo` in `src/context/DataContext.tsx`.
- Document adapter operations whose atomicity or destructive scope matters, such as `proximoNumero` and `replaceAll` in `src/data/adapter.ts`.
- Prefer short inline comments for field units and mappings, and block comments for multi-line rationale, following `src/types.ts` and `src/data/migrateLegacy.ts`.

**JSDoc/TSDoc:**
- Use `/** ... */` for exported helpers, context methods, public adapter contracts, and reusable component props whose behavior is not obvious from the type alone. Examples include `emailsDoCliente` in `src/types.ts`, `ordemTopo` in `src/context/DataContext.tsx`, and `DataAdapter.proximoNumero` in `src/data/adapter.ts`.
- Public types are not exhaustively documented; add TSDoc selectively for units, side effects, atomicity, and lifecycle behavior rather than repeating the signature.

## Function Design

**Size:**
- Keep reusable UI primitives focused on one behavior in `src/components/ui.tsx`, but allow provider factories to compose domain operations in one memoized context value in `src/context/DataContext.tsx`.
- Extract pure business transformations from UI/provider code when reusable or independently meaningful, as with `emailsDoCliente` in `src/types.ts`, `tituloCardFatura` in `src/context/DataContext.tsx`, and row conversion helpers in `src/data/adapter.ts`.
- Use early returns for absent prerequisites and empty work (`if (!supabase) return`, `if (!o) return`, `if (faltando.length === 0) return`) in `src/context/AuthContext.tsx` and `src/context/DataContext.tsx`.

**Parameters:**
- Destructure React component props in the function signature and define small prop object types inline, following `src/components/ui.tsx` and `src/context/AuthContext.tsx`.
- Use named interfaces for broad shared contracts, such as `DataContextValue` and `DataAdapter` in `src/context/DataContext.tsx` and `src/data/adapter.ts`.
- Use domain types and utility types (`Pick`, `Omit`, indexed access types) instead of duplicating object shapes, as in `src/types.ts` and `src/context/DataContext.tsx`.

**Return Values:**
- Return promises from all persistence operations, even for the synchronous local-storage implementation, to keep both adapters compatible in `src/data/adapter.ts`.
- Return immutable copies from state/data helpers using object spread, array spread, `filter`, and `structuredClone` in `src/context/DataContext.tsx` and `src/data/adapter.ts`.
- Use `null` for expected absence in persisted domain fields and `undefined` for collection lookup misses, matching `Fatura.orcamentoId`, `ProducaoCard.dataEntrega`, and `clienteById` in `src/types.ts` and `src/context/DataContext.tsx`.

## Module Design

**Exports:**
- Prefer named exports for reusable components, hooks, types, constants, helpers, adapters, and providers in `src/components/ui.tsx`, `src/context/*.tsx`, `src/types.ts`, and `src/data/*.ts`.
- Use default exports at application/route component boundaries; `src/App.tsx` exports `App` as default and imports route modules as defaults.
- Keep infrastructure details private unless consumed elsewhere: mapping functions and constants in `src/data/adapter.ts` remain module-local, while `DataAdapter`, adapters, and `createAdapter` are exported.

**Barrel Files:**
- Not used. Import directly from concrete modules such as `../types`, `../data/adapter`, and `../lib/dates`, following `src/context/DataContext.tsx`.
- Do not introduce an `index.ts` barrel without a clear cross-feature need; the current module graph relies on direct imports and `verbatimModuleSyntax` from `tsconfig.app.json`.

---

*Convention analysis: 2026-09-07*
