# Codebase Structure

**Analysis Date:** 2026-09-07

## Directory Layout

```text
grafica-livre/
├── .planning/
│   └── codebase/                 # GSD codebase reference documents
├── public/
│   ├── icons.svg                 # Public icon sprite
│   ├── favicon.svg               # Browser icon
│   ├── og.png                    # Social sharing image
│   └── seed.json                 # Capture-mode local database seed
├── src/
│   ├── assets/
│   │   └── screens/              # Landing-page product screenshots
│   ├── components/               # Shared UI and cross-page workflows
│   ├── context/                  # Auth, data/application service, and toast providers
│   ├── data/                     # Storage adapters, Supabase client, legacy migration
│   ├── lib/                      # Small domain and browser integration helpers
│   ├── pages/                    # One routed screen module per feature area
│   ├── pdf/                      # Client-side PDF document definitions
│   ├── App.tsx                   # Provider composition and route map
│   ├── index.css                 # Tailwind import and global CSS
│   ├── main.tsx                  # Browser bootstrap
│   └── types.ts                  # Canonical business entities and status types
├── supabase/
│   ├── functions/
│   │   └── enviar-email/
│   │       └── index.ts          # Authenticated Resend Edge Function
│   └── schema.sql                # Tables, RLS, indexes, and numbering RPC
├── index.html                    # Static HTML shell and metadata
├── package.json                  # Scripts and JavaScript dependencies
├── package-lock.json             # Locked npm dependency graph
├── vite.config.ts                # Vite, React, and Tailwind plugins
├── tsconfig.json                 # TypeScript project references
├── tsconfig.app.json             # Browser application compiler rules
├── tsconfig.node.json            # Vite configuration compiler rules
├── .oxlintrc.json                # oxlint configuration
├── README.md                     # Project overview and setup
├── COMO-USAR.md                  # End-user operating guide
├── DEPLOY.md                     # Deployment instructions
├── start.bat                     # Windows development launcher
└── start.sh                      # Unix development launcher
```

## Directory Purposes

**`src/pages/`:**
- Purpose: House route-level screens; each default export corresponds to a route or an authentication/marketing screen.
- Contains: Page composition, local draft/filter/modal state, feature-specific event handlers, derived view data, and calls to context commands.
- Key files: `src/pages/Landing.tsx`, `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Clientes.tsx`, `src/pages/Itens.tsx`, `src/pages/Orcamentos.tsx`, `src/pages/Faturas.tsx`, `src/pages/Producao.tsx`, `src/pages/ContasReceber.tsx`, `src/pages/ContasPagar.tsx`, `src/pages/Relatorios.tsx`, `src/pages/Perfil.tsx`, and `src/pages/Configuracoes.tsx`.

**`src/components/`:**
- Purpose: House reusable view building blocks and workflows used by more than one screen.
- Contains: Layout/navigation, generic UI controls, data tables, modal workflows, document preview, customer selection, document line editing, PIX display, and e-mail composition.
- Key files: `src/components/ui.tsx`, `src/components/Layout.tsx`, `src/components/ClienteSelect.tsx`, `src/components/ItensEditor.tsx`, `src/components/DocumentoView.tsx`, `src/components/PixModal.tsx`, and `src/components/EnviarEmailModal.tsx`.

**`src/context/`:**
- Purpose: Define global React boundaries for authenticated identity, application data/use cases, and transient notifications.
- Contains: Provider components, public context value interfaces, hook accessors, session listeners, the shared `Database` snapshot, and persistence orchestration.
- Key files: `src/context/AuthContext.tsx`, `src/context/DataContext.tsx`, and `src/context/ToastContext.tsx`.

**`src/data/`:**
- Purpose: Isolate persistence concerns from presentation and use cases.
- Contains: The `DataAdapter` interface, local and Supabase implementations, domain/database row translation, Supabase client configuration, and import migration logic.
- Key files: `src/data/adapter.ts`, `src/data/supabaseClient.ts`, and `src/data/migrateLegacy.ts`.

**`src/lib/`:**
- Purpose: Provide narrowly scoped reusable logic that does not own React state.
- Contains: Currency conversion, date handling, quote/invoice totals, CPF/CNPJ/phone/CEP validation, ViaCEP and CNPJ lookup clients, PIX/QR generation, WhatsApp links/messages, and CSV download.
- Key files: `src/lib/money.ts`, `src/lib/dates.ts`, `src/lib/documento.ts`, `src/lib/validation.ts`, `src/lib/viacep.ts`, `src/lib/cnpj.ts`, `src/lib/pix.ts`, `src/lib/whatsapp.ts`, and `src/lib/csv.ts`.

**`src/pdf/`:**
- Purpose: Keep the heavy pdfmake integration and document definitions outside route/page modules.
- Contains: Quote, invoice, and delivery-guide builders plus download, print, and base64 entry points.
- Key files: `src/pdf/documentoPdf.ts`.

**`src/assets/`:**
- Purpose: Store assets imported into the Vite module graph.
- Contains: Product screenshots used by `src/pages/Landing.tsx` in `src/assets/screens/` and the scaffold asset `src/assets/vite.svg`.
- Key files: `src/assets/screens/dashboard.webp`, `src/assets/screens/orcamentos.webp`, and `src/assets/screens/faturas.webp`.

**`public/`:**
- Purpose: Store files copied to the deployment root without module processing.
- Contains: Social metadata image, favicon/icon assets, and capture-mode seed data.
- Key files: `public/og.png`, `public/favicon.svg`, `public/icons.svg`, and `public/seed.json`.

**`supabase/`:**
- Purpose: Version the optional cloud backend alongside the static frontend.
- Contains: PostgreSQL DDL/RLS/RPC/index definitions and deployable Deno Edge Functions.
- Key files: `supabase/schema.sql` and `supabase/functions/enviar-email/index.ts`.

**`.planning/codebase/`:**
- Purpose: Store generated current-state maps consumed by GSD planning and execution.
- Contains: Markdown references such as `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/STRUCTURE.md`.
- Key files: `.planning/codebase/ARCHITECTURE.md` and `.planning/codebase/STRUCTURE.md`.

## Key File Locations

**Entry Points:**
- `index.html`: Static page shell, SEO/social metadata, root element, and module script.
- `src/main.tsx`: Capture-mode setup and React DOM mount.
- `src/App.tsx`: Provider order, authentication gate, complete route map, and fallbacks.
- `supabase/functions/enviar-email/index.ts`: HTTP entry point for optional document e-mail delivery.

**Configuration:**
- `package.json`: Development/build/lint scripts and dependency declarations.
- `package-lock.json`: Exact npm resolution used by the project.
- `vite.config.ts`: React and Tailwind Vite plugin registration.
- `tsconfig.json`: Root TypeScript project references.
- `tsconfig.app.json`: ES2023 browser compilation and strict unused/fallthrough checks.
- `tsconfig.node.json`: Type checking for Vite configuration code.
- `.oxlintrc.json`: Linter rules and environment configuration.
- `.env.example`: Environment configuration template is present; do not commit a populated `.env` file.

**Core Logic:**
- `src/types.ts`: Canonical entity/status contracts, production stages, and default company profile.
- `src/context/DataContext.tsx`: Central application commands, compound workflow orchestration, and global database snapshot.
- `src/data/adapter.ts`: Persistence port, storage strategies, and field mapping.
- `src/data/migrateLegacy.ts`: Detection and normalization for older backup JSON.
- `src/lib/documento.ts`: Quote/invoice subtotal, tax, discount, freight, and total calculations.
- `src/components/ItensEditor.tsx`: Line-item square-meter/unit/total recalculation and catalog selection.
- `src/pdf/documentoPdf.ts`: Commercial document generation.
- `supabase/schema.sql`: Cloud data shape, isolation policies, indexes, and atomic numbering.

**Authentication and Access:**
- `src/data/supabaseClient.ts`: Detects cloud configuration and creates the optional client.
- `src/context/AuthContext.tsx`: Session subscription and sign-in/sign-up/reset/sign-out commands.
- `src/App.tsx`: Public-versus-operational route gate.
- `src/pages/Login.tsx`: Cloud authentication form.
- `supabase/schema.sql`: Per-user Row Level Security.

**Shared UI:**
- `src/components/ui.tsx`: Modal, confirmation, button, fields, money input, badges, table, page header, cards, KPIs, and search.
- `src/components/Layout.tsx`: Responsive navigation and routed content outlet.
- `src/index.css`: Tailwind entry and small global rules.

**Feature Routes:**
- `src/pages/Dashboard.tsx`: KPIs, six-month chart, quote funnel, due dates, and recent quotes.
- `src/pages/Clientes.tsx`: Customer CRUD, address/company lookup, and exported quick-create form fields.
- `src/pages/Itens.tsx`: Product/service catalog CRUD and exported quick-create form fields.
- `src/pages/Orcamentos.tsx`: Quote CRUD, duplication, status, PDF/e-mail/WhatsApp, and invoice conversion.
- `src/pages/Faturas.tsx`: Invoice CRUD, receipts, PIX, PDF/e-mail/WhatsApp, and delivery guide.
- `src/pages/Producao.tsx`: Production kanban and stage/order updates.
- `src/pages/ContasReceber.tsx`: Open receivables derived from invoices and payments.
- `src/pages/ContasPagar.tsx`: Payable CRUD and payment state.
- `src/pages/Relatorios.tsx`: Derived financial and commercial reports plus CSV exports.
- `src/pages/Perfil.tsx`: Company identity, contact, logo, PIX, and document defaults.
- `src/pages/Configuracoes.tsx`: JSON backup import/export and local/cloud status.
- `src/pages/Landing.tsx`: Public product landing screen in unauthenticated cloud mode.

**Testing:**
- Not detected: there is no test directory, test configuration, or `*.test.*`/`*.spec.*` suite in the mapped project.

**Documentation and Operations:**
- `README.md`: Installation, local/cloud modes, e-mail setup, and stack overview.
- `COMO-USAR.md`: Operator-facing usage instructions.
- `DEPLOY.md`: Hosting and cloud deployment guidance.
- `start.bat`: Windows development bootstrap.
- `start.sh`: Linux/macOS development bootstrap.

## Naming Conventions

**Files:**
- Use PascalCase `.tsx` names for routed pages and React components: `src/pages/Orcamentos.tsx`, `src/components/DocumentoView.tsx`, and `src/context/DataContext.tsx`.
- Use camelCase `.ts` names for helpers and data modules: `src/lib/documento.ts`, `src/lib/whatsapp.ts`, `src/data/supabaseClient.ts`, and `src/data/migrateLegacy.ts`.
- Use descriptive Portuguese feature names for business modules and identifiers: `src/pages/ContasReceber.tsx`, `src/components/ItensEditor.tsx`, and `src/pdf/documentoPdf.ts`.
- Keep a single route-level default component per page file; helper components/functions may be named exports when reused, as in `ClienteFormFields` from `src/pages/Clientes.tsx` and `ItemFormFields` from `src/pages/Itens.tsx`.
- Use `index.ts` only where the deployment platform expects it, as in `supabase/functions/enviar-email/index.ts`.

**Directories:**
- Use lowercase functional directories under `src/`: `src/pages/`, `src/components/`, `src/context/`, `src/data/`, `src/lib/`, and `src/pdf/`.
- Use lowercase kebab-case for deployable function names: `supabase/functions/enviar-email/`.
- Use plural directories for collections of modules/assets: `src/pages/`, `src/components/`, `src/assets/screens/`, and `supabase/functions/`.

**Code Symbols:**
- Use PascalCase for React components, interfaces, entity types, and providers: `DataProvider`, `DocumentoView`, `Database`, and `ProducaoCard`.
- Use camelCase for functions, hooks, variables, props, and domain fields: `createOrcamento`, `clienteById`, `valorPago`, and `dataVencimento`.
- Prefix hooks with `use`: `useData`, `useAuth`, and `useToast`.
- Use uppercase snake case for module constants: `EMPRESA_PADRAO`, `ETAPAS_PRODUCAO`, `TABLE_BY_COLLECTION`, and `LOCAL_KEY`.
- Use snake_case only at the database/HTTP boundary: `cliente_id`, `criado_em`, `proximo_numero_documento`, and `reply_to`; translate explicitly in `src/data/adapter.ts` and `supabase/functions/enviar-email/index.ts`.

## Where to Add New Code

**New Routed Feature:**
- Primary code: Add a PascalCase page to `src/pages/`, following `src/pages/ContasPagar.tsx` for CRUD or `src/pages/Dashboard.tsx` for derived reporting.
- Route: Import and register the page in the protected route tree in `src/App.tsx`.
- Navigation: Add the destination to `NAV` in `src/components/Layout.tsx` when it should appear in the application sidebar.
- Tests: No established test location exists; when introducing tests, colocate `*.test.ts`/`*.test.tsx` with the source or establish a documented top-level test directory and runner configuration consistently.

**New Persisted Entity or Collection:**
- Domain model: Add the interface and `Database` collection in `src/types.ts`.
- Application commands: Expose read/mutation operations from `DataContextValue` and implement them in `src/context/DataContext.tsx`.
- Persistence: Extend `CollectionName`, `CollectionRow`, `emptyDatabase`, `TABLE_BY_COLLECTION`, `toRow`, `fromRow`, and `COLLECTIONS` in `src/data/adapter.ts`.
- Cloud schema: Add the table, RLS coverage, and indexes in `supabase/schema.sql`.
- Backup migration: Update `src/data/migrateLegacy.ts` only when older backup formats need a defined mapping for the collection.

**New Component/Module:**
- Generic visual primitive: Add a named export to `src/components/ui.tsx` when the abstraction is as broad as `Button`, `Modal`, or `DataTable`.
- Cross-page business component: Add a PascalCase file under `src/components/`, following `src/components/ClienteSelect.tsx` or `src/components/ItensEditor.tsx`.
- Page-only UI: Keep the helper component in its owning `src/pages/*.tsx` file until reuse is real; extract to `src/components/` when multiple pages need it.
- Application-wide state/service: Add a provider under `src/context/` and compose it deliberately in `src/App.tsx`.

**Utilities:**
- Shared pure helpers: Add narrowly scoped camelCase modules under `src/lib/`, following `src/lib/money.ts`, `src/lib/dates.ts`, or `src/lib/documento.ts`.
- Browser/API helper: Add it under `src/lib/` when it is small and stateless, following `src/lib/viacep.ts`, `src/lib/cnpj.ts`, or `src/lib/whatsapp.ts`.
- Persistence-specific translation or backend calls: Keep them in `src/data/`, not in `src/pages/`.

**New Document Output:**
- PDF definition/output: Extend or split from `src/pdf/documentoPdf.ts`; expose typed functions and import the module dynamically from its owning page.
- On-screen preview: Add reusable presentation under `src/components/`, following `src/components/DocumentoView.tsx`.
- Domain calculation shared by HTML and PDF: Put it in `src/lib/`, following `src/lib/documento.ts`.

**New External Server Operation:**
- Browser call: Expose it as an application command in `src/context/DataContext.tsx` when pages need authenticated workflow behavior.
- Edge handler: Add `supabase/functions/<kebab-case-name>/index.ts`, following `supabase/functions/enviar-email/index.ts` for CORS, auth, validation, and structured responses.
- Database operation requiring concurrency guarantees: Add a PostgreSQL function to `supabase/schema.sql` and call it through `SupabaseAdapter` in `src/data/adapter.ts`, following `proximo_numero_documento`.

## Special Directories

**`public/`:**
- Purpose: Static root assets and deterministic capture data.
- Generated: No.
- Committed: Yes; files such as `public/seed.json` and `public/og.png` are source assets.

**`src/assets/screens/`:**
- Purpose: Product screenshots imported by the public landing page in `src/pages/Landing.tsx`.
- Generated: No build generation is configured.
- Committed: Yes.

**`supabase/functions/`:**
- Purpose: Independently deployable Deno Edge Functions for trusted external-service operations.
- Generated: No.
- Committed: Yes.

**`.planning/codebase/`:**
- Purpose: Machine-consumable current-state architecture, structure, stack, quality, and concern maps.
- Generated: Yes, by GSD codebase mapping.
- Committed: Determined by the orchestrating workflow; these files are intended as project planning artifacts.

**`dist/`:**
- Purpose: Static production build output from the Vite build declared in `package.json`.
- Generated: Yes.
- Committed: No; it is excluded by `.gitignore` and is not present in the mapped source tree.

**`node_modules/`:**
- Purpose: Installed npm dependencies resolved by `package-lock.json`.
- Generated: Yes.
- Committed: No; it is excluded by `.gitignore` and is not part of the source structure.

---

*Structure analysis: 2026-09-07*
