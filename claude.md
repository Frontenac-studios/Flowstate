# Project conventions

This file is read by Cursor and Claude Code at the start of every session. Keep it short, prescriptive, and current. Treat it as a living contract.

## Stack

- Next.js 14 (App Router) + TypeScript (strict)
- Tailwind CSS
- tRPC + TanStack Query for end-to-end typesafety
- Drizzle ORM (Postgres via Supabase)
- Supabase (Auth, Storage, RLS-enforced)
- Vercel (hosting), Cloudflare (DNS)
- Sentry (errors + perf)

## Package management

- Never use `npm install -g` or `sudo npm`. All dependencies are local to this repo.
- CLI tools (vite, eslint, prettier, drizzle-kit, etc.) go in `devDependencies` with a corresponding script in `package.json`. Invoke them via `npm run <script>`, never via a globally-installed binary.
- Always preserve `package-lock.json`. Do not delete or regenerate it without explicit instruction.
- When adding a package, determine whether it is runtime (`npm install <pkg>`) or tooling (`npm install -D <pkg>`) before installing.
- This project includes a `.nvmrc` (set to `20`) and an `engines` field in `package.json`. Run `nvm use` before any command. CI installs with `npm ci`, which fails if `package-lock.json` is out of sync — if you see that error, fix the lockfile locally and commit it; do not delete it.

## Type safety

- `strict: true` in tsconfig is non-negotiable. No `any` without an inline comment explaining why.
- Validate all external input (forms, API routes, env vars) with Zod. Infer TypeScript types from Zod schemas, never the reverse.
- Every tRPC procedure declares an input schema. No untyped procedures.

## Database & migrations

- Drizzle schema lives in `src/db/schema/`. One table per file.
- Schema changes flow through `npm run db:generate`, followed by review of the generated SQL before commit.
- Never edit a migration after it has been committed. Create a new one.
- Row Level Security is enabled on every table. The anon role has no access by default. RLS policies are checked in alongside the schema that requires them.

## Server vs client

- Default to Server Components. Add `"use client"` only when interaction or browser APIs require it.
- No secrets in client code. Anything prefixed `NEXT_PUBLIC_` is public by definition.
- Server-only modules guarded with `import "server-only"`.

## Auth

- Supabase Auth for sessions, via `@supabase/ssr` in server components and middleware.
- Protected routes are enforced in middleware AND at the data layer via RLS. Belt and braces — middleware can be bypassed by direct API calls; RLS cannot.

## File organization

- `src/app/` — routes (App Router)
- `src/server/` — tRPC routers, server-only logic
- `src/components/` — shared UI
- `src/db/` — Drizzle schema, client, queries
- `src/lib/` — pure utilities, no framework dependencies
- One default export per file. Promote shared helpers to `src/lib/` rather than re-importing across feature folders.

## Commits & PRs

- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).
- Pre-commit runs lint, format, and typecheck via husky + lint-staged. Do not bypass with `--no-verify`.
- All work flows through PRs. CI (typecheck, lint, test, build) must pass before merge.

## Secrets & env

- All secrets in `.env.local` (gitignored). `.env.example` is committed and kept current — adding a new env var requires updating `.env.example` in the same commit.
- Never log secrets, even at debug level. Redact tokens in error messages and Sentry breadcrumbs.

## When in doubt

- Match existing patterns in this repo before introducing new ones.
- Prefer boring solutions. Reach for new libraries only when Next + tRPC + Drizzle + Zod don't cover it.
- Read `docs/decisions/` for the reasoning behind non-obvious choices.
