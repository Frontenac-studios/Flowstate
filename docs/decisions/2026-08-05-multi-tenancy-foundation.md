# Multi-tenancy foundation

**Date:** 2026-08-05
**Status:** in progress — PR 1 of 4

The app has one user today and will later have employees. This puts the `user_id` /
`org_id` boundary into the data model and access layer now, so that adding people is a
feature change rather than a rewrite. Nothing user-facing changes: no org UI, no invites,
no onboarding, no settings.

## Decisions

**Membership is many-to-many.** `org_memberships(org_id, user_id, role)` rather than an
`org_id` on a profile row. A user has exactly one membership today. Until an org switcher
exists, a second membership is a hard error (`AmbiguousOrgMembershipError`) — silently
picking one is how rows get written into the wrong tenant.

**`org_id` is denormalized onto every tenant table** (PR 2), not derived through joins.
Flat RLS predicates stay index-friendly; join-derived tenancy turns every row read into a
subquery. Integrity is restored by composite FKs `(parent_id, org_id) → parent(id, org_id)`
so a child can't reference a parent in another org.

**Roles are stored, not enforced.** `org_role` is `owner | partner | member` from the
start. Nothing checks it — no `requireRole` middleware, no UI. Naming all three now lets
the visibility classification be written against real role names.

**Visibility is classified per table, in code.** `src/db/tenancy.ts` maps every tenant
table to `personal`, `org_shared`, or `financial`, with a test asserting totality against
the schema directory. Partner is _definitionally_ "everything except `personal`", so the
map is the boundary rather than a description of it. Tie-breaker: when a table could go
either way, classify it `personal` — that error costs a migration, the other costs a leak.

**Money never becomes a column on an existing table.** Rates, revenue and invoices get
their own `financial`-class tables when they arrive. This is what makes column-level
security permanently unnecessary: a member's `SELECT *` cannot leak a rate that isn't in
the row. Enforced by a test that scans for money-shaped column names.

**Assignment is anticipated, not built.** `assigned_user_id` (PR 2) lands nullable on
`tasks` and `projects`, written and read by nothing. It's the one column that is cheap now
and expensive later, because it changes what "my tasks" means at hundreds of call sites.

**Enforcement stays in the app layer.** RLS gains an org clause in parallel, but Drizzle
connects over `postgres://` — not as `authenticated` — so app queries never evaluate
policies. RLS guards the Supabase-client path only. Making RLS the real guard would mean
per-request JWT claims on every connection; that was considered and declined as out of
proportion to the current risk.

## Rollout

1. `orgs` + `org_memberships`, new-user trigger, classification, tRPC context. ← this PR
2. `org_id` (nullable) + `assigned_user_id` on tenant tables, backfill, write stamping,
   SQLite mirror, sync mapper.
3. `NOT NULL`, composite FKs, org-scoped project slug, immutability trigger, RLS rewrite
   behind `can_access_personal` / `can_access_org` helper functions.
4. Hosted apply script + verification.

Split expand/contract so each PR is green and non-breaking on its own: a missed write site
surfaces as a `NOT NULL` violation in PR 3, not as silent corruption.

## Notes

- The org for a new `auth.users` row comes from the `handle_new_user_org` trigger.
  `ensureOrgForUser()` covers what the trigger can't see: the dev/desktop auth-bypass user
  (no `auth.users` row) and users predating the trigger. There is no hardcoded org id.
- `orgs` / `org_memberships` are mirrored into SQLite but are **not** in `SYNC_TABLES` —
  desktop resolves its own org locally.
- `goals` is `org_shared` but FKs to `bingo_cards`, which is `personal`. Intentional: RLS
  evaluates each table independently, so a partner reading a member's goal gets nothing for
  the card. Don't "fix" it by reclassifying either side.
