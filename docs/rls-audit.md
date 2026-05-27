# Kash — RLS audit (v1)

Row Level Security audit for Kash user data in Supabase Postgres. Last reviewed: Phase 11 hardening.

## User-scoped tables

Each table must have `ENABLE ROW LEVEL SECURITY` and four policies (SELECT, INSERT, UPDATE, DELETE) scoped to `user_id = auth.uid()`, with extra INSERT checks where noted.

| Table               | Migration                             | SELECT | INSERT | UPDATE | DELETE | Notes                                       |
| ------------------- | ------------------------------------- | ------ | ------ | ------ | ------ | ------------------------------------------- |
| `projects`          | `20260525120000_kash_schema_rls.sql`  | OK     | OK     | OK     | OK     |                                             |
| `tasks`             | same                                  | OK     | OK     | OK     | OK     | INSERT requires owned `project_id` when set |
| `task_time_entries` | same                                  | OK     | OK     | OK     | OK     | INSERT requires parent `tasks.user_id`      |
| `chat_messages`     | same                                  | OK     | OK     | OK     | OK     | INSERT requires owned `task_id` when set    |
| `day_reviews`       | same                                  | OK     | OK     | OK     | OK     |                                             |
| `app_settings`      | same                                  | OK     | OK     | OK     | OK     |                                             |
| `nudge_events`      | `20260526120000_nudge_events_rls.sql` | OK     | OK     | OK     | OK     |                                             |

## Exception — `health_checks`

| Table           | RLS enabled                                | Policies | Access pattern      |
| --------------- | ------------------------------------------ | -------- | ------------------- |
| `health_checks` | Yes (`drizzle/0000_overconfident_bug.sql`) | **None** | Template/demo table |

- Not Kash user data. No `user_id` column.
- Read via Drizzle + `DATABASE_URL` (postgres role bypasses RLS) in [`health-checks` tRPC router](../src/trpc/routers/health-checks.ts) on `baseProcedure` (unauthenticated read for `/health` demo).
- **Do not** add `auth.uid()` policies unless the product becomes per-user health rows.

## Application layer

tRPC routers for Kash features use `protectedProcedure` and filter by `ctx.userId`:

- `tasks`, `projects`, `timeEntries`, `chat`, `dayReviews`, `settings`, `weekDraft`, `me`

`healthChecks` and `hello` use `baseProcedure` by design.

## Manual spot-check

Optional SQL script: [`scripts/rls-spotcheck.sql`](../scripts/rls-spotcheck.sql).

Run against local Supabase after `supabase start` and seeding two test users. Confirms user A cannot SELECT user B rows when using the `authenticated` role with JWT claims.

## Sign-off

- [x] All seven user tables have RLS + four policies
- [x] `health_checks` documented as intentional exception
- [x] Kash tRPC mutations/queries use `protectedProcedure` where appropriate
