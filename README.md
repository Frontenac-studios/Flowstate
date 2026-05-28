# Frontenac Studios Template

Opinionated starter for Frontenac Studios web projects. Click **Use this template** on GitHub to spin up a new repo, then run `./scripts/setup.sh`.

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript 5**
- **Tailwind CSS 3**
- **tRPC 11** + **TanStack Query 5** (typed end-to-end APIs)
- **Supabase** (Auth, Postgres) via `@supabase/ssr`
- **Drizzle ORM** + `drizzle-kit` (migrations, studio)
- **Sentry** (errors, traces, source maps)
- **Vitest** + Testing Library + jsdom
- **Playwright** (one planner smoke test in CI)
- **ESLint**, **Prettier** (with Tailwind plugin), **Husky**, **lint-staged**, **commitlint**
- Node **20.x**, npm **≥10**
- Deploys on **Vercel**

## Quick start

```sh
# 1. Create your repo from this template
gh repo create frontenac-studios/<your-project> --template frontenac-studios/template --private --clone
cd <your-project>

# 2. Bootstrap everything (deps, husky, env, integrations)
./scripts/setup.sh

# 3. Run it
npm run dev
```

## Environment variables

Copy `.env.example` → `.env.local` and fill in. `scripts/setup.sh` does this automatically using `supabase status` for local values.

| Variable                        | Where it comes from                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Local: `setup.sh` / `supabase status` (`API_URL`). Hosted: Project Settings → **API** → Project URL.                                                    |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local: `ANON_KEY` from status. Hosted: Project Settings → **API** → `anon` key.                                                                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Local: `SERVICE_ROLE_KEY` from status. Hosted: **API** → `service_role` key (**server-only**).                                                          |
| `DATABASE_URL`                  | Local: `setup.sh` maps `DB_URL` from status. Hosted: **Connect** (top of project) → **Transaction** pooler (6543); password in Settings → **Database**. |
| `NEXT_PUBLIC_SENTRY_DSN`        | Sentry → Project Settings → Client Keys (DSN).                                                                                                          |
| `SENTRY_AUTH_TOKEN`             | CI/Vercel only. Sentry → User Settings → Auth Tokens (scope: `project:releases`).                                                                       |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Set in Vercel + GitHub repo variables.                                                                                                                  |

Hosted secrets live in 1Password under `op://Frontenac Studios/<Project>/...`. Update `.env.example` comments to match the entry name when you provision a new project.

## Integrations

### Vercel

- Dashboard: `https://vercel.com/frontenac-studios/<project>`
- Link: `npx vercel link` (during `setup.sh`)
- Auto-deploys on push to `main`; preview deploys on every PR.
- Add env vars in Project Settings → Environment Variables (mirror `.env.example`).

### Sentry

- Dashboard: `https://frontenac-studios.sentry.io/projects/<project>/`
- Wizard: `npx @sentry/wizard@latest -i nextjs` (during `setup.sh`)
- Source maps upload on every Vercel build via `SENTRY_AUTH_TOKEN`.
- Smoke test: hit `/api/sentry-test` and confirm the event appears in the dashboard.

### Supabase

- Dashboard: `https://supabase.com/dashboard/project/<ref>`
- Hosted Postgres URL: project home → **Connect** → **Transaction** pooler (not left-sidebar “Database”). Put the URI in `DATABASE_URL`; database password is under Settings → **Database**.
- Local: `npm run supabase -- start` (Docker required); `setup.sh` writes status into `.env.local`; studio at `http://127.0.0.1:54323`.
- Verify DB URL: `npm run db:check` (loads `.env.local`, runs `select 1`).
- Schema push: `npm run db:push` (loads `.env.local` via `drizzle.config.ts`).
- Migrations: `npm run db:generate` then `npm run db:migrate` (Drizzle).
- Schema in `src/db/schema/`. Example: `health-checks.ts`.

## Kash macOS desktop

Tauri app in [`apps/desktop`](apps/desktop/) bundles a Next.js standalone sidecar with SQLite offline storage and Supabase sync.

```sh
# Dev (requires Rust toolchain)
npm run dev              # terminal 1
npm run desktop:dev      # terminal 2

# Release build
npm run desktop:build
```

See [`apps/desktop/README.md`](apps/desktop/README.md) and [`docs/desktop-qa.md`](docs/desktop-qa.md).

## Scripts

| Script                                                         | What it does                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                                                  | Next dev server on `:3000`.                                               |
| `npm run build`                                                | Production build (uploads Sentry source maps if `SENTRY_AUTH_TOKEN` set). |
| `npm run build:desktop`                                        | Standalone Next build for Tauri sidecar (`DESKTOP_BUILD=1`).              |
| `npm run desktop:dev` / `desktop:build`                        | Tauri dev / release `.app` + `.dmg`.                                      |
| `npm run start`                                                | Serve the production build.                                               |
| `npm run lint`                                                 | ESLint.                                                                   |
| `npm run typecheck`                                            | `tsc --noEmit`.                                                           |
| `npm run format` / `format:check`                              | Prettier write / check.                                                   |
| `npm run test` / `test:run` / `test:ui`                        | Vitest watch / single run / web UI.                                       |
| `npm run test:e2e` / `test:e2e:ui`                             | Playwright smoke (headless / UI mode).                                    |
| `npm run db:e2e-setup`                                         | Drizzle migrate + Supabase RLS SQL (for local/CI E2E DB).                 |
| `npm run db:check`                                             | Test `DATABASE_URL` from `.env.local`.                                    |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle commands (config loads `.env.local`).                             |
| `npm run supabase`                                             | Pass-through to the Supabase CLI.                                         |

## Conventions

- Read [`claude.md`](./claude.md) for Claude Code working conventions on this repo.
- Commits follow **Conventional Commits** (enforced by `commitlint` on `commit-msg`).
- Pre-commit runs `lint-staged` (ESLint + Prettier on staged files).
- Branch naming: `<type>/<short-slug>` (e.g. `feat/billing-portal`).

## Deploying

1. Push to `main` → Vercel deploys to production.
2. Open a PR → Vercel posts a preview URL on the PR.
3. CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, Vitest, build, and a Playwright smoke job (Supabase + DB migrate) on every push and PR.

### E2E smoke (local)

Requires Docker, local Supabase, and schema applied:

```sh
npm run supabase -- start
# Copy supabase status into .env.local (or run ./scripts/setup.sh)
npm run db:e2e-setup
npx playwright install chromium
npm run test:e2e
```

Optional overrides: `E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `PLAYWRIGHT_BASE_URL`. Default user: `e2e@kash.test` (created in `e2e/global-setup.ts`).

RLS audit checklist: [`docs/rls-audit.md`](./docs/rls-audit.md).

## What's in here

```
.github/workflows/ci.yml     # Typecheck, lint, Vitest, build, Playwright smoke
e2e/                         # Playwright global setup + smoke spec
docs/rls-audit.md            # Kash RLS sign-off checklist
.husky/                       # pre-commit (lint-staged) + commit-msg (commitlint)
scripts/setup.sh              # Post-clone bootstrap
src/app/                      # App Router pages + layout + health + sentry-test
src/trpc/                     # tRPC client/server + example router
src/db/                       # Drizzle client + example schema
src/lib/supabase/             # Server/browser/middleware client wrappers
src/lib/utils.ts              # Shared utilities (+ example test)
middleware.ts                 # Supabase session refresh
sentry.{server,edge}.config.ts + instrumentation*.ts
supabase/config.toml          # Local Supabase config
supabase/rls/                 # RLS + SQL patches (applied after Drizzle, not on supabase start)
drizzle/                      # Generated migrations
```

## Updating the template

When you ship something genuinely reusable, port it back here. Keep the template lean — anything project-specific belongs in the downstream repo.
