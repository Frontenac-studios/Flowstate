# Flowstate v1 — Definition of DONE, and the triage against it

_Written 2026-08-05. Authority: [MISSION.md](../MISSION.md). Where this document and any
`kash-3.x-*.md` spec disagree, MISSION.md wins and the 3.x doc is dead._

---

## 0. The headline, before the tables

Two facts came out of reading the code rather than the specs, and everything below follows
from them.

**Fact 1 — the built app is a different product.** The schema's spine is
`project_category = professional | personal_projects | relationships | body_mind | adulting`.
There is a wellness garden (`care_activities`, `care_events`, `care_reflections`), a bingo
goal board (`bingo_cards`, `goals.cell_index`), a values system (`user_values`), a daily-wins
body/mind/soul tracker, an AI persona document (`about_me_sections`), and a reassurance
engine (`evidence_editions`, `nudge_events`). MISSION.md cuts every one of those by name:
_"not a wellness app, a habit tracker, a journal, or a life-planning system. It does not
manage your relationships, your fitness, or your mood."_ This is not a small trim. It is
most of the surface area of the app you have.

**Fact 2 — the half of v1 that makes money does not exist.** There is no `clients` table.
No rate. No `billable` flag. No invoice, proposed or otherwise. No intake, no scoring, no
tickler. A grep across `src/` for `invoice|billable|intake|tickler|hourlyRate` returns
exactly one hit, and it is an unrelated string in `category-prototypes.ts`. Scope items 4,
6, 7 and 8 are at zero. Item 3 is a third built. Item 5 exists in a shape that has to be
replaced rather than extended.

So the honest summary is: **you are not 80% done and polishing. You are ~35% done on v1 and
carrying ~65% of a product you have decided not to ship.** The good news is that the
foundations under both facts — auth, RLS, tRPC, Drizzle, offline mirror, the task and
project engine, drag/drop, the design system — are real and reusable. The task-and-project
core alone is genuinely strong and covers scope items 1, 2 and 9 nearly outright.

**The single biggest risk to this quarter is not build time. It is teardown reluctance.**
Product law 5 exists because parking is cheaper to decide and more expensive to live with.
This document parks four things and kills eighteen.

---

## 1. What DONE means for v1

v1 ships the day all nine of these are true, and not one feature later.

> **You can run a week of real client work end to end inside Flowstate without opening
> another tool for anything except sending the invoice and signing the contract.**

Concretely, DONE is the following, verifiable in one sitting:

| #   | Scope item                                   | The one-sentence proof it's done                                                                                                                                                                                          |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Project tracking                             | Every live engagement is a project with a client, a rate, and a state; you can see all of them and their health on one screen.                                                                                            |
| 2   | Task tracking                                | Tasks belong to projects, carry an estimate, recur when they should, and land on a day.                                                                                                                                   |
| 3   | Time tracking                                | Every minute you work is attached to a project (and usually a task), marked billable or not, with no double-entry into another timer.                                                                                     |
| 4   | Time reporting + invoicing                   | On the 1st you press one button and get a per-client draft — grouped work summary, hours capped at the billing threshold, carry-forward stated — that you review, adjust, and hand to your invoicing tool.                |
| 5   | Directions/Targets + Budget + Ledger + Sweep | At most 2 Directions and 3 Targets exist; today shows a live time bar against your declared tilt; every other Friday you get an unarguable spent-vs-said number; every week you rule drop/park/keep on what's gone stale. |
| 6   | Client onboarding                            | One action turns "signed" into a project, its phases, its time-tracking setup, and a checklist of the manual steps.                                                                                                       |
| 7   | The Filter                                   | A lead's answers to eight questions produce pursue / negotiate / decline with reasons, scored against your live Direction and Target, with logged overrides.                                                              |
| 8   | Business tickler                             | Compliance dates fire at you and are otherwise invisible.                                                                                                                                                                 |
| 9   | Personal category                            | Personal work is one Maintenance project with recurring tasks; it consumes budget, and it appears nowhere in the goal layer.                                                                                              |

Section 5 proposes the cut line against this list. Section 6 explains why item 8 should not
be built at all.

---

## 2. STEP 1 — Inventory (from the code)

Counted: **26 routes**, **33 tRPC routers / ~280 procedures**, **49 schema files**,
**279 components**, **222 test files**, **45 migrations**, **26 RLS policy files**,
**41 `kash-3.x-*.md` spec docs**.

State key: **SHIPPED** = works end to end and is reachable in the UI. **HALF-BUILT** = code
exists but is unreachable, unwired, or materially incomplete. **SPEC-ONLY** = documented,
no code.

### 2.1 Routes

| Route                            | State      | Note                                                                                                 |
| -------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `/today`                         | SHIPPED    | Day surface: timeline, Top-3, inbox, coach dock, focus entry.                                        |
| `/today/focus` (fullbleed)       | SHIPPED    | Focus session; the only place a timer starts today.                                                  |
| `/this-week`                     | SHIPPED    | 7+1 column week grid, drag scheduling, "Later" column.                                               |
| `/this-week/review`              | SHIPPED    | End-of-week review; reached only from `WeekReflectionPanel`.                                         |
| `/plan`                          | SHIPPED    | Goals/bingo + Week/Month/Quarter/Year tabs.                                                          |
| `/projects`                      | SHIPPED    | Miller-column board.                                                                                 |
| `/projects/[id]`                 | SHIPPED    | Project detail, phases, milestones.                                                                  |
| `/projects/[id]/imports`         | SHIPPED    | Bulk task import + undo.                                                                             |
| `/projects/loose`                | SHIPPED    | Tasks with no project.                                                                               |
| `/backlog`                       | SHIPPED    | Renders `AbyssRoot`.                                                                                 |
| `/abyss`                         | HALF-BUILT | Same component, no nav entry, no inbound link — a duplicate route left behind by the Backlog rename. |
| `/care`                          | SHIPPED    | Wellness garden, practices, reflections.                                                             |
| `/settings`                      | SHIPPED    | Includes the About-me doc, coach prefs, calendar.                                                    |
| `/login`, `/auth/signout`        | SHIPPED    | Supabase, sign-up disabled by design.                                                                |
| `/health`, `/api/health`         | HALF-BUILT | `healthChecks` router has **0 UI references**.                                                       |
| `/dev/spacing-preview`           | HALF-BUILT | Dev-only scratch page, no inbound link.                                                              |
| `/api/calendar/google/*` (3)     | SHIPPED    | OAuth connect/callback/disconnect.                                                                   |
| `/api/calendar/sync`             | SHIPPED    |                                                                                                      |
| `/api/claude/stream`, `/narrate` | SHIPPED    | Now routed via OpenRouter (#261).                                                                    |
| `/api/nudges/evaluate`           | SHIPPED    |                                                                                                      |
| `/api/sentry-test`               | HALF-BUILT | Test endpoint, should not exist in prod.                                                             |
| `/api/trpc/[trpc]`               | SHIPPED    |                                                                                                      |
| **Missing entirely**             | SPEC-ONLY  | No `/clients`, `/time`, `/invoices`, `/intake/[token]`, `/filter`, `/tickler`.                       |

### 2.2 tRPC routers

| Router              | Procs | UI refs | State                                                                                            |
| ------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------ |
| `tasks`             | 19    | many    | SHIPPED                                                                                          |
| `projects`          | 22    | many    | SHIPPED (incl. templates, similarity, slip-replan)                                               |
| `planning`          | 40    | many    | SHIPPED — but it is the **bingo/goals** model, not Directions/Targets                            |
| `care`              | 22    | 40      | SHIPPED                                                                                          |
| `abyss`             | 14    | 35      | SHIPPED                                                                                          |
| `calendar`          | 8     | 28      | SHIPPED                                                                                          |
| `protectedBlocks`   | 10    | 38      | SHIPPED                                                                                          |
| `chat`              | 14    | many    | SHIPPED                                                                                          |
| `aboutMe`           | 12    | 23      | SHIPPED                                                                                          |
| `recurrence`        | 8     | 17      | SHIPPED                                                                                          |
| `phases`            | 5     | 17      | SHIPPED                                                                                          |
| `focusBlocks`       | 6     | 14      | SHIPPED                                                                                          |
| `dailyWins`         | 10    | 13      | SHIPPED                                                                                          |
| `taskBulkImports`   | 4     | 10      | SHIPPED                                                                                          |
| `weekReviews`       | 5     | 9       | SHIPPED                                                                                          |
| `dayReviews`        | 4     | 8       | SHIPPED                                                                                          |
| `categorySettings`  | 3     | 8       | SHIPPED                                                                                          |
| `evidence`          | 6     | 7       | SHIPPED                                                                                          |
| `timeEntries`       | 9     | 7       | **HALF-BUILT** — task-scoped only; no project scope, no billable flag, no rate, no period report |
| `projectMilestones` | 5     | 4       | SHIPPED                                                                                          |
| `weekOverCommit`    | 3     | 4       | SHIPPED                                                                                          |
| `nudges`            | 2     | 4       | SHIPPED                                                                                          |
| `settings`          | 9     | many    | SHIPPED                                                                                          |
| `weekDayPriorities` | 4     | some    | SHIPPED                                                                                          |
| `weekDraft`         | 1     | some    | SHIPPED                                                                                          |
| `sync`              | 2     | some    | SHIPPED (desktop offline mirror)                                                                 |
| `dependencies`      | 3     | **1**   | HALF-BUILT — task dependency graph with essentially no UI                                        |
| `healthChecks`      | 2     | **0**   | HALF-BUILT — dead                                                                                |
| `me`                | 1     | some    | SHIPPED                                                                                          |

### 2.3 Schema (49 files)

| Group                    | Tables                                                                                                                                           | State          | v1 relevance                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------- |
| Core work                | `projects`, `tasks`, `phases`, `project_milestones`, `task_dependencies`, `task_recurrence`, `task_occurrence_overrides`, `task_bulk_imports`    | SHIPPED        | **Keep** — needs reshaping (client, rate, category collapse)    |
| Time                     | `task_time_entries`, `focus_blocks`, `protected_blocks`, `protected_block_templates`, `reserved_days`                                            | SHIPPED        | **Keep `task_time_entries`** (reshape); rest is calendar-shaped |
| Goal layer (old)         | `goals`, `goal_milestones`, `bingo_cards`, `quarter_themes`, `month_intentions`, `planning_suggestions`, `planning_enums`, `week_day_priorities` | SHIPPED        | **Replace** — bingo/life-category model ≠ Direction→Target      |
| Wellness                 | `care_activities`, `care_events`, `care_reflections`, `care_enums`, `daily_wins`, `user_values`                                                  | SHIPPED        | **Cut by MISSION.md**                                           |
| Reassurance / AI persona | `evidence_editions`, `nudge_events`, `about_me_sections`, `about_me_suggestions`, `about_me_enums`, `chat_messages`, `chat_custom_suggestions`   | SHIPPED        | Not in any scope item                                           |
| Backlog                  | `abyss_items`                                                                                                                                    | SHIPPED        | **Keep, reduced** — it is where the Sweep lands                 |
| Calendar                 | `calendar_connections`, `external_calendar_events`, `calendar_enums`                                                                             | SHIPPED        | Not in any scope item                                           |
| Reviews                  | `day_reviews`, `week_reviews`                                                                                                                    | SHIPPED        | Partially serves the Ledger/Sweep                               |
| Config                   | `app_settings`, `category_settings`, `user_constraints`                                                                                          | SHIPPED        | Keep, prune fields                                              |
| Indulgence               | `project_similarity`, `project_templates`, `health_checks`                                                                                       | SHIPPED / dead | Templates keep; similarity + health_checks cut                  |
| **Absent**               | `clients`, `rates`, `invoices`, `invoice_lines`, `directions`, `targets`, `intake_submissions`, `filter_scores`, `tickler_items`                 | SPEC-ONLY      | The money half of v1                                            |

### 2.4 Spec docs

All 41 `kash-3.x-*.md` files plus `docs/build-status.md` describe the pre-mission product.
`docs/build-status.md` states "Kash 3.0 complete; Kash 3.1 nearly complete" — true of that
product, irrelevant to this one. Treat the whole set as **SPEC-ONLY and dead**, with three
exceptions worth mining before archiving: `kash-3.0-design-tokens.md` (live design system),
`docs/rls-audit.md` (live security posture), `docs/audits/2026-07-05-e2e-flow-audit.md`
(method, reusable). Everything else goes to `docs/archive/pre-mission/` unread.

---

## 3. STEP 2 — Triage

### 3.1 GO — in v1

| Item                                                       | Serves   | State                  | Reason                                                                                                                        |
| ---------------------------------------------------------- | -------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `projects` + Miller board + `/projects/[id]`               | **1**    | SHIPPED, needs reshape | Project tracking is scope item 1; it exists and is good. Needs `client_id`, `rate`, `state`, and the category enum collapsed. |
| `phases`, `project_milestones`                             | **1**    | SHIPPED                | Structure inside a client engagement; already earning its keep.                                                               |
| `project_templates` + `createFromTemplate`                 | **6**    | SHIPPED                | This is 60% of client onboarding automation already built.                                                                    |
| `tasks` + Today + Week + Loose + Backlog rows              | **2**    | SHIPPED                | Scope item 2, done.                                                                                                           |
| `task_recurrence` + occurrence overrides                   | **2, 9** | SHIPPED                | Recurring tasks are named in scope item 9.                                                                                    |
| `task_bulk_imports`                                        | **2**    | SHIPPED                | Cheap, finished, saves real minutes on project kickoff.                                                                       |
| `task_time_entries` + timer + `TaskTimeEntries`            | **3**    | HALF-BUILT             | The spine of scope items 3 and 4. Must gain project scope + billable.                                                         |
| `abyss_items` (as Backlog)                                 | **5**    | SHIPPED                | The Sweep's drop/park/keep needs a place for "park".                                                                          |
| `week_reviews`, `day_reviews`                              | **5**    | SHIPPED                | Reusable chassis for the Ledger and the Sweep.                                                                                |
| `app_settings`, `category_settings`, auth, RLS, tRPC, sync | all      | SHIPPED                | Foundations.                                                                                                                  |
| Design system, `ui/`, nav, command palette, drag/drop      | all      | SHIPPED                | Foundations. Do not touch.                                                                                                    |
| Composer (`composer/`)                                     | **2**    | SHIPPED                | Task input path. Must be **un-hidden** from behind the "+" when chat is parked.                                               |

### 3.2 PARK — flag off, data preserved, no trace in the UI

Four items. Each is finished, harmless, and plausibly wanted back.

| Item                                                                                                           | Serves        | Why park not kill                                                                                                                                                                                                      | Data preserved                                    |
| -------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Google Calendar sync** (`calendar` router, 3 API routes, `calendar_connections`, `external_calendar_events`) | none directly | Finished and self-contained. It makes the Budget's capacity number honest, so it is the one park most likely to be un-parked in v1.1.                                                                                  | Connections + cached events.                      |
| **Chat coach / assistant** (`chat` router, `chat_messages`, `SurfaceCoachLayout` docks, `src/server/claude/*`) | none directly | Finished, and product law 1 ("Flowstate drafts, you sign") means an assistant returns. But a coach dock on every page maps to zero of the nine scope items.                                                            | Message history.                                  |
| **Focus mode** (`/today/focus`, `focus_blocks`)                                                                | adjacent to 3 | Finished and harmless; it is currently the only place a timer starts, so it can only be parked _after_ the project timer lands.                                                                                        | Focus blocks.                                     |
| **Desktop app + offline sync** (`apps/desktop`, `packages/db-local`, `packages/sync`, `sync` router)           | none          | Finished and working, but it is a permanent tax: every new column must be mirrored to SQLite (see the column-drift and jsonb-bind incidents). Parking = stop building releases, keep the code. **NEEDS KAT** — see §7. | Local SQLite mirrors; hosted DB is authoritative. |

**How to mute a parked feature.** There is no flag system today; build one first
(`src/lib/flags.ts`, ~1h, part of P0 below):

```ts
// src/lib/flags.ts — server + client safe, default OFF, no runtime toggle UI.
export const FLAGS = {
  calendar: process.env.NEXT_PUBLIC_FLAG_CALENDAR === "on",
  chat: process.env.NEXT_PUBLIC_FLAG_CHAT === "on",
  focus: process.env.NEXT_PUBLIC_FLAG_FOCUS === "on",
} as const;
```

Then, per item — all four steps are required, because a route that 404s but still appears
in the command palette is not parked, it is broken:

| Parked item | 1. Nav                                                                                                                | 2. Route                                                                                                        | 3. Mounts                                                                                                                     | 4. Server                                                                                                 |
| ----------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Calendar    | No nav entry today. Remove the Calendar section from `settings/page.tsx`.                                             | `src/app/api/calendar/**/route.ts` → early `return new Response(null, { status: 404 })` when `!FLAGS.calendar`. | Remove `TodayTimeline`'s external-event layer and `getDaySummary` call behind the flag.                                       | Keep the router registered (harmless, RLS-guarded); it becomes unreachable from the client.               |
| Chat        | Remove `ChatToggleButton` from `LeftNavRail.tsx`; remove `OPEN_PALETTE_EVENT` chat entries from `CommandPalette.tsx`. | `src/app/api/claude/stream`, `/narrate` → 404 when `!FLAGS.chat`.                                               | `SurfaceCoachLayout` renders children only; delete the dock column. **Un-hide the composer's "+"** so task creation survives. | Keep `chat` router; drop `assemble-chat-context` from any non-chat call path.                             |
| Focus       | Remove the Focus entry point from `today/` and the command palette.                                                   | `src/app/(fullbleed)/today/focus/page.tsx` → `notFound()` when `!FLAGS.focus`.                                  | Remove `useTop3Assurance`'s `listAllStarted` dependency.                                                                      | Keep `focusBlocks`.                                                                                       |
| Desktop     | n/a                                                                                                                   | n/a                                                                                                             | n/a                                                                                                                           | Stop tagging `v*` releases; leave `release.yml` intact. Remove desktop jobs from PR/main CI if any exist. |

Remove `NAV_GROUP_REFLECT_PLAN` entirely once Care is killed and Plan is rebuilt; the nav
for v1 is **Today · Week · Projects · Clients · Time · Goals · Backlog · Settings**.

### 3.3 KILL — code and schema deleted

Product law 5: park only what is finished _and harmless_. Wellness features are not
harmless under this mission — they are the exact gravity the mission was rewritten to
escape. Half-built things are kills by definition.

| Item                                                                                                                                                  | Serves         | Reason                                                                                                                                                     | Data lost                                                  | Export first?                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **Care / garden** — `care` router (22 procs), `care_activities`, `care_events`, `care_reflections`, `care_enums`, `/care`, 21 components              | none           | MISSION.md: not a wellness app. Named cut.                                                                                                                 | Practice log + **written reflections** (personal journal). | **Yes** — one-off `scripts/export-care.cjs` → JSON. Reflections are irreplaceable.           |
| **Daily Wins** — router, `daily_wins`, body/mind/soul facets                                                                                          | none           | Named cut ("habit tracker").                                                                                                                               | Win history.                                               | Optional, fold into the care export.                                                         |
| **Evidence editions** — router, `evidence_editions`, cadence setting                                                                                  | none           | Reassurance engine. Not a scope item; violates law 3 (fires on a cadence, not evidence).                                                                   | Generated editions (regenerable).                          | No.                                                                                          |
| **Nudges** — router, `nudge_events`, `/api/nudges/evaluate`, `useEssentialNudges`                                                                     | none           | Same. The mission's only sanctioned interruption is the tickler, and that is being bought.                                                                 | Nudge history.                                             | No.                                                                                          |
| **About-me doc** — router (12 procs), `about_me_*` (3 tables), settings section, `src/server/about-me/*`                                              | none           | AI persona substrate. Dies with the coach's per-page presence.                                                                                             | Written self-description.                                  | **Yes** — it's prose you wrote. Dump to Markdown.                                            |
| **User values** — `user_values`, `goals.value_id`                                                                                                     | none           | Life-planning layer. Named cut.                                                                                                                            | Value list.                                                | No (3–7 strings).                                                                            |
| **Bingo card layer** — `bingo_cards`, `goals.cell_index`, `getOrCreateBingoCard`, `finalizeBingoCard`, ~20 `plan/` components                         | 5 (wrongly)    | A 5×5 life grid is structurally incompatible with "1–2 Directions, 3 Targets, capped." Cannot be extended into it.                                         | Card layouts.                                              | No.                                                                                          |
| **`goals` / `goal_milestones` as-is**                                                                                                                 | 5 (wrongly)    | Wrong shape: life categories, obligation/desire, value tags, no direction parent, no cap.                                                                  | Goal titles.                                               | **Yes** — dump titles to CSV so real Targets can be re-entered by hand (there are not many). |
| **`quarter_themes`, `month_intentions`, `planning_suggestions`**                                                                                      | none           | Journalling/intention-setting layer.                                                                                                                       | Themes, intentions.                                        | No.                                                                                          |
| **Project similarity** — `project_similarity`, MiniLM embeddings, `projects.embedding`, `backfillEmbedding` ×2, `listSimilarCandidates`, `tagSimilar` | none           | Client-side ML to suggest related projects across ~15 live projects. Textbook build-vs-buy violation, already built.                                       | Similarity links.                                          | No.                                                                                          |
| **`health_checks`** router + table + `/health` page                                                                                                   | none           | 0 UI references. Dead.                                                                                                                                     | None.                                                      | No.                                                                                          |
| **`task_dependencies`**                                                                                                                               | 2 (marginally) | 1 UI reference. A dependency graph is a 10-person-team feature; MISSION.md breaks at 10 on purpose.                                                        | Dependency edges.                                          | No.                                                                                          |
| **`/abyss` route**                                                                                                                                    | —              | Duplicate of `/backlog`, unreachable.                                                                                                                      | None.                                                      | No.                                                                                          |
| **`/dev/spacing-preview`, `/api/sentry-test`**                                                                                                        | —              | Dev scratch in a shipping app.                                                                                                                             | None.                                                      | No.                                                                                          |
| **`reserved_days`, `protected_blocks`, `protected_block_templates`** (38 UI refs)                                                                     | none           | Calendar-shaped capacity blocking. The Budget replaces it with time actually spent, which is the mission's measure. **Largest single deletion** — 38 refs. | Block templates.                                           | No.                                                                                          |
| **`week_day_priorities`, `weekOverCommit`, `weekDraft`, Top-3**                                                                                       | none           | The Top-3 gate is explicitly "later, not now" in MISSION.md.                                                                                               | Pins.                                                      | No.                                                                                          |
| **`user_constraints`**                                                                                                                                | none           | Life-planning input.                                                                                                                                       | Constraints.                                               | No.                                                                                          |
| **41 `kash-3.x-*.md` docs + `docs/build-status.md`**                                                                                                  | —              | Describe a product you are not shipping; actively dangerous as a source of truth.                                                                          | —                                                          | Move to `docs/archive/pre-mission/`.                                                         |
| **`project_category` enum values** `personal_projects`, `relationships`, `body_mind`, `adulting`                                                      | 9              | Scope item 9 is one Maintenance project, not four life categories. Collapse to `business                                                                   | personal`.                                                 | Category assignments.                                                                        | Migration maps: professional→business, all others→personal. |

**Rough teardown volume:** ~18 tables, ~90 procedures, ~110 components, ~60 tests, 26→~14
RLS files. This is a real ~12h of work and it is the highest-value 12h in the plan, because
every hour after it is spent on a smaller app.

---

## 4. STEP 3 — Gaps (the actual remaining build)

Everything in v1 scope with no code, or materially incomplete.

| Gap                                                                       | Scope item    | Today                                                                                                                                   |
| ------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Clients** — no table, no concept                                        | 1, 3, 4, 6, 7 | Zero. Projects have no owner.                                                                                                           |
| **Rates** — no rate anywhere                                              | 4             | Zero.                                                                                                                                   |
| **Project-scoped time**                                                   | 3             | Time attaches to a task only. Untasked client work is untrackable.                                                                      |
| **Billable flag**                                                         | 3, 4          | Zero.                                                                                                                                   |
| **Time reporting**                                                        | 4             | `weeklyRollup` only: one week, by category, no client, no billable split, no export.                                                    |
| **Billing thresholds + carry-forward**                                    | 4             | Zero. (Exists only in your `/invoice` Claude skill.)                                                                                    |
| **Proposed invoices**                                                     | 4             | Zero.                                                                                                                                   |
| **Directions**                                                            | 5             | Concept does not exist in code.                                                                                                         |
| **Targets (with cap, and a direction parent)**                            | 5             | `goals` is the wrong shape; no cap enforcement anywhere.                                                                                |
| **Project→Target link + the proposal at creation**                        | 5             | `goals.project_id` exists but points the wrong way and is never proposed.                                                               |
| **The Budget (time-denominated tilt + live bar)**                         | 5             | The existing "balance bar" counts **tasks by life category**. Mission law 4: time is the score. Wrong denominator = rebuild, not tweak. |
| **The Ledger (biweekly said-vs-spent)**                                   | 5             | Zero.                                                                                                                                   |
| **The Sweep (weekly drop/park/keep at every altitude)**                   | 5             | Abyss auto-archive (90d) + task triage are adjacent; there is no weekly ruling ritual and nothing above task altitude.                  |
| **The Toll (one sentence per project)**                                   | 5             | `commitSetup` is close but asks nothing about service-of.                                                                               |
| **Client onboarding action**                                              | 6             | Templates exist; nothing chains project + phases + time setup + checklist.                                                              |
| **The Filter — intake form, public link, scoring, verdict, override log** | 7             | Zero. Also needs a public unauthenticated route, which the app has never had.                                                           |
| **Tickler**                                                               | 8             | Zero. See §6 — recommend not building it.                                                                                               |
| **Personal = Maintenance project, excluded from goal layer**              | 9             | Enum collapse + a hard exclusion rule in the Target/Budget queries.                                                                     |

---

## 5. STEP 4 — Spec for the GO work and the gaps

Sizes: **S** <4h · **M** 4–12h · **L** 12–40h · **XL** >40h.

### W0 — Land PR #262 (orgs + tenancy classification) · **S (2h)** · deps: none

Open, CI-green, unmerged. It adds `orgs`, `org_memberships`, an org-resolving tRPC context,
and `src/db/tenancy.ts` — which every table added in W1–W4 must be classified in, with a
test that fails if one isn't. Merge it **before** the teardown, so the teardown is a
deletion of ~18 entries from a map rather than a rebase across 18 dropped tables.

**Acceptance criteria**

- [ ] #262 merged to `main`; typecheck, lint, test and build green.
- [ ] Hosted DB migrated via the `apply-*.cjs` path (not `drizzle-kit migrate` — the hosted journal diverges), RLS re-verified afterwards.

---

### W1 — Data reshape: clients, rates, category collapse · **L (16h)** · deps: W0

**Acceptance criteria**

- [ ] `clients` table: `id, user_id, org_id, name, currency, status, notes, archived_at`. Classified `org_shared` in `tenancy.ts`. RLS: owner-only, anon denied.
- [ ] **Rates live in their own `financial`-class table, never as a column on `clients` or `projects`.** `rates`: `id, user_id, org_id, client_id, project_id (nullable), amount_cents, effective_from`. This is a project rule in CLAUDE.md, enforced by the tenancy test in #262 — and it is right on the merits: a member's `SELECT *` on `projects` must not be able to leak a rate.
- [ ] Rate resolution is one function: project rate → client rate → explicit error. Tested.
- [ ] `projects` gains `client_id` (nullable — personal/internal work has none), `state` (`prospect | active | paused | done`), `is_maintenance` (bool). **No money columns.**
- [ ] `project_category` collapsed to `business | personal`; migration maps `professional→business`, all four others→`personal`, and is reviewed as SQL before commit.
- [ ] A project with `is_maintenance = true` requires no target and never appears in any goal-layer query — enforced in the query layer, with a test that asserts a maintenance project is absent from Target progress.
- [ ] `/clients` list + detail: create, edit rate, archive. No delete (archive only).
- [ ] Existing project rows all carry a client or are explicitly marked internal/personal after migration — verified by a count query returning 0 unassigned.

**Missing today:** all of it. **Dependencies:** none — this is the keystone; nothing else
starts cleanly before it.

---

### W2 — Time tracking, Clockify-grade · **L (~30h)** · deps: W1

The largest item in v1, and correctly so: every number in the product — the Budget, the
Ledger, invoices, effective rate, the hire trigger — is downstream of this log. Decisions Q2
and the timer questions of 2026-08-21 are folded in below.

#### Data

- [ ] `task_time_entries` → `time_entries`. `project_id` **NOT NULL**; `task_id` nullable; `description` text; `tag_id` nullable FK; `billable` bool (defaults from whether the project has a client); `source` (`timer | manual | gap_fill`); `invoiced_at` nullable.
- [ ] **No `client_id` on the entry.** Client is derived through `project_id`. A second copy drifts the moment a project is reassigned.
- [ ] `time_tags`: a **controlled list** the user manages in Settings (`Development`, `Meetings`, `Revisions`, …), because a tag is invoice structure and a typo becomes a wrong invoice line. Classified `org_shared`; free text is explicitly rejected.
- [ ] Backfill: every existing entry takes `project_id` from its task; entries whose task has no project land on a named "Unassigned" project rather than being dropped. Verified by a query returning 0 nulls.
- [ ] Desktop SQLite mirror gains every new column in the same PR, and `sqlite-defaults.test.ts` passes.

#### The timer

- [ ] Pick a project, type a description, hit start — **under two seconds, no task required.** Task links optionally, and when linked drives estimate-vs-actual.
- [ ] Exactly one timer runs at a time. Starting a second stops the first and names what it stopped.
- [ ] **Start time is authoritative; elapsed is computed, never accumulated.** The timer survives app quit, machine sleep, network loss, and midnight. A test asserts a timer started before a simulated quit reports correct elapsed after restart.
- [ ] **Menu-bar timer** (Tauri): shows the current project and elapsed, one click to stop, one to switch project. Start/stop/switch only — editing lives in the app.
- [ ] Timer is visible in the Today header while the app is open.

#### Accuracy, not discipline

- [ ] **Idle detection**: after 10 minutes of no input, on return prompt _"You were away 34 minutes — keep or trim?"_ with **trim preselected**. Never silently deletes; the default is the common case, the escape hatch covers thinking away from the keyboard.
- [ ] **End-of-day gap fill**: the close lists untracked spans over 15 minutes — _"2:10–4:00 is untracked, what was that?"_ — with one-click assign to a recent project, or dismiss.
- [ ] Manual entry and edit for any past day, accepting `1h15`, `75m`, `1.25` as durations.

#### Thresholds (all four fire native notifications; each at most once per crossing)

- [ ] **Client billing threshold** — _"Great White has passed 20h for August."_ Offers to draft the invoice (W4).
- [ ] **Timer running long / past day end** — _"Still tracking Hume — 6h14m."_ Catches the forgot-to-stop error that silently corrupts everything downstream.
- [ ] **Project over estimate** — fires only on projects that carry an estimate; hourly work without one never triggers it.
- [ ] **Weekly hours worked** — once per week maximum, worded as a rate and delivery-risk signal and surfaced next to effective hourly rate on Money, per MISSION.md's framing. Not a wellness prompt, no streak, no daily variant.
- [ ] No threshold fires twice for the same crossing, and all four are individually switchable off (law 3).

#### Export

- [ ] CSV of raw entries for any period: date, client, project, task, tag, description, duration, billable, invoiced.
- [ ] The same rows feed W3's reporting and W4's invoice drafts — one query path, not three.

**Rounding rule, stated once:** entries are tracked to the second and reported exactly.
Rounding to 0.25h happens **only** when an invoice line is generated (W4).

**Missing today:** all of it except a task-scoped start/stop and manual entry.

---

### W3 — Time reporting · **M (10h)** · deps: W2

**Acceptance criteria**

- [ ] One `/time` screen: pick a period (this week / last week / this month / last month / custom) and see total, billable, non-billable, and business-vs-personal split.
- [ ] Group by client → project → task, expandable, with each level summing correctly (verified against a hand-computed fixture in a test).
- [ ] Effective hourly rate = billable revenue ÷ **all** hours worked in the period, shown next to hours-worked-per-week. Both numbers, per MISSION.md, live here.
- [ ] CSV export of the raw rows for the period.
- [ ] Rounding rule is stated once in the code and applied everywhere (recommend: round each entry to the nearest minute, round only the invoice line to 0.25h).

---

### W4 — Proposed invoices · **L (16h)** · deps: W3

**Acceptance criteria**

- [ ] Per client per period, one action produces a draft: grouped line items (by project, or by phase where phases exist), hours, rate, amount.
- [ ] The line-item descriptions are written from the work, not the task titles verbatim — a client-readable sentence per group. (Reuse the logic in your `/invoice` skill; this is the one place AI drafting earns its keep, under law 1.)
- [ ] A per-client **billing threshold** (default 20h) caps the draft; hours above it are shown as **carry-forward**, with the running carried balance visible on the client.
- [ ] Accepting a draft marks those entries `invoiced_at` so they can never be billed twice — enforced by a unique/partial index, not by convention, with a test that double-billing fails.
- [ ] Output is **Markdown + CSV to clipboard/file**. Flowstate does not generate a PDF, does not track payment, does not send anything (law 1).
- [ ] Un-accepting a draft is possible and reversible.

**Dependencies:** W1 (rate), W2 (billable), W3 (rollup).
**Note:** this is where the money is. It is item 4 of nine, and it is the single feature
most likely to pay for the quarter.

---

### W5 — Directions & Targets · **L (18h; 12h cut)** · deps: W1

**Acceptance criteria**

- [ ] `directions`: `id, user_id, org_id, statement, active, created_at, retired_at`. Qualitative, never measured, no progress field — asserted by the absence of one.
- [ ] `targets`: `id, user_id, direction_id (NOT NULL), title, horizon (quarter|month|week), period_start, period_end, measure_kind, measure_target, measure_current, state`.
- [ ] **The cap is enforced in the mutation, not the UI**: creating a 3rd active direction or a 4th target in a quarter fails with the message naming what must be retired first. Test asserts the failure.
- [ ] Every target has a direction; the FK is non-nullable. Test asserts insert-without-direction fails.
- [ ] A project links to at most one target, or is `is_maintenance`. At project creation the app **proposes** the link ("This looks like it serves X — yes / no / different") and accepts "none / maintenance" as a first-class answer.
- [ ] Personal and maintenance projects are absent from every target query.
- [ ] A `/goals` screen shows: directions as text at the top, targets beneath with progress, and nothing else. No grid, no cells, no categories, no balance-by-life-area.
- [ ] Old `goals` rows exported to CSV and the tables dropped.

**Cut to 12h if needed:** drop the AI proposal at project creation (make it a plain select),
drop target milestones, drop the progress chart — a number and a bar is enough.

---

### W6 — The Budget · **M (10h)** · deps: W2, W5

**Acceptance criteria**

- [ ] One setting: declared tilt for the current quarter, as a percentage business vs personal (e.g. 70/30).
- [ ] Today shows a live bar of **minutes actually logged today** against that tilt — never task counts (law 4).
- [ ] Six 10-minute personal errands move the bar barely; one 3-hour personal detour moves it visibly. Verified with a fixture test on the bar's computation.
- [ ] The bar never blocks, warns modally, or turns red. It states, it does not nag (law 3).
- [ ] The existing task-count balance bar and `category_settings` weighting are deleted, not reskinned.

---

### W7 — The Sweep · **M (10h)** · deps: W1, W5

**Acceptance criteria**

- [ ] A weekly surface lists what has gone stale, at three altitudes: tasks untouched >21d, projects with no time logged in >21d, and targets with no movement this period.
- [ ] Each item takes exactly one of three rulings: **drop** (deleted), **park** (to Backlog, retrievable), **keep** (timestamp refreshed, won't resurface for a period).
- [ ] The list is finite and ends — it does not paginate forever; if there are more than ~20 items it shows the 20 stalest and says how many remain.
- [ ] Nothing is auto-dropped. The 90-day auto-archive on Backlog is removed; a machine closing doors for you is not the mechanic.
- [ ] Ruling on everything takes under five minutes with a keyboard.

---

### W8 — The Ledger · **M (8h)** · deps: W6 · **below the cut line**

**Acceptance criteria**

- [ ] Every second Friday, one screen: "You said 70% business. You spent 41%." Actual minutes over the fortnight vs declared tilt.
- [ ] Per-client and per-project breakdown of where the time went.
- [ ] No interruption during the day; it waits to be opened (law 3).
- [ ] Historical ledgers are readable.

---

### W9 — Client onboarding · **M (10h)** · deps: W1, W2 · **below the cut line**

**Acceptance criteria**

- [ ] From a client, one action creates: the project (client, rate, state=active), phases from a chosen template, and its time-tracking setup — in a single transaction.
- [ ] It also creates a **checklist of the manual steps** (create the Drive folder, send contract X, set up the calendar invite) as tasks on the project, pre-filled from a template you can edit.
- [ ] It does **not** call the Google Drive API, generate a contract, or email anyone (law 1, and see §6).
- [ ] Undo within the session removes everything it created.

---

### W10 — The Filter · **L (24h full; M/10h cut)** · deps: W1, W5 · **below the cut line**

**Acceptance criteria (full)**

- [ ] `intake_submissions` + a **public, unauthenticated, token-scoped** route `/intake/[token]` — the first anon-accessible surface in the app, so it needs its own RLS review and rate limiting.
- [ ] Eight questions covering Fit / Risk / Strategy exactly as enumerated in MISSION.md.
- [ ] Submissions score against the **active** Direction and Target and return **pursue / negotiate / decline** with a written reason per axis.
- [ ] The scoring weights live in one readable file, not scattered.
- [ ] Overrides are always allowed and always logged with a reason; the log is visible.
- [ ] "What do I have to say no to in order to say yes?" is answered with the actual list of active projects and their committed hours — not a free-text prompt.

**Cut to M (10h):** skip the public link and the token infrastructure entirely. You fill in
the eight answers yourself after the intro call; you get the same score and the same verdict.
The public form is a convenience for the _lead_; the decision system is the value. Ship the
decision system, and add the link in v1.1 once the weights have survived five real leads.

---

### W11 — Personal category · **S (folded into W1)** · deps: W1

**Acceptance criteria**

- [ ] Exactly one Maintenance project holds personal work; it accepts recurring tasks.
- [ ] Its tasks appear on the day and count toward the Budget.
- [ ] It appears in zero goal-layer surfaces — no target, no progress, no review, no nudge. A test asserts each goal-layer query excludes it.

---

### W12 — Teardown · **M (12h)** · deps: none (do it first)

**Acceptance criteria**

- [ ] Every KILL item in §3.3 removed: routes, routers, tables, components, tests, RLS files, migrations forward-only.
- [ ] Care + About-me exports written to `~/flowstate-exports/` and verified readable **before** the drop migration runs.
- [ ] `npm run typecheck && npm run lint && npm run test && npm run build` all pass.
- [ ] `docs/` and root `kash-3.x-*.md` archived; `README.md` rewritten to match MISSION.md.
- [ ] No dead nav entry, no orphaned route, no unused table.

---

### W13 — Flags + park plumbing · **S (4h)** · deps: W12

**Acceptance criteria**

- [ ] `src/lib/flags.ts` exists; all four parked features default **off**; `.env.example` updated.
- [ ] With all flags off, a full click-through of the app surfaces zero references to Calendar, Chat, Focus, or Care — including the command palette and settings.
- [ ] Turning a flag on restores the feature intact.

---

### The tickler (scope item 8) — **not built.** See §6.

---

## 6. Build-vs-buy violations

MISSION.md's own rule: 20 hours of build to save 15 minutes a month = don't build it.

| Thing                                                      | Build cost                                                                 | Saves                                                            | Verdict                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tickler (scope item 8)**                                 | ~10–14h for dates, recurrence, firing, snooze, and a surface               | ~8 compliance dates a year. Maybe 20 min/year of remembering.    | **Buy / do by hand.** Put the eight dates in Google Calendar with two reminders each, today, in fifteen minutes. This is the clearest violation in the scope list, and it is in the scope list. **I think MISSION.md is wrong to include item 8**, and I'd rather say so than quietly build it. |
| **Client onboarding: Drive folders + contract generation** | ~20h+ (Drive OAuth, scopes, folder templates, doc templating, error paths) | ~20 min per new client, at maybe 6 new clients a year = 2h/year. | **Buy / by hand.** Build the checklist version (W9, 10h) instead. A Drive folder template you duplicate takes 30 seconds.                                                                                                                                                                       |
| **Invoice PDF generation, payment tracking, dunning**      | ~20h                                                                       | You already have an invoicing tool and an `/invoice` skill.      | **Don't build.** Markdown + CSV handoff (W4) is the whole job.                                                                                                                                                                                                                                  |
| **Project similarity / MiniLM embeddings** (already built) | already spent                                                              | Suggests related projects across ~15 projects.                   | **Delete.** Sunk cost, ongoing tax.                                                                                                                                                                                                                                                             |
| **Offline sync engine** (already built)                    | already spent                                                              | Working on a plane.                                              | **Park.** Every future column pays a mirror tax; you have been bitten by this three times.                                                                                                                                                                                                      |
| **The Filter's public intake link**                        | ~14h of the 24                                                             | Saves the _lead_ two minutes of your call.                       | **Defer to v1.1.** Score it yourself after the call.                                                                                                                                                                                                                                            |

---

## 7. STEP 5 — Sequence, totals, and the honesty check

### 7.1 Build order

Dependency-respecting, money-first. Each phase ends with the app in a shippable state.

| #       | Phase                                 | Items                   | Hours    | Why here                                                                                         |
| ------- | ------------------------------------- | ----------------------- | -------- | ------------------------------------------------------------------------------------------------ |
| **P-1** | Land the boundary                     | W0 (PR #262)            | 2        | Already built and green. Merging first makes the teardown a map edit, not a rebase.              |
| **P0**  | Clear the decks                       | W12 teardown, W13 flags | 16       | Every later hour is spent in a smaller app. Also the only phase that can slip without cost.      |
| **P1**  | Clients + rates                       | W1                      | 16       | Keystone. Nothing about money works without it.                                                  |
| **P2**  | Time, honestly                        | W2                      | 10       | You start capturing correct data immediately — even before reporting exists, the entries accrue. |
| **P3**  | Get paid                              | W3, W4                  | 26       | **First money-positive milestone.** Ship here and Flowstate has already earned its quarter.      |
| **P4**  | Direction                             | W5, W11                 | 18       | The priority layer, minus the mechanics.                                                         |
| **P5**  | The two mechanics that change Tuesday | W6 Budget, W7 Sweep     | 20       | The mission's actual differentiator.                                                             |
| —       | **Cut line**                          |                         | **108**  |                                                                                                  |
| P6      | W8 Ledger                             |                         | 8        | Nice, not load-bearing, once the Budget is live.                                                 |
| P7      | W9 Client onboarding                  |                         | 10       | Saves 20 min, 6× a year.                                                                         |
| P8      | W10 Filter (cut version)              |                         | 10       | Highest-leverage _idea_; lowest-confidence _weights_.                                            |
| P9      | W10 Filter public link                |                         | 14       | v1.1 by any reading.                                                                             |
|         | **Total as scoped**                   |                         | **~150** |                                                                                                  |

Item 8, the tickler, is 0 hours because it is bought.

### 7.2 Does v1 fit in a quarter of evenings and weekends?

**No — not as scoped.**

A quarter of evenings and weekends is realistically 8–10 hours a week for 13 weeks:
**104–130 hours**, and the top of that range assumes no bad weeks, no client crunch, and no
rework. The full v1 above is **~148 hours**, and that estimate contains no contingency, no
QA pass, no migration incidents on the hosted DB (which has real data), and no design work
on five screens that don't exist yet. The realistic figure with 25% contingency is **~185
hours**. That is a quarter and a half, minimum, and it assumes the estimate is right, which
estimates aren't.

There is also a structural problem: **~16 of those hours are deletion.** They produce
nothing you can sell. They are still the right first move, but they eat two weeks of a
thirteen-week budget before a single new feature lands.

### 7.3 The cut line

**Ship v1 at P-1–P5: ~108 hours.** That fits a quarter at 8–10 h/week with roughly a week of
slack, and it is genuinely useful standing alone:

> A tool where every client engagement is a project with a rate, every minute is tracked and
> marked billable, invoices draft themselves with a threshold and a carry-forward, and a
> capped set of Directions and Targets sits over it with a live time budget and a weekly
> sweep.

That is items **1, 2, 3, 4, 5, 9** of nine — complete — and it is a coherent product on the
day it ships. It is your first hire doing the bookkeeper's job, which MISSION.md itself
names as the first hire.

**Moved to v1.1:** the Ledger (8h), client onboarding automation (10h), the Filter (10h +
14h for the public link). **Bought, not built:** the tickler.

**The uncomfortable part of this recommendation:** MISSION.md calls the Filter _"the
highest-leverage feature in the product,"_ and I am putting it below the line. My reasoning
is that the Filter is a _decision_ system, not a _software_ system — its value is the eight
questions and the weights, and you can run those on paper from tomorrow at a cost of zero
hours. What you cannot do on paper is reconstruct four months of time entries at invoice
time. Build the thing that can only exist in software; run the Filter by hand until you know
what the weights should be, then spend the 10 hours knowing they're right. If you disagree,
the swap is clean: Filter (cut version, 10h) in, Sweep (10h) out, same total.

### 7.4 The three decisions I'm least sure about

1. **Killing Care rather than parking it.** Product law 5 says park only what's finished and
   harmless, and Care _is_ finished. My call is that it is not harmless — it is the single
   most gravitational thing in the repo and 21 components of ongoing maintenance for a
   feature the mission names as cut. But it contains written reflections, and I may be
   underweighting what those are worth to you. Mitigation: export before dropping.
2. **Deleting `protected_blocks` / `reserved_days` (38 UI references).** They're the
   largest deletion by blast radius and the most likely to be load-bearing in ways the grep
   doesn't show. If protected blocks are how you actually defend deep work time, this is a
   PARK, not a KILL, and the number moves ~4h.
3. **Putting the Filter below the cut line**, per §7.3. It is the mission's own stated
   highest-leverage feature and I am deferring it on a build-vs-buy argument.

---

## 8. NEEDS KAT — ten open calls

| #   | Question                                                       | The trade-off                                                                                                                                                                                                                               | My lean                                                       |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | **Desktop app + offline sync: park or keep?**                  | Keeping costs a mirror-column tax on every schema change in P1–P5 (which are almost entirely schema changes) — call it +8–10h across the quarter, plus the failure modes you've already hit three times. Parking means web-only until v1.1. | **Park.** The quarter is nothing but schema churn.            |
| 2   | **Care reflections: export-and-delete, or keep the rows?**     | Keeping the tables with no UI is a park-by-neglect and violates law 5 in the other direction. Deleting is irreversible if the export is wrong.                                                                                              | Export to JSON, verify by reading it, then delete.            |
| 3   | **Google Calendar: park or keep?**                             | Parked, your Budget can't see meetings, so it will over-promise capacity on heavy-meeting days. Kept, it's a finished feature outside the nine items.                                                                                       | **Park**, and revisit the moment the Budget lies to you.      |
| 4   | **Chat: park entirely, or keep one global assistant?**         | Chat is currently the primary task-creation path; parking it means un-hiding the composer (~1h). Keeping a single global assistant is defensible under law 1 but maps to no scope item.                                                     | **Park the docks, keep nothing.** Un-hide the composer.       |
| 5   | **The Filter above or below the cut line?**                    | §7.3. Swapping it in costs the Sweep.                                                                                                                                                                                                       | Below.                                                        |
| 6   | **Client onboarding: Drive/contract automation or checklist?** | Real automation is 20h+ to save ~2h/year.                                                                                                                                                                                                   | Checklist (W9), and even that is below the line.              |
| 7   | **Tickler: buy or build?**                                     | 10–14h vs fifteen minutes in Google Calendar. I think the scope list is wrong here.                                                                                                                                                         | **Buy.** Do it this week, by hand.                            |
| 8   | **Invoice output: Markdown/CSV handoff, or in-app documents?** | In-app PDF/payment tracking is +20h and duplicates a tool you already pay for.                                                                                                                                                              | Handoff.                                                      |
| 9   | **Existing `goals` rows: migrate to Targets or drop?**         | Migration is fiddly (different shape, no direction parent, no cap) for maybe a dozen rows.                                                                                                                                                  | Export titles to CSV, re-enter the three that matter by hand. |
| 10  | **`protected_blocks` / `reserved_days`: kill or park?**        | §7.4 item 2. Biggest blast radius of any kill.                                                                                                                                                                                              | Kill — but tell me if you actually use them.                  |

---

## 8a. Decisions made 2026-08-21 (supersede the leans in §8)

| #   | Question                             | **Decision**       | Consequence                                                                                                                                                        |
| --- | ------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Desktop app                          | **KEEP**           | Every schema change in W1–W4 pays a SQLite mirror tax. ~+9h across the quarter. Also now mandated by MISSION.md's new "Desktop is not a wrapper" section.          |
| 2   | Care                                 | **PARK, not kill** | 4 tables + 21 components + the `care` router stay, flagged off. Hosted holds **0 care rows**, so nothing to export. Teardown shrinks ~2h; flag plumbing grows ~1h. |
| 3   | Chat                                 | **PARK**           | Coach docks removed from every surface; the composer's "+" must be un-hidden in the same PR or task creation breaks.                                               |
| 4   | `protected_blocks` / `reserved_days` | **KILL**           | As specced. 38 UI references — the largest single deletion.                                                                                                        |

Parked list is now **five**: Calendar, Chat, Focus, Care, and (no longer) Desktop.

### Revised estimate

|                                        | Hours    |
| -------------------------------------- | -------- |
| Cut line as written (§7.3)             | 108      |
| Care parked instead of killed          | −1       |
| Desktop kept — mirror tax across W1–W4 | +9       |
| **Revised cut line**                   | **~116** |

At 8–10 h/week × 13 weeks (104–130h), the slack is gone. It still fits at the top of that
range, but there is no longer room for a bad fortnight. **This does not yet price the
MISSION.md additions below.**

---

## 8b. MISSION.md changed on 2026-08-21 — what it costs

Four new sections landed after this triage was written. Three of them add scope.

**Product Law 4c — four surfaces (Today, Week, Money, Quarter).** The v1 nav proposed in
§3.2 was eight entries (Today · Week · Projects · Clients · Time · Goals · Backlog ·
Settings). That now violates a product law. Projects, Clients, Time, Backlog and Goals must
fold into the four: Projects/Clients into **Money** and **Week**, Time reporting into
**Money**, Goals into **Quarter**, the Sweep and Backlog into **Week**. This is an
information-architecture rework of W3/W5/W7's surfaces, not new functionality. **~+6h**, and
it should be decided before W3 is built, not after.

**"Time tracking has to be nearly free."** W2 was specced as project-scoped entries plus a
timer: 10h. The new section requires a **menu-bar timer**, **idle detection with a trim
offer**, and **retroactive end-of-day gap-filling** ("2:10–4:00 is untracked, what was
that?"). Those are three separate features, two of them Tauri-side. W2 becomes **L, ~22h
(+12)**. Given "every number in this product is downstream of the time log," I think this is
correctly prioritised — but it is the largest single scope increase in the document.

**"Desktop is not a wrapper."** This closes NEEDS-KAT #1 (keep desktop — already decided
above) and **reverses my build-vs-buy call on client onboarding**. §6 recommended a checklist
instead of folder automation, on the grounds that the API work cost 20h to save 2h/year.
MISSION.md now names local folder + starter-contract creation "the single most valuable
automation in the product" and puts it at automation Level 3. Local filesystem writes from
Tauri are much cheaper than the Drive API I was pricing against, so the objection is
substantially answered. W9 goes from a 10h checklist to **~14h of real automation**, and it
arguably moves above the cut line. **NEEDS KAT.**

**"Reviews arrive pre-answered" / "never a blank page."** Not new scope so much as a binding
constraint on W4, W7 and W8: each must open as a populated draft the user edits, never a
form. Already how W4 and W7 are specced; W8's acceptance criteria should say so explicitly.

**Revised total including the MISSION.md additions: cut line ~134h.** That no longer fits a
quarter of evenings and weekends at any realistic rate. Something below the line has to move
out, or W2's desktop-side time features (menu-bar timer, idle detection) become v1.1 while
the plain project timer ships in v1. **NEEDS KAT.**

---

## 8c. Decisions made 2026-08-21 (second pass)

| Q                   | Decision                                                                                                                                                 | Effect                                                                                                                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Four surfaces     | **B — five surfaces.** Today · Week · **Projects** · Money · Quarter                                                                                     | Projects keeps its own home and the Miller board stays one click away. **Conflicts with Product Law 4c**, added to MISSION.md the same day — see the note below. IA rework +3h (vs +6h for strict four). |
| 2 Timer scope       | **A — all three desktop time features in v1**, plus Clockify-grade entry (tags, required project, client, threshold notifications, invoice-ready export) | W2 goes 10h → **~28h**. Largest item in the plan.                                                                                                                                                        |
| 3 Calendar          | **Keep** (not parked)                                                                                                                                    | Meeting bars stay on Today; the Budget can net out booked time. Calendar must survive the W1 category collapse. +1h.                                                                                     |
| 4 Goals data        | **Keep**                                                                                                                                                 | The single goal row is migrated into the new Targets model rather than dropped. Bingo schema still goes. +1h.                                                                                            |
| 5 The Filter        | **Third option** — self-entered scoring panel in v1, public intake link in v1.1                                                                          | +6h. Decision system in v1, token/anon-route infrastructure deferred.                                                                                                                                    |
| 6 Client onboarding | **Keep, above the line**                                                                                                                                 | Local folder tree + starter contracts + project + phases + tasks, opened in Finder. Level 3. +14h.                                                                                                       |
| 7 Tickler           | **Build**                                                                                                                                                | ~6h once Today has a due strip. Surfaces on Today on the trigger date only; no fifth surface.                                                                                                            |
| 8 Invoice output    | **A now, B later**                                                                                                                                       | Markdown + CSV export and a manual sent/paid toggle in v1. In-app PDF and payment tracking explicitly back-burnered. +1h.                                                                                |

Parked list is now **three**: Chat, Focus, Care. (Focus needs revisiting once the new timer
lands — see §8e.)

### Law 4c conflict

MISSION.md gained Product Law 4c — _"Four surfaces. Today, Week, Money, Quarter. A feature
that needs a fifth home is a feature that doesn't belong"_ — on 2026-08-21. Decision Q1
above creates a fifth home for Projects on the same day. That is a legitimate call to make;
what is not legitimate is leaving both statements standing, because the next scoping
argument will cite whichever one is convenient. **Either amend Law 4c to name five surfaces,
or record Projects as its one documented exception.** Until MISSION.md says one or the
other, this document treats five surfaces as the decision and Law 4c as pending amendment.

### 8d. Revised arithmetic

|                                                       | Hours    |
| ----------------------------------------------------- | -------- |
| Cut line as recommended in §7.3                       | 108      |
| W0 complete (merged + hosted migrated)                | −2       |
| Care parked rather than killed                        | −1       |
| Desktop kept — SQLite mirror tax across W1–W4         | +9       |
| Q1 five-surface IA rework                             | +3       |
| Q2 W2 → full Clockify-grade time tracking (10h → 28h) | +18      |
| Q3 calendar retained through the reshape              | +1       |
| Q4 goal row migrated rather than dropped              | +1       |
| Q5 Filter scoring panel                               | +6       |
| Q6 client onboarding automation                       | +14      |
| Q7 tickler                                            | +6       |
| Q8 sent/paid toggle                                   | +1       |
| **Remaining**                                         | **~166** |

At 8–10 h/week that is **16–20 weeks**. A quarter is 13. As now scoped, v1 is roughly **1.3
to 1.6 quarters**, and 55% above the cut line this document recommended.

Nothing above was the wrong call in isolation. Taken together they restore most of what the
cut line removed. The three cheapest ways back under 130h, in order of least pain:

1. **Split W2 after all** — menu-bar timer and idle detection to v1.1, keep tags, required
   project, thresholds, exports and end-of-day gap filling. **−8h.**
2. **Client onboarding to v1.1** — it pays off per new client signed; if the pipeline is
   quiet this quarter it is 14h waiting for work. **−14h.**
3. **Tickler to v1.1** — eight dates a year, and the calendar handles them until then.
   **−6h.**

All three: **136h**. Any two: ~142–150h. This is a decision to take deliberately, not by
discovering it in week eleven.

### 8e. Focus mode

Focus is still on the parked list, but decision Q2 makes it ambiguous: Focus is currently
the only place a timer starts, and W2 replaces that with a first-class timer. Once W2 lands,
Focus is either redundant (park as planned) or it becomes the timer's full-screen mode
(un-park and fold in). Defer until W2 is built and the new timer can be used for a week.

---

## 9. Scoreboard

| Bucket                            | Count |
| --------------------------------- | ----- |
| **GO** (in v1)                    | 12    |
| **PARK** (flagged off, data kept) | 4     |
| **KILL** (deleted)                | 18    |
| **GAPS** (v1 scope with no code)  | 18    |
| **NEEDS KAT**                     | 10    |

**Total v1 as scoped: ~150h. Recommended cut line: ~108h. Fits a quarter: only at the cut
line.**
