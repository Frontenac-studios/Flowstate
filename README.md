# Flowstate

**The only tool that helps you decide what to stop doing.**

An operating system for a solo founder or a very small service business. It runs the
business — projects, time, invoicing, client onboarding — and sits a priority layer on top,
so the hours you spend go where you said they should.

Functionally, it's your first hire: the bookkeeper-and-admin work that's repeatable,
low-judgment and not client-facing, absorbed at the stage where you can't yet justify hiring
either one.

Built for 1. Works up to ~5. Breaks at 10, on purpose.

## Read these first

| Document                               | What it is                                                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [`MISSION.md`](MISSION.md)             | The product. Single source of truth — what Flowstate is, the model, the mechanics, the product laws, and the v1 scope. |
| [`docs/v1-scope.md`](docs/v1-scope.md) | The plan. Definition of done, the GO/PARK/KILL triage, acceptance criteria, sizes, build order.                        |
| [`claude.md`](claude.md)               | Engineering conventions. Stack, type safety, tenancy, CI cost rules.                                                   |

## History

Flowstate was previously **Kash**, a whole-life planning app with a wellness garden, a bingo
goal board, a values system and a daily-wins tracker. That product was cut in August 2026.
Its specifications are kept, unauthoritative, in
[`docs/archive/pre-mission/`](docs/archive/pre-mission/) — do not plan work from them.

The repo, the desktop app bundle and several database tables still carry the `kash` name.
That's cosmetic and is being retired as each area is rebuilt.

## Stack

Next.js 14 (App Router) · TypeScript strict · Tailwind · tRPC + TanStack Query · Drizzle ORM
· Supabase (Postgres, Auth, RLS) · Tauri desktop with an offline SQLite mirror · Vercel ·
Sentry.

## Running it

```bash
nvm use
npm ci
npm run dev
```

`npm run desktop:dev` for the Tauri app. Environment variables are documented in
`.env.example`; there is no public sign-up — users are invited from the Supabase dashboard.
