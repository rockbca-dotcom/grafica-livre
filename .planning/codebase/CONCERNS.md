# Codebase Concerns

**Analysis Date:** 2026-09-07

## Tech Debt

**Dual persistence implementations require lockstep changes:**
- Issue: Domain fields are repeated across TypeScript types, local persistence, Supabase serialization/deserialization, SQL schema, legacy migration, and backup import. There is no runtime schema shared by these paths.
- Files: `src/types.ts`, `src/data/adapter.ts`, `src/data/migrateLegacy.ts`, `supabase/schema.sql`, `src/context/DataContext.tsx`
- Impact: Adding or renaming a field can silently discard data in one mode, produce a malformed backup, or leave cloud and local behavior inconsistent. The unchecked casts in `fromRow` make database drift appear as valid domain data.
- Fix approach: Define versioned runtime schemas for each entity, validate data at adapter boundaries, centralize field mapping, and add round-trip contract tests for both adapters and every backup version.

**Application state and business workflows are concentrated in one context:**
- Issue: `DataProvider` owns loading, CRUD, document numbering, invoicing, payment status, production cards, backup restore, and e-mail dispatch in one memoized value.
- Files: `src/context/DataContext.tsx`
- Impact: A change to any collection recreates the full context value and can rerender unrelated consumers. Business invariants are difficult to isolate and test, while stale-closure mistakes can affect financial state.
- Fix approach: Split persistence-neutral business services from React state, then expose narrower contexts/selectors per domain such as billing, production, and settings.

**Large UI and document modules have excessive responsibility:**
- Issue: Several modules combine forms, validation, state transitions, calculations, rendering, and side effects. The largest are 626 lines for invoices, 536 for quotes, 525 for PDF generation, 481 for shared UI, and 397 for production.
- Files: `src/pages/Faturas.tsx`, `src/pages/Orcamentos.tsx`, `src/pdf/documentoPdf.ts`, `src/components/ui.tsx`, `src/pages/Producao.tsx`
- Impact: Changes have broad regression surfaces, reusable rules are hard to identify, and review is difficult.
- Fix approach: Extract domain hooks and pure calculation modules first, then split forms, tables, dialogs, and PDF sections into focused components with unit tests.

**Database changes are an unversioned, manually executed script:**
- Issue: Initial DDL, incremental `alter table` statements, policies, functions, and indexes share one SQL file intended for manual execution.
- Files: `supabase/schema.sql`, `README.md`, `DEPLOY.md`
- Impact: Environments can drift without an auditable migration history; partial execution can leave a deployment with missing columns, policies, or RPC behavior.
- Fix approach: Move each change into ordered Supabase migration files, apply them through CI/deployment tooling, and verify the resulting schema and RLS policies automatically.

## Known Bugs

**Password-reset links do not lead to a new-password flow:**
- Symptoms: The login page can request a recovery e-mail, but the application has no `PASSWORD_RECOVERY` handling, new-password form, or `auth.updateUser` call. A user returning from the recovery link cannot complete the password change in this UI.
- Files: `src/context/AuthContext.tsx`, `src/pages/Login.tsx`, `src/App.tsx`
- Trigger: Choose “Esqueci minha senha”, open the recovery link, and return to the configured site origin.
- Workaround: An administrator must reset/manage the account in Supabase or the user must use an external recovery UI.

**Corrupt local storage is silently replaced with an empty database:**
- Symptoms: A JSON parse failure makes `LocalAdapter.load()` initialize empty state without warning, so existing records appear to vanish.
- Files: `src/data/adapter.ts`, `src/context/DataContext.tsx`
- Trigger: Truncate or corrupt the `graficaLivre` localStorage value, then reload the app.
- Workaround: Restore a previously exported JSON backup before saving new data; the application provides no automatic recovery copy.

**Deleting a client can leave documents and production records unresolved:**
- Symptoms: Client deletion removes only the client row. Quotes, invoices, and production cards retain `clienteId`, while the database does not define foreign keys for those relationships.
- Files: `src/context/DataContext.tsx`, `src/data/adapter.ts`, `supabase/schema.sql`, `src/pages/Clientes.tsx`
- Trigger: Delete a client referenced by an existing quote, invoice, or production card.
- Workaround: Avoid deleting referenced clients; use an archival status once one is implemented.

## Security Considerations

**Production can silently fail open into unauthenticated local mode:**
- Risk: Cloud mode is enabled only when both Vite variables exist. A deployment with missing or misspelled configuration shows the full application without login and stores business data in that browser, creating a false impression that shared cloud persistence is active.
- Files: `src/data/supabaseClient.ts`, `src/context/AuthContext.tsx`, `src/App.tsx`, `README.md`, `DEPLOY.md`
- Current mitigation: Deployment documentation warns operators to configure both variables; Supabase-backed mode uses authenticated sessions and RLS.
- Recommendations: Require an explicit local/demo build flag, fail closed in production when Supabase configuration is absent, and display a persistent, unmistakable demo-mode banner.

**Sensitive business and customer data is stored and exported in plaintext:**
- Risk: Local mode stores customer identifiers, contact data, invoices, payments, company PIX data, and embedded logo data in localStorage. Backups export the same content as unencrypted JSON.
- Files: `src/data/adapter.ts`, `src/context/DataContext.tsx`, `src/types.ts`
- Current mitigation: Local storage is origin-scoped and backup export is user-initiated.
- Recommendations: Document the privacy implications, discourage shared/browser-public devices, add optional encrypted backups, provide data-retention controls, and prefer authenticated cloud mode for real customer data.

**Authenticated users can use the e-mail function as a general-purpose sender:**
- Risk: Any authenticated account can submit arbitrary recipients, subject, HTML, sender display name, and a base64 attachment. There is no per-user rate limit, recipient limit, payload-size limit, content policy, or server-side link to a document owned by that user. This can consume a shared Resend quota or enable abuse.
- Files: `supabase/functions/enviar-email/index.ts`, `src/context/DataContext.tsx`, `src/components/EnviarEmailModal.tsx`
- Current mitigation: The function validates the Supabase JWT before reading the Resend key; the normal UI escapes message HTML.
- Recommendations: Validate address syntax and counts, cap request/attachment sizes, rate-limit by user, generate or retrieve documents server-side from authorized records, restrict sender fields, and log auditable send metadata without storing document contents.

**Database invariants rely mainly on the frontend:**
- Risk: Status, category, payment method, nonnegative amounts, unique document numbers, and entity relationships are stored as unconstrained text/numbers/UUIDs. Direct API calls from an authenticated client can create invalid or duplicate business records within that tenant.
- Files: `supabase/schema.sql`, `src/types.ts`, `src/data/adapter.ts`, `src/context/DataContext.tsx`
- Current mitigation: RLS isolates rows by `user_id`, and `proximo_numero_documento` reserves counters atomically for normal UI flows.
- Recommendations: Add check constraints, foreign keys scoped to tenant ownership, and unique constraints such as `(user_id, numero)`; move multi-entity business mutations into validated database functions.

## Performance Bottlenecks

**All tenant data is loaded eagerly and retained in one React state tree:**
- Problem: Startup runs `select('*')` for every collection and stores every row in one `Database` object. There is no pagination, date window, projection, or incremental query.
- Files: `src/data/adapter.ts`, `src/context/DataContext.tsx`, `src/pages/Dashboard.tsx`, `src/pages/Relatorios.tsx`
- Cause: The adapter exposes only whole-database loading, and pages calculate views from in-memory arrays.
- Improvement path: Introduce paginated/domain queries, server-side aggregates for dashboards and reports, cache invalidation per collection, and narrow React subscriptions.

**Local writes serialize the full database on every mutation:**
- Problem: Every local CRUD operation runs `JSON.stringify(this.db)` and rewrites a single localStorage key.
- Files: `src/data/adapter.ts`
- Cause: All collections and company configuration share the `graficaLivre` blob.
- Improvement path: Use IndexedDB with per-entity stores and transactions, or at minimum debounce persistence and split collections while preserving atomic backup snapshots.

**PDF e-mailing duplicates large binary data through memory and JSON:**
- Problem: The browser generates a complete PDF base64 string, sends it inside a JSON request, and the Edge Function parses and forwards the same string. Base64 increases payload size and both 30-second client timeouts can expire while the underlying work continues.
- Files: `src/components/EnviarEmailModal.tsx`, `src/context/DataContext.tsx`, `src/pdf/documentoPdf.ts`, `supabase/functions/enviar-email/index.ts`
- Cause: The e-mail integration has no object storage or server-side document generation path.
- Improvement path: Upload PDFs to short-lived protected object storage or generate them server-side, enforce size limits, and use an idempotency key/job status rather than client-side `Promise.race` alone.

## Fragile Areas

**Multi-entity mutations are not transactional:**
- Files: `src/context/DataContext.tsx`, `src/data/adapter.ts`, `supabase/schema.sql`
- Why fragile: Creating an invoice and production card, converting a quote, deleting an invoice with related rows, and registering a payment plus invoice status each perform multiple independent network writes. A failure midway leaves partial remote state while `run()` skips the local state update.
- Safe modification: Implement each workflow as a Supabase RPC/database transaction; return the committed rows and reconcile local state from that response.
- Test coverage: No automated tests exercise partial failures, retries, concurrent tabs, or reconciliation after an interrupted operation.

**Backup restore can destroy valid cloud data before discovering invalid input:**
- Files: `src/context/DataContext.tsx`, `src/data/adapter.ts`, `src/data/migrateLegacy.ts`
- Why fragile: Current-format JSON is shallow-merged without runtime validation. Cloud restore deletes every collection sequentially before mapping and inserting the replacement; malformed collections or a later network error can leave the account empty or partially restored.
- Safe modification: Validate and version the complete backup first, show a dry-run summary, create a server-side transaction/staging import, and keep a recoverable pre-import snapshot.
- Test coverage: No tests cover malformed JSON shapes, unsupported versions, duplicate IDs, insert failures, rollback, or large backups.

**Handwritten row conversion accepts database drift via casts:**
- Files: `src/data/adapter.ts`, `src/types.ts`, `supabase/schema.sql`
- Why fragile: `fromRow` defaults missing fields and casts arbitrary strings/JSON to unions and document-item arrays, so invalid rows reach calculations and rendering without a clear boundary error.
- Safe modification: Generate database types from Supabase, validate JSONB document items with a runtime schema, and fail with actionable record/table diagnostics.
- Test coverage: No contract or round-trip tests verify every entity between domain objects and Supabase rows.

**Capture mode mutates persistent local data during startup:**
- Files: `src/main.tsx`, `public/seed.json`, `vite.config.ts`
- Why fragile: A build run with mode `capture` fetches seed data and overwrites the normal `graficaLivre` localStorage key; an incorrectly exposed capture build can replace a browser's working dataset.
- Safe modification: Use a capture-only storage namespace, require an explicit isolated origin, and clear it after capture.
- Test coverage: No startup-mode tests assert that production and development builds cannot execute seed replacement.

## Scaling Limits

**Browser-local storage capacity:**
- Current capacity: The entire database is one JSON string under `graficaLivre`; browser quotas are implementation-dependent and no application limit is measured.
- Limit: Large logos, accumulated documents, and customer history eventually cause synchronous `localStorage.setItem` failures; write cost grows with the whole dataset.
- Scaling path: Move durable local mode to IndexedDB, monitor quota, expose storage usage, and provide tested migration from the existing key.
- Files: `src/data/adapter.ts`, `src/context/DataContext.tsx`, `src/types.ts`

**Cloud dataset growth:**
- Current capacity: Every row from seven collections plus company data is fetched at login; backup insertion is chunked at 200 rows but deletion and collection processing are sequential.
- Limit: Startup bandwidth, memory, React rerenders, and restore duration grow with total tenant history rather than the active working set.
- Scaling path: Add pagination, archival periods, server-side filtering/aggregates, and background transactional import jobs.
- Files: `src/data/adapter.ts`, `src/context/DataContext.tsx`, `src/pages/Relatorios.tsx`

## Dependencies at Risk

**Unpinned Edge Function runtime dependency:**
- Risk: The deployed function imports `@supabase/supabase-js@2` from `esm.sh`, pinning only the major version and bypassing the repository lockfile.
- Impact: A redeploy can resolve different SDK/transitive code from the browser app and change behavior without a source or lockfile change.
- Migration plan: Pin an exact version or use Deno/npm dependency management with a committed lockfile and automated function tests.
- Files: `supabase/functions/enviar-email/index.ts`, `package-lock.json`, `package.json`

## Missing Critical Features

**Automated schema deployment and verification:**
- Problem: RLS, RPC, constraints, and indexes depend on a person pasting one SQL file into the Supabase editor; there is no CI workflow or migration verification in the repository.
- Blocks: Repeatable upgrades, reliable rollback, reviewable production schema changes, and automated tenant-isolation checks.
- Files: `supabase/schema.sql`, `README.md`, `DEPLOY.md`

**Recoverable, validated backup restore:**
- Problem: Import has no backup version, runtime schema validation, preview, pre-import snapshot, or atomic rollback.
- Blocks: Safe disaster recovery and trustworthy upgrades for both local and cloud users.
- Files: `src/context/DataContext.tsx`, `src/data/adapter.ts`, `src/data/migrateLegacy.ts`

## Test Coverage Gaps

**No automated test harness:**
- What's not tested: The repository has no `*.test.*`/`*.spec.*` files, test-runner configuration, or `test` script. Build and lint are the only automated code-quality commands declared.
- Files: `package.json`, `.oxlintrc.json`, `vite.config.ts`
- Risk: Regressions in financial totals, persistence, access control, imports, PDFs, and workflows can ship without detection.
- Priority: High

**Financial calculations and document lifecycle:**
- What's not tested: Quote/invoice totals, taxes, discounts, partial payments, status recomputation, overdue display, numbering, conversion, and production-card creation.
- Files: `src/context/DataContext.tsx`, `src/pages/Orcamentos.tsx`, `src/pages/Faturas.tsx`, `src/components/ItensEditor.tsx`, `src/lib/money.ts`, `src/lib/documento.ts`
- Risk: Monetary or status errors can affect customer-facing documents and accounting reports.
- Priority: High

**Persistence, migration, and authorization boundaries:**
- What's not tested: Local/Supabase round trips, malformed storage, legacy conversion, backup rollback, RLS tenant isolation, RPC concurrency, and network-failure recovery.
- Files: `src/data/adapter.ts`, `src/data/migrateLegacy.ts`, `src/context/AuthContext.tsx`, `supabase/schema.sql`
- Risk: Data loss, cross-mode incompatibility, duplicate numbers, and authorization regressions can go unnoticed.
- Priority: High

**External integrations and generated documents:**
- What's not tested: ViaCEP failures and response validation, PIX/QR generation, PDF layout/data, e-mail authentication, input limits, Resend errors, and retries.
- Files: `src/lib/viacep.ts`, `src/lib/pix.ts`, `src/pdf/documentoPdf.ts`, `src/components/EnviarEmailModal.tsx`, `supabase/functions/enviar-email/index.ts`
- Risk: Integration drift and oversized or malformed inputs can break customer delivery paths only in production.
- Priority: Medium

---

*Concerns audit: 2026-09-07*
