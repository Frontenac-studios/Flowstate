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

| Variable                        | Where it comes from                                                                                          |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | Local: `npm run supabase -- status -o env`. Hosted: Supabase dashboard → Project Settings → API.             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same as above.                                                                                               |
| `SUPABASE_SERVICE_ROLE_KEY`     | Same as above — **server-only**, never expose.                                                               |
| `DATABASE_URL`                  | Local: `DB_URL` from `supabase status`. Hosted: Supabase → Database → Connection string (pooler, port 6543). |
| `NEXT_PUBLIC_SENTRY_DSN`        | Sentry → Project Settings → Client Keys (DSN).                                                               |
| `SENTRY_AUTH_TOKEN`             | CI/Vercel only. Sentry → User Settings → Auth Tokens (scope: `project:releases`).                            |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Set in Vercel + GitHub repo variables.                                                                       |

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
- Local: `npm run supabase -- start` (Docker required); studio at `http://127.0.0.1:54323`.
- Migrations: `npm run db:generate` then `npm run db:migrate` (Drizzle).
- Schema in `src/db/schema/`. Example: `health-checks.ts`.

## Scripts

| Script                                                         | What it does                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `npm run dev`                                                  | Next dev server on `:3000`.                                               |
| `npm run build`                                                | Production build (uploads Sentry source maps if `SENTRY_AUTH_TOKEN` set). |
| `npm run start`                                                | Serve the production build.                                               |
| `npm run lint`                                                 | ESLint.                                                                   |
| `npm run typecheck`                                            | `tsc --noEmit`.                                                           |
| `npm run format` / `format:check`                              | Prettier write / check.                                                   |
| `npm run test` / `test:run` / `test:ui`                        | Vitest watch / single run / web UI.                                       |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle commands.                                                         |
| `npm run supabase`                                             | Pass-through to the Supabase CLI.                                         |

## Conventions

- Read [`claude.md`](./claude.md) for Claude Code working conventions on this repo.
- Commits follow **Conventional Commits** (enforced by `commitlint` on `commit-msg`).
- Pre-commit runs `lint-staged` (ESLint + Prettier on staged files).
- Branch naming: `<type>/<short-slug>` (e.g. `feat/billing-portal`).

## Deploying

1. Push to `main` → Vercel deploys to production.
2. Open a PR → Vercel posts a preview URL on the PR.
3. CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, tests, and build on every push and PR.

## What's in here

```
.github/workflows/ci.yml     # Typecheck, lint, test, build
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
drizzle/                      # Generated migrations
```

## Updating the template

When you ship something genuinely reusable, port it back here. Keep the template lean — anything project-specific belongs in the downstream repo.
