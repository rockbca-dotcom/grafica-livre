# External Integrations

**Analysis Date:** 2026-09-07

## APIs & External Services

**Cloud application platform:**
- Supabase - Optional database, authentication, atomic RPC, and serverless email-function platform; the application deliberately falls back to local-only mode when it is not configured.
  - SDK/Client: `@supabase/supabase-js` in `src/data/supabaseClient.ts`, used by `src/data/adapter.ts`, `src/context/AuthContext.tsx`, and `src/context/DataContext.tsx`.
  - Auth: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `src/data/supabaseClient.ts`; never expose a Supabase `service_role` key in frontend configuration, as stated in `DEPLOY.md`.

**Transactional email:**
- Resend - Sends quotation or invoice PDFs as base64 attachments from the authenticated `enviar-email` Supabase Edge Function.
  - SDK/Client: direct `fetch` POST to `https://api.resend.com/emails` in `supabase/functions/enviar-email/index.ts`; no Resend npm SDK is installed in `package.json`.
  - Auth: bearer token from `RESEND_API_KEY`; sender from optional `EMAIL_REMETENTE`, both read only by `supabase/functions/enviar-email/index.ts`.

**Brazilian address and company lookup:**
- ViaCEP - Looks up Brazilian addresses from an 8-digit CEP when editing clients or the company profile.
  - SDK/Client: browser `fetch` to `https://viacep.com.br/ws/{cep}/json/` in `src/lib/viacep.ts`, consumed by `src/pages/Clientes.tsx` and `src/pages/Perfil.tsx`.
  - Auth: none in `src/lib/viacep.ts`.
- BrasilAPI CNPJ - Looks up Brazilian company registration and contact data from a 14-digit CNPJ.
  - SDK/Client: browser `fetch` to `https://brasilapi.com.br/api/cnpj/v1/{cnpj}` in `src/lib/cnpj.ts`, consumed by `src/pages/Clientes.tsx`.
  - Auth: none in `src/lib/cnpj.ts`.

**Customer communication:**
- WhatsApp Click to Chat - Opens precomposed quotation and payment-reminder messages in WhatsApp without a server-side messaging API.
  - SDK/Client: generated `https://wa.me/{number}?text=...` URLs in `src/lib/whatsapp.ts`, consumed by `src/pages/Orcamentos.tsx`, `src/pages/Faturas.tsx`, and `src/pages/ContasReceber.tsx`.
  - Auth: none; the user completes sending in WhatsApp, as implemented by the link-based flow in `src/lib/whatsapp.ts`.

**Static social metadata:**
- GitHub raw content - `index.html` points Open Graph and Twitter image metadata at the original repository's `public/og.png` through `raw.githubusercontent.com`.
  - SDK/Client: browser/social-crawler HTTP request from metadata in `index.html`.
  - Auth: none in `index.html`.

## Data Storage

**Databases:**
- Supabase PostgreSQL (optional cloud mode) - Eight per-user entities are defined in `supabase/schema.sql`: `clientes`, `itens`, `orcamentos`, `faturas`, `pagamentos`, `contas_pagar`, `producao_cards`, and `empresa`.
  - Connection: `VITE_SUPABASE_URL` plus `VITE_SUPABASE_ANON_KEY` in `src/data/supabaseClient.ts`.
  - Client: Supabase JavaScript/PostgREST operations in `SupabaseAdapter` at `src/data/adapter.ts`; the `proximo_numero_documento` PL/pgSQL function in `supabase/schema.sql` is invoked with `client.rpc` for atomic numbering.
  - Isolation: every table carries `user_id`; row-level security policies in `supabase/schema.sql` compare it to `auth.uid()` for authenticated reads and writes.
  - Data representation: monetary values use integer cents and document line items use JSONB, as declared in `supabase/schema.sql` and mapped by `src/data/adapter.ts`.
- Browser `localStorage` (default/fallback mode) - The complete application database is serialized under `graficaLivre` by `LocalAdapter` in `src/data/adapter.ts`.
  - Connection: none; local mode is selected when Supabase values are absent in `src/data/supabaseClient.ts`.
  - Client: native browser `localStorage` plus JSON serialization in `src/data/adapter.ts`; capture mode may seed it from `public/seed.json` through `src/main.tsx`.

**File Storage:**
- No remote file-storage service is integrated: no Supabase Storage calls or bucket definitions exist in `src/` or `supabase/schema.sql`.
- Backups are generated as JSON Blob downloads and restored from browser-selected files in `src/context/DataContext.tsx`.
- Company logos remain data URLs inside the local database or the `empresa.logo_data_url` column, mapped in `src/data/adapter.ts` and defined in `supabase/schema.sql`.
- PDFs are generated client-side with pdfmake in `src/pdf/documentoPdf.ts`; email attachments are sent as base64 request data through `src/context/DataContext.tsx`.

**Caching:**
- No dedicated cache, service worker, Redis, or CDN API is integrated; in-memory React state in `src/context/DataContext.tsx` is reloaded from the chosen adapter.
- Vite's normal build/browser asset caching is implicit, with no explicit cache policy configuration in `vite.config.ts`.

## Authentication & Identity

**Auth Provider:**
- Supabase Auth in cloud mode; local mode intentionally runs without identity or a login gate.
  - Implementation: `src/context/AuthContext.tsx` reads the current session, subscribes to auth state changes, and exposes email/password sign-in, sign-up, password reset, and sign-out.
  - Route enforcement: `Gate` in `src/App.tsx` shows only landing/login routes until a cloud session exists; authenticated users and all local-mode users enter `DataProvider` and the application routes.
  - Data authorization: RLS policies in `supabase/schema.sql` restrict all rows to `authenticated` users whose `auth.uid()` matches `user_id`.
  - Edge Function authorization: `supabase/functions/enviar-email/index.ts` forwards the caller's Authorization header into a Supabase client and calls `auth.getUser()` before contacting Resend.
  - Operational policy: `README.md` and `DEPLOY.md` instruct operators to disable public email sign-up and create users administratively, although `signUp` remains implemented in `src/context/AuthContext.tsx`.

## Monitoring & Observability

**Error Tracking:**
- None detected - `package.json` contains no Sentry or other error-tracking SDK, and no monitoring initialization exists in `src/main.tsx`.

**Logs:**
- Browser persistence/load failures are written with `console.error` and also surfaced through toast messages in `src/context/DataContext.tsx`.
- The Edge Function returns structured JSON errors and HTTP statuses but has no explicit external logging or tracing integration in `supabase/functions/enviar-email/index.ts`.
- ViaCEP and BrasilAPI failures intentionally collapse to `null` without logging in `src/lib/viacep.ts` and `src/lib/cnpj.ts`.

## CI/CD & Deployment

**Hosting:**
- Vercel is the documented primary static frontend host in `DEPLOY.md`, using Vite framework detection and dashboard-defined `VITE_SUPABASE_*` settings.
- Any static host can serve the `dist/` output because routing uses `HashRouter` in `src/App.tsx`, as described in `README.md`.
- GitHub Pages is a documented alternative in `README.md`, conditional on configuring `base: '/grafica-livre/'` in `vite.config.ts`.
- Supabase hosts PostgreSQL, Auth, and the optional `enviar-email` Edge Function defined in `supabase/functions/enviar-email/index.ts`.

**CI Pipeline:**
- None detected - no `.github/workflows/` or other CI configuration exists in the repository; available quality gates are the local `lint` and `build` scripts in `package.json`.
- Edge Function deployment is manual through `supabase functions deploy enviar-email`, documented in `README.md` and in comments at `supabase/functions/enviar-email/index.ts`.

## Environment Configuration

**Required env vars:**
- `VITE_SUPABASE_URL` - Supabase project URL used by the browser client in `src/data/supabaseClient.ts`; optional for local mode, required for cloud mode.
- `VITE_SUPABASE_ANON_KEY` - Public anonymous client key used by `src/data/supabaseClient.ts`; optional for local mode, required for cloud mode.
- `SUPABASE_URL` - Supabase-provided Edge Function runtime setting read in `supabase/functions/enviar-email/index.ts`.
- `SUPABASE_ANON_KEY` - Supabase-provided Edge Function runtime setting read in `supabase/functions/enviar-email/index.ts`.
- `RESEND_API_KEY` - Resend server-side API credential required for email delivery in `supabase/functions/enviar-email/index.ts`.
- `EMAIL_REMETENTE` - Optional sender mailbox/name source in `supabase/functions/enviar-email/index.ts`; the function falls back to Resend's onboarding address.

**Secrets location:**
- Browser-safe Supabase configuration is expected in an uncommitted `.env` during local development or in Vercel environment settings, per `.gitignore`, `README.md`, and `DEPLOY.md`; `.env.example` exists only as a template.
- Resend credentials are expected in Supabase Edge Function secrets, configured with `supabase secrets set` as documented in `README.md`; they are never referenced by browser code under `src/`.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected by the Supabase Edge runtime and read at execution time in `supabase/functions/enviar-email/index.ts`.

## Webhooks & Callbacks

**Incoming:**
- No third-party webhooks are defined in `src/` or `supabase/`.
- The `enviar-email` HTTP Edge Function in `supabase/functions/enviar-email/index.ts` accepts authenticated POST requests from the application and OPTIONS preflight requests; it is an application endpoint, not a registered third-party webhook.

**Outgoing:**
- No webhook delivery is implemented in `src/` or `supabase/`.
- The only server-side outbound request is the Resend email POST in `supabase/functions/enviar-email/index.ts`; ViaCEP and BrasilAPI calls are browser-side lookups from `src/lib/viacep.ts` and `src/lib/cnpj.ts`.

---

*Integration audit: 2026-09-07*
