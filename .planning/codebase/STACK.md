# Technology Stack

**Analysis Date:** 2026-09-07

## Languages

**Primary:**
- TypeScript 6.0 (`~6.0.2`) - React application code in `src/**/*.ts` and `src/**/*.tsx`, built with the strict bundler-oriented settings in `tsconfig.app.json`.
- TSX / JSX (React JSX transform) - User interface, routing, providers, pages, and components under `src/`, with `jsx: react-jsx` configured in `tsconfig.app.json`.

**Secondary:**
- SQL (PostgreSQL / PL/pgSQL) - Supabase tables, row-level security, indexes, and the atomic document-number RPC in `supabase/schema.sql`.
- TypeScript on Deno - Supabase Edge Function implementation in `supabase/functions/enviar-email/index.ts`.
- CSS - Tailwind CSS v4 directives and application-wide styles in `src/index.css`.
- HTML - Static Vite document shell and social metadata in `index.html`.
- Shell and Windows batch - Local launch helpers in `start.sh` and `start.bat`.

## Runtime

**Environment:**
- Modern browser - The production application uses DOM APIs, `localStorage`, `structuredClone`, `crypto.randomUUID`, `fetch`, and Blob downloads in `src/data/adapter.ts`, `src/context/DataContext.tsx`, and `src/main.tsx`.
- Node.js 20+ - Required for dependency installation, Vite development, linting, and builds according to `README.md`, `COMO-USAR.md`, and the version check in `start.sh`.
- Deno / Supabase Edge Runtime - Runs the optional email function declared with `Deno.serve` in `supabase/functions/enviar-email/index.ts`.

**Package Manager:**
- npm - Used by all installation and script examples in `README.md`, `start.sh`, and `start.bat`; no npm version is pinned in `package.json`.
- Lockfile: present, npm lockfile version 3 at `package-lock.json`.

## Frameworks

**Core:**
- React 19.2.7 - Component framework and provider-based application state in `src/main.tsx`, `src/App.tsx`, and `src/context/`.
- React DOM 19.2.7 - Browser rendering through `createRoot` in `src/main.tsx`.
- React Router DOM 7.18.1 - Hash-based client routing in `src/App.tsx`; the hash router keeps the static deployment independent of server-side route rewrites.
- Tailwind CSS 4.3.2 - Utility-first styling, integrated directly into Vite through `@tailwindcss/vite` in `vite.config.ts` and consumed by `src/index.css`.
- Supabase JavaScript 2.110.0 - Optional cloud-mode database, authentication, RPC, and Edge Function client in `src/data/supabaseClient.ts`, `src/data/adapter.ts`, and `src/context/AuthContext.tsx`.

**Testing:**
- Not detected - `package.json` defines no test script or test dependency, and the repository contains no test configuration or test files.

**Build/Dev:**
- Vite 8.1.1 - Development server, static production build, and preview server configured by `vite.config.ts`.
- `@vitejs/plugin-react` 6.0.3 - React transformation plugin registered in `vite.config.ts`.
- TypeScript project build - `npm run build` runs `tsc -b` before Vite according to `package.json`; project references are split between `tsconfig.app.json` and `tsconfig.node.json`.
- Oxlint 1.71.0 - Lint runner exposed as `npm run lint` in `package.json`, configured by `.oxlintrc.json` for React hooks and fast-refresh-compatible exports.

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.110.0 - Selects cloud mode when both Vite environment values exist and supplies PostgREST, Auth, RPC, and Functions clients in `src/data/supabaseClient.ts` and `src/data/adapter.ts`.
- `pdfmake` 0.3.11 - Generates quotations, invoices, and delivery documents entirely in the browser in `src/pdf/documentoPdf.ts`.
- `qrcode` 1.5.4 - Converts EMV PIX payloads into PNG data URLs in `src/lib/pix.ts`.
- `recharts` 3.9.1 - Renders dashboard and reporting charts in `src/pages/Dashboard.tsx` and `src/pages/Relatorios.tsx`.
- `react-router-dom` 7.18.1 - Provides the authenticated/local route graph and static-host-safe `HashRouter` in `src/App.tsx`.

**Infrastructure:**
- Supabase-hosted PostgreSQL - Optional multi-device data backend defined declaratively in `supabase/schema.sql` and accessed through `src/data/adapter.ts`.
- Supabase Auth - Optional email/password identity provider used by `src/context/AuthContext.tsx`.
- Supabase Edge Functions - Optional server boundary for authenticated email delivery in `supabase/functions/enviar-email/index.ts`.
- Resend REST API - Optional transactional email provider called only from `supabase/functions/enviar-email/index.ts`.

## Configuration

**Environment:**
- The browser application selects local mode unless both `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are present; the switch is implemented in `src/data/supabaseClient.ts`.
- `.env.example` is present as a safe configuration template, while `.gitignore` excludes `.env` and `.env.*` except the example. Keep real frontend values in an uncommitted `.env` or the hosting platform's environment settings.
- The Edge Function reads Supabase-provided `SUPABASE_URL` and `SUPABASE_ANON_KEY`, plus user-managed `RESEND_API_KEY` and optional `EMAIL_REMETENTE`, in `supabase/functions/enviar-email/index.ts`.
- Cloud deployment requires applying `supabase/schema.sql`; local mode needs no database or authentication configuration, as implemented by `LocalAdapter` in `src/data/adapter.ts`.

**Build:**
- `vite.config.ts` registers the React and Tailwind plugins and otherwise uses Vite defaults.
- `tsconfig.json` is the root project-reference file; `tsconfig.app.json` targets ES2023 and the DOM, while `tsconfig.node.json` type-checks `vite.config.ts` under NodeNext semantics.
- `.oxlintrc.json` enables React, TypeScript, and Oxc lint plugins and enforces React hooks correctness.
- `index.html` is the Vite entry document, and `src/main.tsx` is the application bootstrap entry.
- `package.json` emits the production site into Vite's default `dist/` directory; `dist/` and `node_modules/` are ignored by `.gitignore`.

## Platform Requirements

**Development:**
- Use Node.js 20 or newer and npm as documented in `README.md`; `start.sh` rejects older Node majors, while `start.bat` verifies that Node is installed.
- Use a modern Chrome- or Edge-class browser as documented in `COMO-USAR.md`; ES2023 output is selected in `tsconfig.app.json`.
- Run `npm run dev` for Vite, `npm run lint` for Oxlint, and `npm run build` for TypeScript plus the production bundle, all defined in `package.json`.
- To exercise cloud mode, provision Supabase, execute `supabase/schema.sql`, and provide the two `VITE_SUPABASE_*` settings documented in `README.md` and consumed by `src/data/supabaseClient.ts`.

**Production:**
- The frontend is a fully static Vite build in `dist/`, with hash routing configured in `src/App.tsx`; it can run on any static host described in `README.md`.
- Vercel is the documented primary host in `DEPLOY.md`; no repository-owned Vercel configuration file is present, so framework auto-detection and dashboard environment variables are expected.
- Supabase supplies the optional hosted database, authentication, and Edge Function runtime; local-only deployments continue to store browser-isolated data in the `graficaLivre` `localStorage` key through `src/data/adapter.ts`.
- GitHub Pages is documented as an alternative in `README.md`, but requires adding the repository base path to `vite.config.ts` before deployment.

---

*Stack analysis: 2026-09-07*
