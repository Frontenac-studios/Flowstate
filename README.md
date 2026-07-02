# Kash

_A whole-life planning app, built for one brain — mine._

Kash (repo codename **Flowstate**) is a personal planning app that helps me balance every sector of
my life, not just work. It exists to make two things go away: the **overwhelm of deciding what to do
next**, and the slow, invisible **drift out of balance** where work quietly eats the weeks and
relationships, rest, and self-care starve without me noticing. What I'm actually buying is **calm** —
and proof, handed back to me, that I'm making progress.

This is not a product for a market. It's built for the way _my_ head works, and the README is honest
about that. If it generalizes one day, good — but every decision here optimizes for one user.

## Who it's for

Me — and anyone whose head works like mine. Someone juggling a lot across work and life who wants to
feel guided without giving up control: to plan well, stay balanced, make fewer trivial decisions, and
actually see the progress they're making. Kash is built for that person first, and doesn't pretend to
be for everyone.

## The problem it fixes

Three braided failures:

1. **Decision paralysis.** Open the list, see everything at once, can't rank it, freeze. Too many
   trivial choices (accounting before laundry?) burn energy before the real work starts.
2. **Life imbalance.** Energy pours into whatever shouts loudest — usually work — and the quiet
   sectors go dark for weeks. By the time it's felt, it's a deficit.
3. **Invisible progress.** Every tool I've tried (Todoist, Notion, the rest) fails at the same
   point: it never gives me the **visualization** or the **reassurance** I want. Nothing shows me
   the path to my goals or reminds me how far I've come, so I stop opening it.
4. **No guidance toward the goals that aren't work.** Deadlines and clients keep work on track on
   their own; nothing reminds me of my goals outside work or steers me in small, accomplishable
   steps toward achieving them. That's the job Kash is meant to do.

## What makes it different — you plan, Kash steers

The core contract: **You do the planning and hold the priorities. Kash keeps you on track day to
day, keeps you balanced, and celebrates your wins with you.** It's guided, but you stay in control
of where your time and energy go — Kash suggests, narrates, and hands you the next thing, but never
takes the wheel and every AI move is reversible.

And it makes the invisible visible. Time you spend is tracked per life-category so at the end of a
week you can _see_ where your energy actually went — billable hours, personal projects, pipeline
clients, self-care — and course-correct. Wins are captured, remembered, and celebrated. Progress
toward goals and projects is something you can look at.

## The shape of a day

- **Morning.** Open Kash to your planned tasks, recurring tasks, and anything unfinished from
  yesterday. Decide what's in for today, set your **Top 3**, get prompted for an optional 2 minutes
  of focused breathwork — then the **Random Decision Maker** hands you one thing to start. The
  choosing is done for you; the priorities were yours.
- **During the day.** Kash stays open. Focus-timer mode runs often, and time is tracked against each
  task so the week adds up to a real picture. Stray thoughts, ideas, and someday-things get thrown
  into one place (the Abyss) instead of cluttering the day.
- **Evening.** A gentle end-of-day close — celebrate what landed, capture wins, see where the time
  went.
- **Weekly.** A Sunday review and light planning to get next week off your mind, plus the honest
  "where did my energy go" read.
- **Long horizon.** Plan projects across phases and a timeline, track goals and progress toward
  them, and use those learnings to add balance where it's thin — or drop a project that isn't
  serving you.

**Recurring tasks** run underneath all of it, so a background worry like _"how long has it been since
the dentist?"_ simply never has to be thought again.

## Design principles

1. **Balance is the product.** Every view makes life-category balance visible; imbalance is felt, not
   buried.
2. **The app decides so I don't have to.** RDM, AI arrangement, and auto-scheduling exist to reduce
   decision load.
3. **Self-care is a constraint, not a feature.** It should be _hard_ to neglect body, mind,
   relationships, and rest — encouragement, never guilt.
4. **AI is a companion, never a gatekeeper.** It narrates, suggests, rebalances, and remembers, but
   never blocks action. Everything is reversible.
5. **Keyboard-first, low-chrome, calm.** Nothing decorative competes with the task at hand.
6. **One coherent way to move.** You always know where you are and how to get anywhere in one step.

## The one-line test

> _Did Kash help me do both what I had to do and what I wanted to do this week, across all five
> categories of my life?_

## Where the vision lives

- **Product plan (source of truth):** [`kash-3.0-plan.md`](./kash-3.0-plan.md)
- **Build status snapshot:** [`docs/build-status.md`](./docs/build-status.md)
- **Ideas backlog (future / someday):** [`kash-3.0-ideas-backlog.md`](./kash-3.0-ideas-backlog.md)

---

# Development

Technical reference for building and running Kash.

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
- Deploys on **Vercel**; macOS desktop via **Tauri**

## Quick start

```sh
# 1. Clone and install
git clone <repo-url> && cd Flowstate
nvm use            # Node 20.x (see .nvmrc)
npm ci

# 2. Environment
cp .env.example .env.local   # then fill in (see below)

# 3. Run it
npm run dev        # Next dev server on :3000
```

## Environment variables

Copy `.env.example` → `.env.local` and fill in.

| Variable                        | Where it comes from                                                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Local: `supabase status` (`API_URL`). Hosted: Project Settings → **API** → Project URL.                                                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Local: `ANON_KEY` from status. Hosted: Project Settings → **API** → `anon` key.                                                              |
| `SUPABASE_SERVICE_ROLE_KEY`     | Local: `SERVICE_ROLE_KEY` from status. Hosted: **API** → `service_role` key (**server-only**).                                               |
| `DATABASE_URL`                  | Local: maps `DB_URL` from status. Hosted: **Connect** (top of project) → **Transaction** pooler (6543); password in Settings → **Database**. |
| `NEXT_PUBLIC_SENTRY_DSN`        | Sentry → Project Settings → Client Keys (DSN).                                                                                               |
| `SENTRY_AUTH_TOKEN`             | CI/Vercel only. Sentry → User Settings → Auth Tokens (scope: `project:releases`).                                                            |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Set in Vercel + GitHub repo variables.                                                                                                       |

Hosted secrets live in 1Password. Adding a new env var requires updating `.env.example` in the same
commit.

> **Auth note:** public sign-up stays **off** for this project. Add users via Supabase Dashboard →
> Authentication → Users → Invite, never open registration. See [`claude.md`](./claude.md).

## Integrations

### Vercel

- Auto-deploys on push to `main`; preview deploys on every PR.
- Add env vars in Project Settings → Environment Variables (mirror `.env.example`).

### Sentry

- Source maps upload on every Vercel build via `SENTRY_AUTH_TOKEN`.
- Smoke test: hit `/api/sentry-test` and confirm the event appears in the dashboard.

### Supabase

- Hosted Postgres URL: project home → **Connect** → **Transaction** pooler. Put the URI in
  `DATABASE_URL`; database password is under Settings → **Database**.
- Local: `npm run supabase -- start` (Docker required); studio at `http://127.0.0.1:54323`.
- Verify DB URL: `npm run db:check` (loads `.env.local`, runs `select 1`).
- Schema push: `npm run db:push`. Migrations: `npm run db:generate` then `npm run db:migrate`.
- Schema in `src/db/schema/` — one table per file.

## Kash macOS desktop

Tauri app in [`apps/desktop`](apps/desktop/) bundles a Next.js standalone sidecar with SQLite offline
storage and Supabase sync.

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
| `npm run db:e2e-setup`                                         | Drizzle migrate + Supabase RLS SQL (local DB setup).                      |
| `npm run db:check`                                             | Test `DATABASE_URL` from `.env.local`.                                    |
| `npm run db:generate` / `db:migrate` / `db:push` / `db:studio` | Drizzle commands (config loads `.env.local`).                             |
| `npm run supabase`                                             | Pass-through to the Supabase CLI.                                         |

## Conventions

- Read [`claude.md`](./claude.md) for working conventions on this repo.
- Commits follow **Conventional Commits** (enforced by `commitlint` on `commit-msg`).
- Pre-commit runs `lint-staged` (ESLint + Prettier on staged files).
- Branch naming: `<type>/<short-slug>` (e.g. `feat/balance-heatmap`).
- Strict TypeScript, Zod-validated input, RLS on every table. Default to Server Components.

## Deploying

1. Push to `main` → Vercel deploys to production.
2. Open a PR → Vercel posts a preview URL on the PR.
3. CI (`.github/workflows/ci.yml`) runs typecheck, lint, format check, Vitest, and build on every
   push and PR.

RLS audit checklist: [`docs/rls-audit.md`](./docs/rls-audit.md).

## Repo map

```
src/app/            # App Router routes: today, this-week, plan, projects, care, abyss, settings…
src/server/         # tRPC routers + server-only logic (chat, claude, planning, tasks…)
src/components/      # shared UI (kash/ feature components)
src/db/schema/       # Drizzle schema, one table per file
src/lib/             # framework-free utilities (parser, recurrence, balance, dates…)
supabase/rls/        # RLS + SQL patches (applied after Drizzle DDL)
drizzle/             # generated migrations
apps/desktop/        # Tauri macOS shell + SQLite sync
packages/            # db-local, sync (offline/desktop support)
docs/                # build-status, rls-audit, desktop-qa, plans
```
