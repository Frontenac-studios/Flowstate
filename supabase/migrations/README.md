# Supabase CLI migrations

This folder is intentionally empty for Kash.

`supabase start` applies every `*.sql` file here before the app schema exists. Kash table DDL lives in `drizzle/`; RLS and incremental SQL patches live in [`../rls/`](../rls/) and are applied via `npm run db:e2e-setup` (or `node scripts/apply-supabase-migrations.cjs`) **after** Drizzle migrations.
