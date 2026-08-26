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

| #   | Scope item                                   | The one-sentence proof it's done                                                                                                                                                                                                                                            |
| --- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Project tracking                             | Every live engagement is a project with a client, a rate, and a state; you can see all of them and their health on one screen.                                                                                                                                              |
| 2   | Task tracking                                | Tasks belong to projects, carry an estimate, recur when they should, and land on a day.                                                                                                                                                                                     |
| 3   | Time tracking                                | Every minute you work is attached to a project (and usually a task), marked billable or not, with no double-entry into another timer.                                                                                                                                       |
| 4   | Time reporting + invoicing                   | When a client crosses its billing threshold (with a monthly backstop — see W4 / discovery 1.9), one button gives a per-client draft — grouped work summary, hours capped at the threshold, carry-forward stated — that you review, adjust, and hand to your invoicing tool. |
| 5   | Directions/Targets + Budget + Ledger + Sweep | At most 2 Directions and 3 Targets exist; today shows a live time bar against your declared tilt; every other Friday you get an unarguable spent-vs-said number; every week you rule drop/park/keep on what's gone stale.                                                   |
| 6   | Client onboarding                            | One action turns "signed" into a project, its phases, its time-tracking setup, and a checklist of the manual steps.                                                                                                                                                         |
| 7   | The Filter                                   | A lead's answers to eight questions produce pursue / negotiate / decline with reasons, scored against your live Direction and Target, with logged overrides.                                                                                                                |
| 8   | Business tickler                             | Compliance dates fire at you and are otherwise invisible.                                                                                                                                                                                                                   |
| 9   | Personal category                            | Personal work is one Maintenance project with recurring tasks; it consumes budget, and it appears nowhere in the goal layer.                                                                                                                                                |

Section 5 proposes the cut line against this list. Section 6 explains why item 8 should not
be built at all.

### 1.1 Cross-cutting design conventions

- **No emoji, anywhere in the app** (owner directive, 2026-08-24). Every glyph is a
  monochrome line icon from the app's own SVG icon set (currentColor, lucide-style) — never a
  color emoji. This holds across all five surfaces, not just Money. (The only forced exception
  is a published-artifact browser-tab favicon, which the hosting platform requires be an
  emoji; it is never in-app chrome.)
- **Strip existing emoji, then guard it — a build task, not just a rule.** Audit the shipped
  UI (`src/`) for emoji in copy, labels, empty states, toasts, and icon placeholders; replace
  each with the monochrome icon set or plain text. Then add a **CI guard** (lint rule or test)
  that fails if an emoji codepoint appears in a `src/**` UI string, so none creep back. Small —
  a chore, foldable into the design-system foundations or the teardown (W12).

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

| Gap                                                                       | Scope item    | Today                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clients** — no table, no concept                                        | 1, 3, 4, 6, 7 | Zero. Projects have no owner.                                                                                                                                                                                                                                    |
| **Rates** — no rate anywhere                                              | 4             | Zero.                                                                                                                                                                                                                                                            |
| **Project-scoped time**                                                   | 3             | Time attaches to a task only. Untasked client work is untrackable.                                                                                                                                                                                               |
| **Billable flag**                                                         | 3, 4          | Zero.                                                                                                                                                                                                                                                            |
| **Time reporting**                                                        | 4             | `weeklyRollup` only: one week, by category, no client, no billable split, no export.                                                                                                                                                                             |
| **Billing thresholds + carry-forward**                                    | 4             | Zero. (Exists only in your `/invoice` Claude skill.)                                                                                                                                                                                                             |
| **Proposed invoices**                                                     | 4             | Zero.                                                                                                                                                                                                                                                            |
| **Directions**                                                            | 5             | Concept does not exist in code.                                                                                                                                                                                                                                  |
| **Targets (with cap, and a direction parent)**                            | 5             | `goals` is the wrong shape; no cap enforcement anywhere.                                                                                                                                                                                                         |
| **Project→Target link + the proposal at creation**                        | 5             | `goals.project_id` exists but points the wrong way and is never proposed.                                                                                                                                                                                        |
| **The Budget (time-denominated tilt + live bar)**                         | 5             | The existing "balance bar" counts **tasks by life category**. Mission law 4: time is the score. Wrong denominator = rebuild, not tweak.                                                                                                                          |
| **The Ledger (biweekly said-vs-spent)**                                   | 5             | Zero.                                                                                                                                                                                                                                                            |
| **The Sweep (weekly drop/park/keep at every altitude)**                   | 5             | Abyss auto-archive (90d) + task triage are adjacent; there is no weekly ruling ritual and nothing above task altitude.                                                                                                                                           |
| **The Week steering deck** — the surface that assembles the steering      | 5 (+ 7)       | Week today = the built 7-day grid under a _wrong_ 3-card band ("2 overdue" alarm + "4 stale" count). The steering MISSION names — pipeline+outreach queue, Target momentum, 14-day horizon, the Sweep preview, the drift reflection — is unbuilt. See W14 / §8f. |
| **The Toll (one sentence per project)**                                   | 5             | `commitSetup` is close but asks nothing about service-of.                                                                                                                                                                                                        |
| **Client onboarding action**                                              | 6             | Templates exist; nothing chains project + phases + time setup + checklist.                                                                                                                                                                                       |
| **The Filter — intake form, public link, scoring, verdict, override log** | 7             | Zero. Also needs a public unauthenticated route, which the app has never had.                                                                                                                                                                                    |
| **Tickler**                                                               | 8             | Zero. See §6 — recommend not building it.                                                                                                                                                                                                                        |
| **Personal = Maintenance project, excluded from goal layer**              | 9             | Enum collapse + a hard exclusion rule in the Target/Budget queries.                                                                                                                                                                                              |

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
- [x] Existing project rows all carry a client or are explicitly marked internal/personal after migration — verified by a count query returning 0 unassigned. _(Verified on hosted prod 2026-08-26: count was 3, resolved by creating the Great White / Hume / Frontenac Studios clients and linking each project — `scripts/backfill-w1-client-assignments.cjs`; re-count returns 0.)_
- [ ] **Projects surface presentation (Ch.3 walk-through, 2026-08-25).** The Miller board is promoted to the Projects surface **root** — the shipped card gallery and the per-project phase→task drill fold into one Finder board. The surface carries **two lanes** behind a segmented switch: **Delivery** (the Miller board — column 0 = clients, grouped under `Active` / `Paused` state headers, with Personal / no-client its own group; drill client → project → phase → task → detail; fixed 256px columns) and **Pipeline** (`state = prospect` projects as the `Sourced → Contacted → Engaged → Proposal → Signed` funnel; advancing is an explicit side-effecting button, drag is the override). The grouping axis is **by client** (owner's choice over by-state). A rate never appears on a board card (`financial`); it shows only in project detail. The pipeline funnel lives here, not on Week (matches §8f: "no funnel stage counts on Week").
- [ ] **Money-layer pipe laid now (discovery §8g / W16).** Add `business_expenses` (`financial`-class: `id, user_id, org_id, amount_cents, incurred_on, category_label, source (manual|csv), note`) and the money-settings fields (tax-reserve %, monthly cost-of-living, personal-savings figure, manual business/personal cash balances) — schema + tenancy classification + RLS only; the Draw panel (W16) consumes them later. Laid here because the reshape is already touching this ground; deferring it means a second migration.

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
- [ ] **Clockify cutover import** (discovery 3.2): Flowstate _replaces_ Clockify (no live sync, 3.1); at cutover, import **open unbilled time only** to seed each client's carry-forward, not the full history. The project→client mapping method is open **Q9** (lean: one-time manual pass at cutover) — this criterion states the _what_; Q9 settles the _how_.
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

- [ ] One `/time` screen: pick a period (this week / last week / this month / last month / custom) and see total, billable, non-billable, and **billed-vs-worked (utilization)**. _(The third tile was "business-vs-personal split"; changed to billed-vs-worked to mirror Today's cut of the business/personal ratio as a useless number — Ch.4 walk-through, 2026-08-24.)_
- [ ] Group by client → project → task, expandable, with each level summing correctly (verified against a hand-computed fixture in a test).
- [ ] Effective hourly rate = billable revenue ÷ **all** hours worked in the period, shown next to hours-worked-per-week. Both numbers, per MISSION.md, live here.
- [ ] **Trends band** at the foot of Money (Ch.4 walk-through, 2026-08-24): four small time-series over ~13 weeks — **earned weekly** (billable hours × rate, _accrued_, with a faint "billed" line so the earned-minus-billed gap reads as the unbilled backlog over time), **billed vs worked** (paired weekly hours + utilization), **effective rate over time**, and **revenue by client** (stacked). The three money words stay distinct everywhere on Money: **earned** (worked × rate, accrued) / **billed** (invoiced) / **collected** (paid).
- [ ] CSV export of the raw rows for the period.
- [ ] Rounding rule is stated once in the code and applied everywhere (recommend: round each entry to the nearest minute, round only the invoice line to 0.25h).

---

### W4 — Proposed invoices · **L (16h)** · deps: W3

**Acceptance criteria**

- [ ] Per client per period, one action produces a draft: grouped line items, hours, rate, amount. **Grouping is AI-themed** (Ch.4 walk-through, 2026-08-24): the billable entries' descriptions are clustered into **at most 8 named themes**, each theme one line item; if the work spreads wider, the smallest themes merge into a single "Additional work" line so the cap always holds. (Supersedes the earlier "by project, or by phase" grouping.)
- [ ] The line-item descriptions are written from the work, not the task titles verbatim — a client-readable sentence per theme. (Reuse the logic in your `/invoice` skill; this is the one place AI drafting earns its keep, under law 1.) The theme name, its summary sentence, and its hours are all editable before sending.
- [ ] A per-client **billing threshold** (default 20h) caps the draft; hours above it are shown as **carry-forward**, with the running carried balance visible on the client.
- [ ] Accepting a draft marks those entries `invoiced_at` so they can never be billed twice — enforced by a unique/partial index, not by convention, with a test that double-billing fails.
- [ ] Output is **Markdown + CSV to clipboard/file**. Flowstate does not generate a PDF, does not track payment, does not send anything (law 1).
- [ ] Un-accepting a draft is possible and reversible.
- [ ] **Trigger is threshold-primary + a monthly backstop** (discovery Q1, §8g). The per-client draft is offered when the client crosses its 20h threshold (W2's billing-threshold notification is the prompt); a once-a-month "anything ready to bill?" sweep catches clients dribbling under 20h. Not a fixed calendar-date run — the DONE-table line "on the 1st you press one button" is superseded by this.
- [ ] **Tier-0 tax reserve (discovery 2.5, folds in here).** From the period's billed revenue and the tax-reserve % set in W1's money settings, show a single "set aside $Y for tax" line next to the effective rate. Nearly free — it is the one draw-adjacent number only Flowstate's revenue data can produce; the rest of the Draw panel is W16.

**Dependencies:** W1 (rate), W2 (billable), W3 (rollup).
**Note:** this is where the money is. It is item 4 of nine, and it is the single feature
most likely to pay for the quarter.

---

### W5 — Directions, Targets & the Quarter surface · **L (34h; 22h cut)** · deps: W1

> **Rescoped 2026-08-25 by the Quarter discovery** ([docs/discovery-quarter.md](./discovery-quarter.md),
> esp. §13). MISSION names five things on Quarter — Directions, Targets, the learning roadmap, tool
> spend, compliance — and the original 18h W5 built only the first two. This item now builds the whole
> surface. Superseded criteria are struck; new ones carry a `[Q]` tag.

**Acceptance criteria**

- [ ] `directions`: `id, user_id, org_id, statement, active, created_at, retired_at`. Qualitative, never measured, no progress field — asserted by the absence of one. **Cap 1–2**; "retire", never delete.
- [ ] `targets`: `id, user_id, org_id, direction_id (NOT NULL), title, horizon (quarter|month|week), period_start, period_end, measure_kind, measure_target, measure_current, state, archived_at`. **`[Q]` gains `measure_source` (`auto`|`manual`) + a derivation key (`money_booked`|`clients_signed`|`milestones_shipped`)** — auto measures read live, manual hold the last-entered value (discovery §13 Q1, hybrid).
- [ ] **The cap is enforced in the mutation, not the UI**: creating a 3rd active direction or a 4th target in a quarter fails with the message naming what must be retired first. Test asserts the failure. **`[Q]` In the UI the failure is a "retire one" moment, never a toast — there is no empty 4th slot** (§13 / artboard 4).
- [ ] Every target has a direction; the FK is non-nullable. Test asserts insert-without-direction fails.
- [ ] A project links to at most one target, or is `is_maintenance`. At project creation the app **proposes** the link ("This looks like it serves X — yes / no / different") and accepts "none / maintenance" as a first-class answer.
- [ ] Personal and maintenance projects are absent from every target query.
- [ ] The active targets also surface on the **Week steering deck** as "The bets" (W14): one progress bar per target over a "shipped this week" evidence line. This is a Week-side read of the same data — the canonical Quarter surface is `/plan` below.
- [ ] ~~A `/goals` screen shows directions as text and targets with progress, and nothing else.~~ **`[Q]` The Quarter surface renders at `/plan`** (rebuilt from the placeholder stub, wrapped in `SurfaceCoachLayout surface="plan"`), top-to-bottom: Directions (sentences + applied line) → the bets (flat "3 of 3" list, each chip-tagged to its Direction) → Learning roadmap → read-strips → the review banner. No grid, no cells, no categories, no balance-by-life-area, no personal-goals view — ever.
- [ ] **`[Q]` Create/edit = one smart composer**: a single field routes number+date → a bet (revealing kind/source/horizon/parent inline for confirmation) else a Direction (§13 Q2).
- [ ] **`[Q]` The learning roadmap is a business project Quarter reads** — a `projects.is_learning` (or `kind`) flag + `capability` (title) + `why` + `reached_at`; milestones reuse project **phases**; logged time is ordinary project time; cap 1 active. Renders as a "Learning roadmap" block on Quarter and as a non-client card on the Projects board. **No effective-rate tie, no hours quota** (§13 Q7; MISSION amendment B, §8h).
- [ ] **`[Q]` Two read-strips: tool spend** (reads `business_expenses` → drills to Money) **and compliance this quarter** (the tickler's dated obligations + reserve status → owned by Today). Conditional — absent when empty; never editable on Quarter (§13 / discovery §5).
- [ ] **`[Q]` The full quarterly review ritual** — an **in-place banner** in the last ~week of the quarter (no mode/takeover); pre-answered from data; drop/carry/done on each Target, keep/retire on Directions, reached/carry on the learning track; ends by drafting the next quarter (carries kept Directions + carried Targets + the learning track into open slots). If ignored, the prior board persists flagged "closing overdue" — nothing auto-drops (§13 Q3 / artboard 3).
- [ ] **`[Q]` A met Target archives on crossing** (`archived_at`, `state=met`) off the active board to the quarter record (shows Done in the review) — **only on objective met**; stale/unmet never auto-archive, they route to the Sweep (W7). A landed bet still counts toward the 3-cap (§13 Q4).
- [ ] **`[Q]` A one-time guided first-run** teaches the Direction→Target model at zero-Directions/never-completed; dismissible, never a recurring gate (§13 Q6).
- [ ] Old `goals` rows migrated into the new model (the single kept goal → a Target per §8c Q4), then the `goals`/`goal_milestones` tables dropped.

**Cut to 22h if needed:** ship the review **thin** (auto-close + carry, no drafted-next-quarter, −5h);
drop the smart-composer routing for a plain "Direction / bet" toggle (−3h); drop the guided first-run
for the calm-invitations empty state (−2h); make the project→target link a plain select (−2h). The
learning project, read-strips, hybrid measure source, and the cap-as-a-moment stay — they are the
surface's reason to exist.

---

### W6 — The Budget · **M (10h)** · deps: W2, W5

**Acceptance criteria**

- [ ] One setting: declared tilt for the current quarter, as a percentage business vs personal (e.g. 70/30).
- [ ] Today shows a live bar of **minutes actually logged today** against that tilt — never task counts (law 4).
- [ ] Six 10-minute personal errands move the bar barely; one 3-hour personal detour moves it visibly. Verified with a fixture test on the bar's computation.
- [ ] The bar never blocks, warns modally, or turns red. It states, it does not nag (law 3).
- [ ] The declared tilt also drives the Week deck's **off-target flag** (W14): a single reflective line, shown only when the week's logged time drifts from the tilt past a threshold — the weekly early-warning of the biweekly Ledger (W8), worded as a question, never a red alarm.
- [ ] The existing task-count balance bar and `category_settings` weighting are deleted, not reskinned.
- [ ] Where the Budget nets out booked time against capacity, it counts **only accepted, timed** calendar events (discovery 3.5) — declined and all-day events must not read as busy, or the free-hours number lies. Calendar stays read-only, as already built.

---

### W7 — The Sweep · **M (10h)** · deps: W1, W5

**Acceptance criteria**

- [ ] A weekly surface lists what has gone stale, at three altitudes: tasks untouched >21d, projects with no time logged in >21d, and targets with no movement this period.
- [ ] Each item takes exactly one of three rulings: **drop** (deleted), **park** (to Backlog, retrievable), **keep** (timestamp refreshed, won't resurface for a period).
- [ ] **"Keep" buys a month of quiet, not a week** (discovery 1.8), and the list must **visibly shrink week over week** — a Sweep that repeats the same items every Friday trains wholesale dismissal, which is the failure mode that kills the ritual.
- [ ] The list is finite and ends — it does not paginate forever; if there are more than ~20 items it shows the 20 stalest and says how many remain.
- [ ] Nothing is auto-dropped. The 90-day auto-archive on Backlog is removed; a machine closing doors for you is not the mechanic.
- [ ] Ruling on everything takes under five minutes with a keyboard.
- [ ] The stale list also surfaces on the **Week steering deck** as the named "Gone quiet" preview, whose button opens this ritual; the same preview is embedded in the Friday review (W14).

---

### W14 — The Week steering deck · **M (~10h; ~8h above the cut line)** · deps: W5, W6, W7 (+ W10 below)

Week is the **steering surface** (fork B: a steering deck over the kept 7-day grid). It
**assembles, it does not duplicate** — the heavy views live on Projects (pipeline), Money (the
Ledger), and the Sweep ritual; the deck surfaces them. Six goals were interviewed and decided
2026-08-24 (see §8f); this item builds them. It replaces the earlier three-card band ("2
overdue" alarm + "4 stale" count), which mis-read the brief.

**Acceptance criteria**

- [ ] Layout is a **2×2 block deck** above the built 7+1 grid — top-left **Waiting on you**,
      top-right **The bets**, bottom-left **Coming up**, bottom-right **Gone quiet** — plus a
      full-width **off-target** banner that spans the top _only_ on drift. Below the deck: the grid
      (unchanged), the capture inbox, and the Friday-review invite.
- [ ] **Waiting on you** (goals 1+2): one urgency-sorted queue folding pipeline **and** outreach —
      the weekly sourced batch, follow-ups owed on contacted leads, and live-deal moves — in three
      visually-distinct row-types. **No funnel stage counts** (those live on the Projects board).
- [ ] **The bets** (goal 3): the cap-3 active Targets (W5), each a thin progress bar over a
      "shipped this week" evidence line. A target that moved nothing this week states so in muted
      grey — never crimson.
- [ ] **Coming up** (goal 4): deliverables across every client for the next 14 days, in two calm
      dated buckets — _this week_ / _next week_. **Overdue is excluded** (it belongs on Today).
      Stripes stay category-coded; clients read by name label, not colour.
- [ ] **Gone quiet** (goal 5): the W7 stale list as a named preview (items by name, every
      altitude) that opens the W7 ritual, and the same preview embedded in the Friday review.
- [ ] **Off-target flag** (goal 6): silent by default. A single reflective banner appears _only_
      when the week's logged time (W6) drifts from the declared tilt past a threshold — worded as a
      question, reserved-yellow, never crimson. The weekly early-warning of the biweekly Ledger (W8).
- [ ] Conditional blocks (Gone quiet, off-target) are **absent** when they have nothing to show —
      never rendered as empty cards. Each block loads on its own lane; a slow sourcing query never
      blocks the grid or the bets. The grid pages by week; the deck always shows "now."

**Cut-line split.** The above-cut portion (~8h) ships with **P5** — the bets, coming-up, gone-quiet,
the off-target flag, and the follow-up/deal queue rows — the moment W5/W6/W7 exist. The queue's
**sourced-batch** row (~2h) lights up with **W10 / the sourcing agent**, below the cut line; until
then that row shows an empty-state, not a broken one. See the §8f dependency flag on the outbound
sourcing agent.

---

### W15 — Project planning & estimate-vs-actual · **M–L (~13h)** · deps: W1, W2 · net-new (discovery §8g)

The planning layer over projects/phases. Projects and phases were counted "SHIPPED, reshape in
W1"; the _planning_ — estimates, billing type, burn, the off-track signal — was never itemised.
Decisions 4.1–4.7 of the discovery.

> **Numbering note.** The discovery doc calls this item **"W14"** ([discovery §5](./discovery-v1-journeys-and-money.md)); this document numbers it **W15**, because W14 was claimed by the Week steering deck (decided 2026-08-24, one day after the discovery). Discovery's "W14" = this doc's W15. The discovery doc has not been renumbered.

**Acceptance criteria**

- [ ] A plan = template → phases → **per-phase hour estimate + optional deadline**. Task-level estimate stays optional (4.1). No dependency graph — ordering expresses sequence (4.2, a DAG is a 10-person feature).
- [ ] `projects` gains **`billing_type` (`hourly | fixed_fee`)** (4.3). Fixed-fee projects carry a **fee amount + a target-rate floor** (the effective rate below which the fixed fee is losing money) (4.4). Fixed-fee planning ships in v1 — the mix is real, not speculative.
- [ ] **The universal off-track signal = budget (hours) consumed ahead of work (phases/tasks) completed** (4.5) — computable from data already on hand, fires before either the bill (hourly) or the margin (fixed-fee) surprises you. "Running hot" is type-aware: more revenue on hourly, evaporating margin on fixed-fee.
- [ ] Estimate-vs-actual surfaces at three altitudes, no new home (4.6): **project detail** (per-phase burn bars), **Projects board** (a health dot), and **Week** (the earliest steering read — feeds W14's off-target/health signals).
- [ ] The **first** off-track crossing fires **one native notification** + a Week treatment (4.7); it is evidence, not a timer, so it earns the interruption under law 3. At most once per crossing; switchable off.
- [ ] **Cut option (−5h, → v1.1):** ship hourly planning + the objective burn signal; defer the fixed-fee fee/margin-floor half until a fixed-fee project has run through the hourly view once.

---

### W16 — The Draw panel (personal + business money) · **L (~14h)** · deps: W1 (pipe), W3, W4 · **displaces W9 onboarding automation → v1.1**

The money dashboard that answers "what can I pay myself?". Area 2 of the discovery; the
MISSION.md "Money crosses into personal at exactly one point: the draw" section (amended
2026-08-23) is its authority. **The draw is the boundary** — business up to and including the
draw is in; everything after it is out.

**Acceptance criteria**

- [ ] **Roll-ups, not transactions** (2.2). Flowstate never ingests transaction rows; the moment it needs categorised transactions it is a budgeting app (the mission's named trap, Tier 2, §8g "never build").
- [ ] **Running cash ledger** (2.3): business cash derived live from paid invoices − imported/entered business expenses − logged owner draws; a manual bank-balance figure is a periodic reconcile that surfaces drift, not a live feed.
- [ ] **Business expenses**: manual entry + **CSV import** into `business_expenses` (table laid in W1). No bank feed, no accounting-tool API — ever (§8g won't-build).
- [ ] **Categories come from the import** (Ch.4 walk-through, 2026-08-24, grounded in the owner's real Xero **Bills** export + Chart of Accounts). Mapping: `AccountCode → category` (names read from the user's Chart of Accounts — e.g. `6340 Software & Subscriptions`, `6410 Travel`, `6230 Meals`, `6160 Licenses and Fees`, `6250 Office Expense`, `6350 Supplies`, `6400 Training and Conferences`, `6440 Vehicle Expense`), `LineAmount → amount_cents`, the **date prefix inside `Description` → incurred_on** (NOT `InvoiceDate`, which is the reimbursement-batch date), merchant = `Description` before " - ". One `business_expenses` row per line; a `REIMB-*` invoice is a batch of them. An unmapped code lands in **"Uncategorized"**, never a guessed bucket.
- [ ] **Presented as a P&L**: `Service Revenue (4100)` − operating expenses grouped by account (only non-zero, sorted) = **net profit**; then the draw allocation (tax reserve → cost-of-living floor → `Owner's Draws (3200)` = take-home), flagged when the draw falls under the floor.
- [ ] **Recurring expenses auto-detected** (no schema change): a merchant repeating across months at a regular cadence is flagged recurring and rolled into a "fixed monthly overhead" subtotal (the software stack). Detection tolerates amount drift (plan changes) — keys on merchant + cadence, not exact amount.
- [ ] **Expenses-by-category over time**: a small stacked chart by month, one series per account code — the spend-shape companion to the Money Trends band (W3).
- [ ] **The panel** (Tier 1): available-to-draw = revenue − business expenses − tax reserve; business runway (cash ÷ burn); **personal runway + minimum draw** from the one held cost-of-living number. _(The optional personal-savings figure reconciled like the bank balance is the **lean** on open **Q8**, not yet decided — build the cost-of-living number as the firm requirement and gate the savings figure behind Q8.)_
- [ ] **Owner draws** are logged as their own row type (they reduce business cash, they are not an expense).
- [ ] Lives as a **section of Money**, per the IA decision (§8g 1.1) — no new surface, no rail entry.
- [ ] Tier 0 (the tax-reserve line) already shipped in W4; this item is Tier 1 on top of it.

**Why it displaces onboarding automation (Q4):** onboarding pays off only when you sign a
client (pipeline-dependent; the checklist half works by hand meanwhile — see W9). The Draw
panel pays off every month regardless of pipeline. Net hours ≈ 0 (both ~14h). W9's automation
moves to v1.1; "signed" still creates client + project + phases in v1, with the folder/contract
steps as the manual checklist.

---

### W8 — The Ledger · **M (8h)** · deps: W6 · **below the cut line**

> **Stays in v1 (Quarter discovery §8h, 2026-08-25).** The discovery considered deferring the Ledger to
> v1.1 to offset the Filter moving above the cut; Kat declined — nothing is deferred. The Ledger remains
> below the recommended cut line but inside the fully-scoped v1.

**Acceptance criteria**

- [ ] Every second Friday, one screen: "You said 70% business. You spent 41%." Actual minutes over the fortnight vs declared tilt.
- [ ] Per-client and per-project breakdown of where the time went.
- [ ] No interruption during the day; it waits to be opened (law 3).
- [ ] Historical ledgers are readable.

---

### W9 — Client onboarding · **M (10–14h)** · deps: W1, W2 · **→ v1.1 (displaced by W16, discovery Q4)**

> **Moved to v1.1 (discovery §8g).** The full automation (local folder tree + starter contracts,
> §8c Q6) is displaced by the Draw panel (W16). What survives in v1: "signed" creates the client +
> project + phases (part of W1/the Filter handoff), and the manual steps are a checklist of tasks.
> The folder/contract Level-3 automation lands in v1.1.

**Acceptance criteria**

- [ ] From a client, one action creates: the project (client, rate, state=active), phases from a chosen template, and its time-tracking setup — in a single transaction.
- [ ] It also creates a **checklist of the manual steps** (create the Drive folder, send contract X, set up the calendar invite) as tasks on the project, pre-filled from a template you can edit.
- [ ] It does **not** call the Google Drive API, generate a contract, or email anyone (law 1, and see §6).
- [ ] Undo within the session removes everything it created.

---

### W10 — The Filter · **L (24h full; M/10h cut)** · deps: W1, W5 · ~~below the cut line~~ **committed above the cut (Quarter discovery §8h, 2026-08-25)**

> **Above the cut, no offset (2026-08-25).** The Quarter discovery pulls the M/10h cut Filter above
> the cut line so a Direction's applied line ("scored N leads, declined M") is live in v1 rather than
> dormant — the loop that makes a Direction visibly do its job. Kat declined to fund it by deferring
> the Ledger (W8); v1 simply extends. The 10h was already inside the ~174h scoped total, so this is a
> sequencing commitment, not new hours. Sequence **right after W5**. (Public intake link stays v1.1.)

**Acceptance criteria (full)**

- [ ] `intake_submissions` + a **public, unauthenticated, token-scoped** route `/intake/[token]` — the first anon-accessible surface in the app, so it needs its own RLS review and rate limiting.
- [ ] Eight questions covering Fit / Risk / Strategy exactly as enumerated in MISSION.md.
- [ ] **"Decline outright" escape** (discovery 1.3, §8g): a junk lead is declined in one action that **skips the eight questions entirely** — logged with a reason, zero scoring. The eight questions are only for leads you are genuinely tempted by; forcing full scoring on every lead kills the habit by week two. (+1h, already in the §8g arithmetic.)
- [ ] Submissions score against the **active** Direction and Target and return **pursue / negotiate / decline** with a written reason per axis.
- [ ] The scoring weights live in one readable file, not scattered.
- [ ] Overrides are always allowed and always logged with a reason; the log is visible.
- [ ] "What do I have to say no to in order to say yes?" is answered with the actual list of active projects and their committed hours — not a free-text prompt.
- [ ] Scored leads and their aging follow-ups feed the **Week steering deck**'s "Waiting on you" queue (W14) — sourced batch, follow-ups owed, and live-deal moves as one urgency-sorted list. **Note:** the deck's follow-up/deal rows read existing lead state and ship without W10; the **sourced batch** requires the outbound _sourcing agent_ (a larger reframe of MISSION's inbound Filter, tracked in the walk-through and flagged in §8f), which W10 as specced here does **not** yet include.

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

| #       | Phase                                          | Items                                          | Hours    | Why here                                                                                                |
| ------- | ---------------------------------------------- | ---------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| **P-1** | Land the boundary                              | W0 (PR #262)                                   | 2        | Already built and green. Merging first makes the teardown a map edit, not a rebase.                     |
| **P0**  | Clear the decks                                | W12 teardown, W13 flags                        | 16       | Every later hour is spent in a smaller app. Also the only phase that can slip without cost.             |
| **P1**  | Clients + rates                                | W1                                             | 16       | Keystone. Nothing about money works without it.                                                         |
| **P2**  | Time, honestly                                 | W2                                             | 10       | You start capturing correct data immediately — even before reporting exists, the entries accrue.        |
| **P3**  | Get paid                                       | W3, W4                                         | 26       | **First money-positive milestone.** Ship here and Flowstate has already earned its quarter.             |
| **P4**  | Direction + the Quarter surface                | W5, W11                                        | 34       | The whole Quarter surface (§8h); W5 grew 18h → 34h. W10 (Filter, hours in P8) sequences right after W5. |
| **P5**  | The two mechanics that change Tuesday          | W6 Budget, W7 Sweep, W14 Week deck (above-cut) | 28       | The mission's actual differentiator, assembled on the Week surface.                                     |
| —       | **Cut line**                                   |                                                | **116**  |                                                                                                         |
| P6      | W8 Ledger                                      |                                                | 8        | Nice, not load-bearing, once the Budget is live.                                                        |
| P7      | W9 Client onboarding                           |                                                | 10       | Saves 20 min, 6× a year.                                                                                |
| P8      | W10 Filter (cut) + W14 sourced-batch queue row |                                                | 12       | Highest-leverage _idea_; lowest-confidence _weights_. Lights up the deck's sourced batch.               |
| P9      | W10 Filter public link                         |                                                | 14       | v1.1 by any reading.                                                                                    |
|         | **Total as scoped**                            |                                                | **~160** |                                                                                                         |

Item 8, the tickler, is 0 hours because it is bought.

> **This table is the §8f-era sequence (~160 base).** It predates the §8g discovery (+W15/W16) and the
> §8h Quarter fold-in (W5 18→34h, Filter above the cut). The current scoped total is **~190h** (§8h);
> P4 above carries the new W5 figure but the other §8g/§8h deltas are recorded in their sections, not
> re-summed here. Treat §8h's arithmetic as authoritative.

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

## 8f. Week steering deck — decisions made 2026-08-24

MISSION.md names Week's contents twice: _"pipeline, outreach, features shipped, the Sweep, and
'am I still working on the right thing at all'"_ and _"pipeline, what's due in the next fourteen
days across every client, what's gone stale, and the Sweep."_ An earlier draft of the Week band
got this wrong — an operational "2 overdue" alarm and a terse "4 stale" count, and it missed
outreach, features-shipped, and the reflection entirely. Six steering goals were interviewed one
at a time and decided; the result is spec item **W14** plus the cross-references in W5/W6/W7/W10.

| #   | Steering goal               | **Decision**                                                                              | Where it's built               |
| --- | --------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| 1   | Pipeline (leads)            | **Action queue only** — no funnel counts on Week                                          | W14 "Waiting on you"           |
| 2   | Outreach                    | **Folded into that one queue** — sourced batch + follow-ups owed + deal moves, by urgency | W14 · data from W10 / sourcing |
| 3   | Features shipped / momentum | **Target bars + a "shipped this week" evidence line** (flat week = grey, never red)       | W14 "The bets" · W5            |
| 4   | Due next 14 days            | **This-week / next-week buckets** (chosen over timeline / agenda / load-chart)            | W14 "Coming up"                |
| 5   | Gone stale / the Sweep      | **Named preview → the finite ritual, AND embedded in the Friday review**                  | W14 "Gone quiet" · W7          |
| 6   | "Am I on the right thing?"  | **Off-target flag only** — silent unless the week's time drifts from the declared tilt    | W14 banner · W6                |

The through-line across all six: **verbs over metrics, names over counts, silence over noise.**
Two of the six pieces (the Sweep preview, the reflection) render only on evidence; a calm week
shows two standing blocks and a quiet grid. Full wireframe: the Ch.2 walk-through artifact
(steering deck, rev3).

**Cost.** W14 adds **~10h** — ~8h above the cut line (folded into P5), ~2h below (the sourced-batch
queue row, with W10). Cut line **108 → 116h**; fully-scoped **~150 → ~160h**. This makes the §8d
"three cheapest ways back under 130h" more pressing, not less.

**Dependency flag — NEEDS KAT.** Goals 1–2 assume the **outbound sourcing agent** (the weekly
researched batch of prospects), which is a larger reframe of MISSION's _inbound_ Filter — currently
tracked only in the walk-through and **not costed in this document**. W10 as specced is the inbound,
self-scored Filter. The deck's follow-up/deal queue rows work from existing lead state and ship
above the cut line; the **sourced-batch row needs the sourcing agent built**. Decide whether the
sourcing agent is in v1 (the walk-through's position is "core, sequenced after the money half") and
cost it, or ship the deck's queue without the sourced-batch row until v1.1.

---

## 8g. Discovery decisions folded in — 2026-08-23

Source of record: **[docs/discovery-v1-journeys-and-money.md](./discovery-v1-journeys-and-money.md)** —
a full discovery session across four areas (UX journeys, the money layer, capture, project
planning). This section folds its decisions into the build plan; the discovery doc keeps the
reasoning and the journey walk-throughs. Where a decision here changes a `W`-item, that item now
carries the criterion inline (W1, W4, W9, W15, W16).

### The IA decision everything hangs on

**No standalone "Clients" or "Time" surface.** A client appears at three altitudes — pipeline
(Week), delivery (Projects), billing (Money) — so it has no altitude of its own: it is a
**drill-in from Money**, cross-linked from Projects. Time reporting is a **section of Money**. The
five surfaces stay (Today · Week · Projects · Money · Quarter). This is the concrete resolution of
the §8c Law 4c conflict — an entity at every altitude gets no rail entry of its own.

### Decisions → where they landed

| Area     | Decision                                                                                                                                                                                                                                                                                                                                       | Landed in                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Journeys | Invoice trigger = **threshold-primary (20h/client) + monthly backstop** (Q1, answered).                                                                                                                                                                                                                                                        | W4 criterion; supersedes the "on the 1st" DONE-table line. |
| Journeys | Filter = a panel on a Week pipeline card, with a **"decline outright"** escape that skips the eight questions.                                                                                                                                                                                                                                 | W10 (+1h escape).                                          |
| Journeys | Sweep = a Friday section of Week; Ledger = a biweekly section of Money; both pre-answered. "Keep" buys a month of quiet.                                                                                                                                                                                                                       | W7, W8, W14.                                               |
| Money    | **The draw is the boundary.** Business up to the draw is in; after it is out; one held cost-of-living number for personal runway.                                                                                                                                                                                                              | **MISSION.md amended** (new "the draw" section); W16.      |
| Money    | **Roll-ups, not transactions**; running cash ledger; **Tier 1 Draw panel ships in v1**, displacing onboarding automation (Q4). Tier 2 (personal budgeting/feeds) **never built**.                                                                                                                                                              | W16; W9 → v1.1; pipe in W1; Tier-0 in W4.                  |
| Capture  | Flowstate **replaces** Clockify (no live sync); at cutover import **open unbilled time only**. Money capture = manual roll-ups + CSV, **no bank feed / no accounting-API**. Email→tasks **paste-only**. Calendar stays read-only. Docs→context **not built**. Global hotkey = **one line of text into a single Backlog inbox**, triaged later. | W2 (import note), W16 (CSV), won't-build list below.       |
| Planning | Plan = template → phases → **per-phase estimate + optional deadline**; **no dependency graph**; projects gain **`billing_type`**; **fixed-fee planning in v1**; off-track signal = **budget consumed ahead of work done**; surfaces on project detail / board / Week.                                                                          | **W15 (net-new, ~13h).**                                   |

### Scope movement

- **Into v1:** W16 Draw panel (~14h), W15 project planning (~13h), Filter decline-outright (~1h).
- **Out of v1 → v1.1:** W9 onboarding _automation_ (folder tree + starter contracts); the checklist half survives via "signed".
- **Won't build (v2 / never):** live Gmail inbox integration; document→context ingestion; bank feed (Plaid); accounting-tool (QBO/Xero) API; **personal budgeting / categories / net worth (Tier 2)** — contradicts the mission by name; task dependency graph.

### Decided but not yet homed — two orphans to place

Two discovery decisions are **decided** (not deferred) yet map to no existing W-item and were not
costed. They are recorded here so they are not lost; each **NEEDS KAT** for a home and hours before
its phase is built.

| Decision                                                                                                                                                           | Why it has no home                                                                                                                                         | Proposed placement                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **3.7 — Global hotkey capture.** One line of text into a single Backlog inbox, no decision at capture (< 2s); triaged later, the Sweep rules on stale inbox items. | Net-new capture behaviour; the discovery names it but never itemised it in its own scope ledger, so it carries **no hours** anywhere.                      | **New item W17 — Quick-capture inbox · S (~3–4h).** A global hotkey, a raw-text Backlog inbox, and its Sweep hook. Below the cut line unless capture friction is a v1 blocker.     |
| **1.6 — "One thing to start" weighting.** Today's handed-to-you action must weight **target-linked + client-billable + deadline**, not deadline alone.             | Today is SHIPPED with no W-item; the selection rule is a behaviour change to the existing surface, and it overlaps the deferred Monday-first-look UX (Q2). | Fold into the **Q2 UX-flow session** as a firm input (it is decided, not a lean), and land the selection change with whatever Today work that session scopes. No standalone hours. |

### Revised arithmetic (on top of the §8f base)

|                                                     | Hours        |
| --------------------------------------------------- | ------------ |
| Prior fully-scoped total (§8f scoreboard)           | ~160         |
| W16 Draw panel in / W9 automation out               | +14 − 14 = 0 |
| W15 project planning & estimate-vs-actual (net-new) | +13          |
| Filter decline-outright escape                      | +1           |
| **Revised v1 total**                                | **~174**     |

**Authoritative totals live in [`docs/build-tracker.html`](./build-tracker.html) (line-by-line
sum).** The prose figures above were coarse and mutually inconsistent (§8d ~166, §8f scoreboard
~160, this table ~174). The tracker itemizes every unit of work — including W2 split into a–f and
the below-cut items — and sums to:

- **167 h — cut-line v1** (P-1…P5): the coherent, shippable v1. This is the number to steer by.
- **+24 h below the cut line** (W8 Ledger, W10 Filter, Tickler) → **191 h all-in**.
- W9 onboarding automation (12 h) is deferred to v1.1 and excluded from both.

Where this doc's prose and the tracker disagree, the tracker wins. To land the **167 h cut-line**
nearer a quarter, the reversible deferrals in the discovery doc §5 (split W2 −8h · Ledger →v1.1
· tickler →v1.1 · fixed-fee half of W15 →v1.1) still apply — the open **Q5**, to decide deliberately.

### Still open (unchanged by this fold-in)

- **Q2 / Q3** (Monday first-look; rhythm nudges) — being worked in a **separate UX-flow session**; leans (one next action; silent) stand as defaults.
- **Q5–Q10** — the cut line, the fixed-fee "running hot" %, tax-reserve as one % vs per-period, personal-savings figure, Clockify import mapping, Focus-after-W2 — remain open. Q5 (cut line) is the only one that changes the ship date.

---

## 8h. Quarter discovery decisions folded in — 2026-08-25

Source of record: **[docs/discovery-quarter.md](./discovery-quarter.md)** — a discovery session on the
fifth surface (Quarter = the bet altitude), with a committed visual
([discovery-quarter-wireframes.html](./discovery-quarter-wireframes.html)). The trigger: **MISSION names
five things on Quarter — Directions, Targets, the learning roadmap, tool spend, compliance — and W5 as
written built only the first two.** This section folds the decisions into the plan; the discovery doc
keeps the reasoning, the flows, and the wireframes.

### Decisions → where they landed

| Area                    | Decision                                                                                                                                                                                                                                    | Landed in                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Surface                 | Quarter renders at **`/plan`** (rebuilt stub), wrapped in `SurfaceCoachLayout surface="plan"`. Order: Directions → the bets → Learning → read-strips → review banner.                                                                       | W5 criteria                              |
| Learning roadmap        | **A business project Quarter reads** (`is_learning` flag + capability/`reached_at`; milestones = phases; ordinary project time). No `learning_tracks` table, **no effective-rate tie, no hours quota**, cap 1. Shows on the Projects board. | W5; MISSION amendment B (below)          |
| Targets — measure       | **Hybrid source**: `measure_source` (`auto`\|`manual`) + a derivation key. Auto reads live ($ from Money, clients from pipeline, shipped from milestones); manual holds the last value.                                                     | W5 criteria                              |
| Targets — cap           | **Cap-3 as a "retire one" moment**, never a toast; no empty 4th slot.                                                                                                                                                                       | W5 criteria                              |
| Targets — met           | **Archive-on-met** off the active board (to the quarter record) — only on objective met; stale/unmet route to the Sweep. A landed bet still counts toward the 3-cap.                                                                        | W5 criteria                              |
| Create/edit             | **One smart composer** — number+date → a bet (fields revealed inline) else a Direction.                                                                                                                                                     | W5 criteria                              |
| Two Directions          | **Flat "3 of 3" list**, each bet chip-tagged to its Direction.                                                                                                                                                                              | W5 criteria                              |
| Cold start              | **One-time guided first-run** (Direction→Target teach), not a recurring gate.                                                                                                                                                               | W5 criteria                              |
| Tool spend + compliance | **Read-strips on Quarter, owned elsewhere** (Money / the tickler); both in v1, conditional, not editable here.                                                                                                                              | W5 criteria; keeps the **tickler in v1** |
| Quarterly review        | **Full pre-answered ritual, in-place banner** (no takeover); ends by drafting the next quarter.                                                                                                                                             | W5 criteria                              |
| The Filter              | **Committed above the cut, no offset** (Ledger stays in v1). Makes the Direction applied-line live. Sequence right after W5.                                                                                                                | W10 note; W8 note                        |

### MISSION.md amendment — applied 2026-08-25

**Amendment B (learning roadmap, drop the rate tie) — APPLIED** to MISSION.md line 201. The mission's
Learning-Roadmap line tied learning to effective rate; it now reads learning as a business investment
measured by capability plus logged time, never scored against a rate (worded to match the
learning-is-a-project decision). Record in [discovery-quarter.md §9](./discovery-quarter.md).
_(Amendment A, "Law 4c → five surfaces", was found already applied in MISSION.md — a no-op.)_

### Scope movement

- **Into v1:** W5 grows **18h → 34h** (learning-as-project +3, full review +9, read-strips +4). The
  Filter (W10) is committed above the cut (0 new hours — already in the scoped total). The tickler
  stays in v1 (feeds the compliance strip).
- **Out of v1:** nothing (Kat declined the Ledger→v1.1 offset).
- **v1.1:** a retired-Direction / dropped-Target **history browser** (the data is kept from v1; the
  dedicated view is later). Learning's effective-rate tie stays cut.
- **Won't build (holds the line):** any personal-goals view on Quarter; a progress bar/metric on a
  Direction; editing money or tickler data on Quarter; learning as a multi-track course-list; a `year`
  horizon UI (enum kept, no surface).

### Revised arithmetic (on top of §8g's ~174h)

|                                                        | Hours    |
| ------------------------------------------------------ | -------- |
| §8g scoped total                                       | ~174     |
| W5 grows (learning +3, full review +9, read-strips +4) | +16      |
| Filter above the cut (already counted) / Ledger kept   | +0       |
| **Revised v1 total**                                   | **~190** |

~190h at 8–10 h/week ≈ **1.5–1.8 quarters**. **Ship posture (decided 2026-08-25): ship the full ~190h**;
the reversible deferrals (split W2 −8h, fixed-fee half of W15 −5h, W5's own 22h cut −12h) stay available
but none is taken — the cut line is revisited only if the calendar slips.

### Confirmed 2026-08-25 (was "still open")

- **MISSION amendment B — applied** (above).
- **Archive-on-met slot rule — confirmed:** a landed bet still counts toward the 3-cap; winning early
  does **not** free a slot. "Three bets a quarter" stays literally true.
- **Ship posture — ~190h, cuts deferred:** ship at the full ~190h scope; the cut line (Q5) is revisited
  only if the calendar slips. Ship target ~1.5–1.8 quarters. The reversible menu (split W2 −8h, fixed-fee
  half of W15 −5h, W5's 22h cut −12h) stays available but none is taken.

---

## 9. Scoreboard

| Bucket                            | Count |
| --------------------------------- | ----- |
| **GO** (in v1)                    | 14    |
| **PARK** (flagged off, data kept) | 4     |
| **KILL** (deleted)                | 18    |
| **GAPS** (v1 scope with no code)  | 21    |
| **NEEDS KAT**                     | 11    |

**Total v1 (line-by-line, per `docs/build-tracker.html`): 167h cut-line / 191h all-in. Fits a quarter:
only at the cut line.**
