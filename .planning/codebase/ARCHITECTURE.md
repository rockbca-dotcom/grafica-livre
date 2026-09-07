# Architecture

**Analysis Date:** 2026-09-07

## Pattern Overview

**Overall:** Client-centric modular single-page application with context-based application services and a pluggable persistence adapter.

**Key Characteristics:**
- The browser owns routing, rendering, document generation, domain calculations, and the in-memory application snapshot; the main composition root is `src/App.tsx`.
- `src/context/DataContext.tsx` acts as the application-service boundary: pages call domain-oriented operations rather than calling storage directly.
- `src/data/adapter.ts` exposes one `DataAdapter` port with `LocalAdapter` and `SupabaseAdapter` implementations selected at runtime.
- Cloud mode is capability-driven: `src/data/supabaseClient.ts` enables it only when both required Vite variables exist; otherwise the same UI runs against `localStorage`.
- The deployable frontend is static and uses hash routing through `HashRouter` in `src/App.tsx`; no application server is required for normal navigation.
- Supabase provides optional authentication, per-user PostgreSQL persistence, an atomic numbering RPC, and the authenticated e-mail function defined in `supabase/functions/enviar-email/index.ts`.

## Layers

**Browser Bootstrap:**
- Purpose: Initialize capture/demo data and mount the React application.
- Location: `src/main.tsx`
- Contains: The `bootstrap()` function, capture-mode seed loading from `public/seed.json`, and `createRoot()`.
- Depends on: `src/App.tsx`, `src/index.css`, browser `fetch`, `localStorage`, and the DOM.
- Used by: `index.html` through the `/src/main.tsx` module script.

**Composition and Routing:**
- Purpose: Compose providers, enforce the cloud authentication gate, and map URL hashes to screens.
- Location: `src/App.tsx`
- Contains: `App`, `Gate`, `HashRouter`, nested `Routes`, redirects, and provider ordering.
- Depends on: `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, `src/context/ToastContext.tsx`, `src/components/Layout.tsx`, and every module in `src/pages/`.
- Used by: `src/main.tsx`.

**Presentation Pages:**
- Purpose: Implement complete user workflows, page-local form/modal state, derived lists, dashboards, and calls into application services.
- Location: `src/pages/`
- Contains: Authentication and marketing pages in `src/pages/Login.tsx` and `src/pages/Landing.tsx`; operational screens in `src/pages/Dashboard.tsx`, `src/pages/Clientes.tsx`, `src/pages/Itens.tsx`, `src/pages/Orcamentos.tsx`, `src/pages/Faturas.tsx`, `src/pages/Producao.tsx`, `src/pages/ContasReceber.tsx`, `src/pages/ContasPagar.tsx`, `src/pages/Relatorios.tsx`, `src/pages/Perfil.tsx`, and `src/pages/Configuracoes.tsx`.
- Depends on: Context hooks from `src/context/`, reusable UI from `src/components/`, domain types from `src/types.ts`, and pure helpers from `src/lib/`.
- Used by: Route elements declared in `src/App.tsx`.

**Reusable Presentation Components:**
- Purpose: Standardize navigation, forms, tables, modals, document previews, PIX, e-mail, and line-item editing.
- Location: `src/components/`
- Contains: Shared primitives in `src/components/ui.tsx`; application shell in `src/components/Layout.tsx`; workflow components in `src/components/ClienteSelect.tsx`, `src/components/ItensEditor.tsx`, `src/components/DocumentoView.tsx`, `src/components/PixModal.tsx`, and `src/components/EnviarEmailModal.tsx`.
- Depends on: React, router primitives, context hooks, `src/types.ts`, and `src/lib/` helpers.
- Used by: Pages in `src/pages/`; `src/components/Layout.tsx` is mounted by `src/App.tsx`.

**Application State and Use Cases:**
- Purpose: Own authenticated session state, the complete `Database` snapshot, persistence orchestration, domain transitions, and user notifications.
- Location: `src/context/`
- Contains: Supabase session lifecycle in `src/context/AuthContext.tsx`; CRUD and compound workflows in `src/context/DataContext.tsx`; transient notification state in `src/context/ToastContext.tsx`.
- Depends on: `src/data/adapter.ts`, `src/data/supabaseClient.ts`, `src/data/migrateLegacy.ts`, `src/types.ts`, and date helpers in `src/lib/dates.ts`.
- Used by: `src/App.tsx`, `src/components/`, and `src/pages/` through `useAuth`, `useData`, and `useToast`.

**Persistence Boundary:**
- Purpose: Hide the persistence backend and map frontend camelCase models to database snake_case rows.
- Location: `src/data/`
- Contains: The `DataAdapter` contract, `LocalAdapter`, `SupabaseAdapter`, row mappers, collection/table mapping, client creation, and legacy backup migration.
- Depends on: Domain contracts in `src/types.ts`, Supabase JS in `src/data/supabaseClient.ts`, and browser `localStorage` for `LocalAdapter`.
- Used by: `src/context/DataContext.tsx`; direct Supabase authentication is also used by `src/context/AuthContext.tsx`.

**Domain Model and Pure Logic:**
- Purpose: Define the canonical in-browser data model and deterministic calculations/formatting used across screens.
- Location: `src/types.ts` and `src/lib/`
- Contains: Entity interfaces and statuses in `src/types.ts`; money, date, document-total, PIX, WhatsApp, CSV, address lookup, CNPJ lookup, and document validation helpers in `src/lib/`.
- Depends on: Browser APIs for download/open/fetch operations in `src/lib/csv.ts`, `src/lib/whatsapp.ts`, `src/lib/viacep.ts`, and `src/lib/cnpj.ts`; QR generation in `src/lib/pix.ts`.
- Used by: Pages, components, the data adapter, legacy migration, and PDF generation.

**Document Generation:**
- Purpose: Build printable/downloadable commercial PDFs and delivery guides entirely in the browser.
- Location: `src/pdf/documentoPdf.ts`
- Contains: pdfmake document definitions for quotes, invoices, and delivery guides, plus download, print, and base64 APIs.
- Depends on: `pdfmake`, `src/types.ts`, `src/lib/money.ts`, and `src/lib/dates.ts`.
- Used by: Lazy dynamic imports in `src/pages/Orcamentos.tsx` and `src/pages/Faturas.tsx`, keeping the PDF bundle out of the initial page path.

**Cloud Backend Assets:**
- Purpose: Define optional PostgreSQL persistence/security and handle authenticated transactional e-mail.
- Location: `supabase/`
- Contains: Tables, indexes, Row Level Security, migrations, and `proximo_numero_documento` in `supabase/schema.sql`; the Deno/Resend handler in `supabase/functions/enviar-email/index.ts`.
- Depends on: Supabase Auth/Postgres/Edge Functions and the Resend HTTP API.
- Used by: `SupabaseAdapter` in `src/data/adapter.ts`, `AuthProvider` in `src/context/AuthContext.tsx`, and `enviarEmailDocumento` in `src/context/DataContext.tsx`.

## Data Flow

**Application Startup and Access Gate:**

1. `index.html` loads `src/main.tsx`; capture mode optionally copies `public/seed.json` into the `graficaLivre` `localStorage` key.
2. `src/main.tsx` mounts `App`, which creates `HashRouter`, `ToastProvider`, and `AuthProvider` in `src/App.tsx`.
3. `src/context/AuthContext.tsx` checks `isSupabaseConfigured` from `src/data/supabaseClient.ts`; local mode is ready immediately, while cloud mode resolves and subscribes to the Supabase session.
4. `Gate` in `src/App.tsx` renders `src/pages/Landing.tsx` or `src/pages/Login.tsx` when cloud mode has no session; otherwise it mounts `DataProvider` and the operational routes.
5. `DataProvider` in `src/context/DataContext.tsx` selects the adapter through `createAdapter(cloudMode)`, loads the complete `Database`, and exposes it to `src/components/Layout.tsx` and the active page.

**Read and Mutation Flow:**

1. A page such as `src/pages/Clientes.tsx` reads `db` and obtains an operation such as `saveCliente` from `useData()`.
2. The operation in `src/context/DataContext.tsx` delegates to `DataAdapter.upsert`, `remove`, or `saveEmpresa` in `src/data/adapter.ts`.
3. `LocalAdapter` updates its private database and persists the full JSON snapshot to `localStorage`; `SupabaseAdapter` maps the entity with `toRow()` and writes the corresponding table.
4. After persistence succeeds, the shared `run()` helper updates the React `Database` snapshot immutably, causing pages and derived `useMemo` values to render again.
5. Persistence errors are logged and surfaced through `ToastProvider`; the in-memory update is skipped when the adapter operation rejects.

**Quote to Invoice to Production:**

1. `src/pages/Orcamentos.tsx` collects a draft, delegates per-line calculations to `src/components/ItensEditor.tsx`, and computes document totals with `src/lib/documento.ts`.
2. `createOrcamento` in `src/context/DataContext.tsx` reserves the next quote number through `DataAdapter.proximoNumero`, assigns a UUID/timestamp, persists it, and advances the company counter in memory.
3. `faturarOrcamento` reserves an invoice number, creates a `Fatura`, changes the source `Orcamento` to `faturado`, and creates an `arte` `ProducaoCard` before applying one shared state update.
4. `src/pages/Faturas.tsx` records payments through `registrarPagamento`; `recomputeFaturaStatus` in `src/context/DataContext.tsx` derives `pendente`, `parcial`, or `paga` from accumulated payments.
5. `src/pages/Producao.tsx` moves cards between the stages declared by `ETAPAS_PRODUCAO` in `src/types.ts`; `moverCard` persists the updated stage/order.

**Document Preview, PDF, PIX, and E-mail:**

1. `src/pages/Orcamentos.tsx` and `src/pages/Faturas.tsx` resolve company/client/document data from `DataContext` and render an HTML preview through `src/components/DocumentoView.tsx`.
2. PDF actions dynamically import `src/pdf/documentoPdf.ts`; pdfmake downloads a quote/invoice, prints a delivery guide, or returns base64 for an attachment.
3. Invoice PIX actions build an EMV payload and QR data URL through `src/lib/pix.ts` and present it in `src/components/PixModal.tsx` or embed it in the PDF.
4. `src/components/EnviarEmailModal.tsx` converts the user message to safe basic HTML, generates the PDF, and calls `enviarEmailDocumento` with 30-second client-side timeouts.
5. `src/context/DataContext.tsx` invokes the `enviar-email` function; `supabase/functions/enviar-email/index.ts` verifies the bearer session and forwards the message/attachment to Resend.

**Backup Import and Export:**

1. `src/pages/Configuracoes.tsx` calls `exportBackup` or `importBackup` from `src/context/DataContext.tsx`.
2. Export serializes the current `Database` to a browser-downloaded JSON file.
3. Import detects the payload format with `isLegacyBackup` in `src/data/migrateLegacy.ts`; legacy records are normalized to the current interfaces in `src/types.ts`.
4. `DataAdapter.replaceAll` replaces the local snapshot or clears/reinserts the current user's Supabase collections, then `DataProvider` replaces its in-memory snapshot.

**State Management:**
- Keep persisted business state in the single `Database` snapshot owned by `src/context/DataContext.tsx`; do not introduce page-level copies as an independent source of truth.
- Keep session/loading state in `src/context/AuthContext.tsx` and transient toasts in `src/context/ToastContext.tsx`.
- Keep form drafts, modal selection, filters, search text, sort/page state, and drag interactions local to pages/components such as `src/pages/Orcamentos.tsx`, `src/pages/Faturas.tsx`, `src/pages/Producao.tsx`, and `src/components/ui.tsx`.
- Derive dashboard, report, effective-status, and filtered values from `db` using pure functions or `useMemo`, as demonstrated in `src/pages/Dashboard.tsx` and `src/pages/Relatorios.tsx`.

## Key Abstractions

**`Database` Aggregate:**
- Purpose: Represents the full application dataset available to the browser.
- Examples: `Database`, `Cliente`, `Orcamento`, `Fatura`, `Pagamento`, `ContaPagar`, `ProducaoCard`, and `Empresa` in `src/types.ts`.
- Pattern: Typed aggregate snapshot with entity IDs generated in the browser and monetary values stored as integer cents.

**`DataAdapter` Port:**
- Purpose: Give application use cases one persistence API independent of local or cloud mode.
- Examples: `DataAdapter`, `LocalAdapter`, `SupabaseAdapter`, and `createAdapter()` in `src/data/adapter.ts`.
- Pattern: Strategy/adapter selected at runtime; preserve this boundary when adding storage behavior.

**Context Service Hooks:**
- Purpose: Expose stable application capabilities without prop-drilling or direct backend access from pages.
- Examples: `useData` in `src/context/DataContext.tsx`, `useAuth` in `src/context/AuthContext.tsx`, and `useToast` in `src/context/ToastContext.tsx`.
- Pattern: Provider plus typed hook; pages consume commands and snapshots from these hooks.

**Collection Mapping:**
- Purpose: Translate domain naming to PostgreSQL schema naming.
- Examples: `TABLE_BY_COLLECTION`, `toRow()`, `fromRow()`, `empresaToRow()`, and `empresaFromRow()` in `src/data/adapter.ts`.
- Pattern: Explicit switch-based anti-corruption layer; update both directions whenever a persisted entity field changes.

**Document Pipeline:**
- Purpose: Reuse one business document across preview, PDF, PIX, WhatsApp, e-mail, and delivery output.
- Examples: `src/components/DocumentoView.tsx`, `src/pdf/documentoPdf.ts`, `src/lib/documento.ts`, `src/lib/pix.ts`, `src/lib/whatsapp.ts`, and `src/components/EnviarEmailModal.tsx`.
- Pattern: Typed document entities plus pure presentation builders; use dynamic imports from feature pages for the heavy PDF module.

**Reusable UI Primitives:**
- Purpose: Keep modal, table, field, money-input, status, header, and KPI behavior consistent.
- Examples: `Modal`, `ConfirmDialog`, `MoneyInput`, `DataTable`, `PageHeader`, and `KpiCard` in `src/components/ui.tsx`.
- Pattern: Named components in one shared module, styled with Tailwind utility classes.

## Entry Points

**Static HTML Entry:**
- Location: `index.html`
- Triggers: Static host or Vite serves the application URL.
- Responsibilities: Supply metadata, the `#root` mount point, favicon/Open Graph declarations, and load `/src/main.tsx`.

**React Entry:**
- Location: `src/main.tsx`
- Triggers: Browser module execution from `index.html`.
- Responsibilities: Seed capture mode, apply capture-only UI adjustment, and mount `App` under React `StrictMode`.

**Route Composition Entry:**
- Location: `src/App.tsx`
- Triggers: React render from `src/main.tsx` and subsequent hash changes.
- Responsibilities: Compose providers, gate authenticated cloud access, render public or protected routes, and redirect unknown paths.

**Persistence Entry:**
- Location: `src/data/adapter.ts`
- Triggers: `DataProvider` initialization and application commands in `src/context/DataContext.tsx`.
- Responsibilities: Select storage mode, load data, persist mutations, reserve document numbers, and replace backups.

**Supabase Schema Entry:**
- Location: `supabase/schema.sql`
- Triggers: Manual execution in a Supabase SQL editor during cloud setup.
- Responsibilities: Create tables, incremental columns, RLS policies, indexes, and the atomic document-number function.

**E-mail Function Entry:**
- Location: `supabase/functions/enviar-email/index.ts`
- Triggers: Authenticated `supabase.functions.invoke('enviar-email')` from `src/context/DataContext.tsx`.
- Responsibilities: Handle CORS, authenticate the caller, validate the request, submit to Resend, and normalize HTTP responses.

## Error Handling

**Strategy:** Reject at infrastructure boundaries, show recoverable failures as toasts, and keep the in-memory snapshot synchronized only after successful persistence.

**Patterns:**
- Use the `run()` wrapper in `src/context/DataContext.tsx` for adapter-backed mutations; it logs the original failure, shows a normalized error toast, and rethrows to the page.
- Return user-facing error strings from authentication commands in `src/context/AuthContext.tsx`; `src/pages/Login.tsx` decides how to present them.
- Throw when a context hook is used outside its provider in `src/context/AuthContext.tsx` and `src/context/DataContext.tsx`.
- Convert storage/backup parsing failures into rejected promises in `src/data/adapter.ts`, `src/data/migrateLegacy.ts`, and `src/context/DataContext.tsx`; callers surface the message.
- Bound PDF and e-mail work with client-side timeouts in `src/components/EnviarEmailModal.tsx`.
- Return structured JSON with explicit HTTP status codes for method, auth, payload, configuration, network, and provider failures in `supabase/functions/enviar-email/index.ts`.
- Treat capture seeding as best-effort in `src/main.tsx`; failure is intentionally ignored so rendering continues.

## Cross-Cutting Concerns

**Logging:** Use `console.error` at the application-service boundary in `src/context/DataContext.tsx`; the e-mail function reports failures through structured responses from `supabase/functions/enviar-email/index.ts`. No centralized logger is present.

**Validation:** Use native required/type constraints and page-level guards in `src/pages/`; reusable CPF/CNPJ/phone/CEP checks live in `src/lib/validation.ts`, document math in `src/lib/documento.ts`, and the e-mail function validates required request fields in `supabase/functions/enviar-email/index.ts`.

**Authentication:** `src/context/AuthContext.tsx` owns Supabase session setup and auth commands. `Gate` in `src/App.tsx` protects all operational routes in cloud mode. `supabase/schema.sql` enforces per-user RLS using `auth.uid()`, and `supabase/functions/enviar-email/index.ts` independently verifies the caller's bearer token.

**Authorization and Data Isolation:** Every cloud table in `supabase/schema.sql` carries `user_id`; the shared `dono` policy limits reads and writes to the authenticated owner. `src/data/adapter.ts` relies on those policies instead of passing explicit user filters for every query.

**Monetary Precision:** Store and calculate currency as integer cents in `src/types.ts`, `src/lib/money.ts`, `src/lib/documento.ts`, `src/components/ItensEditor.tsx`, and bigint columns in `supabase/schema.sql`; convert to reais only for display and chart inputs.

**Responsive Styling:** Use Tailwind CSS utility classes directly in `src/pages/` and `src/components/`; global reset, typography, capture animation, and print exceptions live in `src/index.css`.

---

*Architecture analysis: 2026-09-07*
