# Kash 3.0 — Data Spine: Phased Decision Breakdown

> The active build unit: **Categories-on-tasks + Task/Data-Model tables.** Every decision, grouped into implementation phases by dependency + risk. Decisions get recorded in the log (§7) as we resolve them, phase by phase.
> Companions: `kash-3.0-plan.md` (§2, §14 specs) and `kash-3.0-build-breakdown.md` (§6).

---

## 1. Scope & current schema reality

Five pieces make up the spine:

1. **Category on tasks** — the MECE dimension (§2).
2. **Category settings store** — user label + color overrides.
3. **Time-tracking generalization** — entries on any task (§14).
4. **Task dependencies** — A blocks B, project-scoped (§14).
5. **Recurrence** — rule + generated occurrences + overrides (§14).

**Verified against the code (Jun 2026):**

- `tasks` has `id, user_id, project_id (nullable), phase_id, title, priority, scheduled_date, bucket_override, sort_order, is_top_3, top_3_order, top_3_pinned_at, completed_at, …` — **no `category`**. Clean column add.
- `task_time_entries.task_id` already references **any** `tasks.id` (not project-scoped). So #3 is mostly **UI/wiring, not schema** — a pleasant surprise.
- `project_category` enum already exists (5 categories) on `projects`. We reuse it for tasks.
- No `task_recurrence`, `task_occurrence_overrides`, `task_dependencies`, or `category_settings` tables exist.

## 2. Build order rationale

Smallest → largest, lowest risk → highest, each phase independently shippable:

**Phase 0 (confirm)** → **Phase 1 (category)** → **Phase 2 (time-tracking, light)** → **Phase 3 (dependencies)** → **Phase 4 (recurrence, heaviest)**.

Recurrence is last because it's the most complex and nothing else depends on it. Category is first because everything balance-related depends on it.

---

## Phase 0 — Lock the inputs (no schema yet)

Quick confirmations that gate the schema work.

- **0.1 Display labels** — confirm final labels (Professional, Personal Projects, Relationships, Adulting, Body & Mind) or rename now. (Labels are user-editable later regardless.)
- **0.2 Enum naming** — keep the existing enum value `health_wellness` internally and just show "Body & Mind", or migrate the enum value to `body_mind`? (Migrating an enum value is a heavier migration.)
- **0.3 Loose-task backfill method** — for existing tasks with no project: assign a default category, run a one-time AI categorization pass, or present a manual triage UI?
- **0.4 Balance weighting** — pure task count vs Top-3-weighted (large/small). Decide now so analytics are consistent from day one (even though the metric surfaces later).

---

## Phase 1 — Category on tasks (the spine)

**Goal:** every task carries exactly one category, end to end; labels/colors are user-overridable.

**Schema**

- **1.1 (decided — §7)** Add `tasks.category` (`project_category` enum). Migration sequence: add **nullable** → AI backfill → set **NOT NULL** (two migrations with the backfill between).
  - **1.1a (decided)** Add a companion `tasks.category_unresolved` boolean (default `false`) — the invisible-plumbing state from 1.4d. A row can carry `category = 'adulting'` (NOT NULL satisfied) while `category_unresolved = true` so the UI renders a **neutral "no category yet" marker** (never the word Adulting), the row stays **out of balance math**, and a backfill pass / the resolver re-fills it later (offline re-resolve, 1.4e). Set `false` once any layer 1–4 resolves it.
- **1.2 (decided — §7)** Category settings store = a dedicated `category_settings` table (one row per category per user): label, color, sort, weekly targets / §7.6 review prefs. (Not an `app_settings` JSON blob.)

**Behavior / integration**

- **1.3 Inheritance** — a task created inside a project defaults to `project.category`, with override allowed. Enforce where: app layer (tRPC create), DB trigger/default, or both? (Recommend app layer for clarity.)
- **1.4 Loose-task capture** — is category **required** at creation for project-less tasks, or does it default to something? What's the default if required-but-unset? **Resolved as a layered resolver — see "Loose-task resolver" below.**
- **1.5 Composer/parser** — add a category token to quick-input (e.g. a `@category` or reuse `#`), or set category only via a UI control? (Interaction decision; affects the parser.)
- **1.6 tRPC** — `tasks.create` / `tasks.update` Zod input gains `category`; validation + inheritance logic.
- **1.7 Backfill migration** — project tasks ← `project.category`; loose tasks ← per **0.3**.

**Loose-task resolver (decided — Model C, AI-forward)**

One shared `resolveTaskCategory` helper (the 1.3 TS helper, used by tRPC create/update _and_ offline sync) decides every loose task's category through a fixed ladder. Same logic powers the one-time AI backfill (0.3) and live capture — backfill only adds a human-review gate because it's bulk.

```
resolveTaskCategory(title, { projectId, lastUsed, online }):
  1. explicit       — semicolon segment / chip / API value            → assignment
  2. project         — project.category when projectId present          → context
  3. AI (if confident) — inferCategoryFromTitle(title) when online AND
                          confidence ≥ THRESHOLD                        → AI-forward
  4. lastUsed        — app_settings.last_used_category when set         → habit
  5. Unresolved      — category = 'adulting' (NOT NULL) + category_unresolved = true
                          → rendered as neutral "no category yet" marker
```

- **Model = C (AI-forward).** AI inference is consulted _before_ last-used on the live capture path, not just as an opt-in suggestion. `inferCategoryFromTitle` must return a **category + confidence score**; a tunable `THRESHOLD` gates whether it outranks habit (1.4c).
- **Composer indicator (1.4b)** — **no chips.** The composer input renders a **color accent bar** (left edge in the resolved category's color, from `category_settings`) with the category **name as a faint trailing label**. Typing `;` opens a **fuzzy autocomplete** of the five category names; **Tab/Enter accepts** and becomes an explicit assignment (layer 1), overriding the AI guess. Same color language carries to the task row + detail.
- **Disagreement (1.4c)** — when AI and last-used differ, **AI wins only above the confidence threshold**; otherwise last-used. No silent low-confidence overrides.
- **`lastUsed` update rule** — set `last_used_category` to the **resolved** category on successful create whenever a real layer (explicit / project / AI / lastUsed) decided it, so habit stays true even when AI picked the first one. **Skip the update when the unresolved fallback fired** (1.4d) — the `adulting` placeholder is plumbing, not a choice, and must not become the next default.
- **Deep fallback (1.4d — invisible plumbing)** — layer 5 only fires when offline/inference-failed **and** no project **and** no last-used. Stored as `adulting` for NOT NULL but flagged `category_unresolved = true`, rendered as a **neutral "no category yet" marker** (the accent bar shows no category color/name), kept out of balance math, and cleaned up by a **backfill pass** + the resolver later. The word "Adulting" is **never** shown for these.
- **Offline (1.4e)** — capture never blocks. Offline, the resolver skips layer 3 and uses last-used (or the unresolved marker). The task is **queued for sync**; on reconnect AI re-resolves any `category_unresolved` rows. **No second/local categorizer** — one AI source of truth, so web/desktop/offline never disagree on rules.
- `adulting` is **plumbing, never presented as "we chose Adulting for you."** A genuine user-picked Adulting task has `category_unresolved = false`; the fallback has it `true` and renders as the neutral marker.

**Platform**

- **1.8 RLS** — `category_settings` (if new table) → `auth.uid()` policy in `supabase/rls/`.
- **1.9 Sync/offline** — add `category` to the SQLite `tasks` mirror + sync package; mirror `category_settings`.

**Acceptance:** every task has a category; new tasks inherit or require one; settings (labels) editable; offline-consistent.

---

## Phase 2 — Time-tracking on any task (light)

**Goal:** Focus timer + manual entries work on _any_ task (Today/standalone, not just project tasks).

> Schema already supports this (`task_time_entries.task_id` → any task). This phase is mostly wiring + surfacing.

- **2.1** Confirm no schema change needed; if we want category analytics on entries, decide whether to **snapshot category on the entry** or always derive from the task (recommend derive).
- **2.2** Focus-mode timer writes entries for Today/standalone tasks (currently project-task-centric in UI).
- **2.3** Surface time-on-task in Today (not just Projects) — read path for EoD chart + future balance/scoping.
- **2.4** Confirm RLS/sync already cover it (they should).
- **2.5** Aggregations for the **end-of-week review** (plan §7.6): time-per-category and time-per-project roll-ups from `task_time_entries` joined to `tasks.category` / `tasks.project_id`. (The "% progress toward completion" metric is a Projects concern — define a project/phase completion calc in §9, fed by Top-3-weighted task counts.)

**Acceptance:** starting a focus block on any task logs a time entry; entries queryable per task and per category.

---

## Phase 3 — Task dependencies (project-scoped)

**Goal:** task A blocks task B within the same project.

**Schema**

- **3.1** `task_dependencies` table: `id, user_id, blocker_task_id, blocked_task_id, created_at`. Enforce same-project (FK + app check; DB check is awkward across rows).

**Behavior**

- **3.2 Cycle prevention** — enforce at insert in the app layer (DB can't easily detect cycles). Define the check.
- **3.3 Blocked-task behavior** _(product decision)_ — a blocked task is **hidden** from RDM/Today until unblocked, **or flagged + de-weighted** but still pickable? (Plan §14 leans flag + de-weight.)
- **3.4** Edge cases: self-dependency, duplicate edges, what happens on blocker completion/deletion.

**Integration**

- **3.5** UI surfacing (task detail "blocked by / blocks"; Miller/Gantt markers) — note here, spec in the Projects/Today UI pass.
- **3.6** RLS + sync for the new table.

**Acceptance:** create/remove dependencies; cycles rejected; blocked tasks behave per 3.3; deleting a blocker clears the edge.

---

## Phase 4 — Recurrence (rule + generated occurrences)

**Goal:** recurring tasks defined by a rule; occurrences generated for the visible window; per-date overrides.

**Representation**

- **4.1 Rule format** — adopt an **RRULE** string (rrule.js) vs a **structured** model (`frequency` + `interval` + `byday` + end). RRULE is flexible/standard; structured is simpler to reason about. Decide.
- **4.2 End model** — support `end_date` / `count` / `never`. Which for v1 (plan flags: maybe date + never first)?

**Schema**

- **4.3** `task_recurrence`: `id, user_id, task_id (template), start_date, rule/freq fields, end_*`.
- **4.4** `task_occurrence_overrides`: keyed by `(recurrence_id, occurrence_date)`, `status` (completed / skipped / rescheduled / edited), optional payload (new date, edited fields).

**Generation & mechanics**

- **4.5 Generation** — occurrences computed **on the fly** for a window. Where: a server query helper, and a client helper for offline. Define the shared util.
- **4.6 Completion mapping** — completing "today's" occurrence writes an override row (no new task row).
- **4.7 Edit-this vs edit-all-future** — "all future" = **split the rule at a date** (end old rule, create new). "This only" = an override row. Define the data ops.
- **4.8 tasks-row relationship** — confirm: one `tasks` row is the template; occurrences are **virtual** + override rows (no row-per-occurrence).
- **4.9 Rendering** — how a recurring task shows in Today/Week (which occurrence is "today's"); interaction with `scheduled_date` / `bucket_override`.

**Platform**

- **4.10** RLS on both new tables; SQLite mirror + offline occurrence generation; sync of rules + overrides.

**Acceptance:** define a recurrence; occurrences appear in Today/Week; complete/skip one; "edit all future" splits cleanly; offline-consistent.

---

## 5. Cross-phase concerns (apply to every phase)

- **Drizzle** — one table per file in `src/db/schema/`; `npm run db:generate` then **review the SQL** before commit; never edit a committed migration.
- **RLS** — every new table scoped to `auth.uid()`; SQL lives in `supabase/rls/` (per CLAUDE.md), not `supabase/migrations/`.
- **Sync/offline** — update the SQLite mirror + `packages/sync` for each new table/column; preserve dev/prod parity.
- **Types** — regenerate TS types after each migration.
- **Tests** — Vitest for non-trivial logic: inheritance, cycle-prevention, occurrence generation, edit-all-future split.
- **No public sign-up / auth config untouched** (CLAUDE.md guardrail) — irrelevant here but don't trip it.

---

## 6. Phase dependency map

- Phase 0 gates Phase 1.
- Phases 1, 2, 3, 4 are largely **independent** of each other and can ship in sequence (or 2 could even precede 1). Recommended order is by risk: **1 → 2 → 3 → 4**.
- Design Tokens (colors) is a **parallel** track — needed only when category _UI_ renders, not for any schema here.

---

## 7. Decision log

Filled as we resolve each phase.

| Phase | Decision                    | Choice                                                                                                                                                                                                                                                                                                              | Date   |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 0.1   | Category display labels     | Keep all five (Professional, Personal Projects, Relationships, Adulting, Body & Mind)                                                                                                                                                                                                                               | Jun 16 |
| 0.2   | Enum value for Body & Mind  | Migrate `health_wellness` → `body_mind` (`ALTER TYPE … RENAME VALUE`; updates project rows)                                                                                                                                                                                                                         | Jun 16 |
| 0.3   | Loose-task backfill         | AI categorization pass, user reviews                                                                                                                                                                                                                                                                                | Jun 16 |
| 0.4   | Balance weighting           | Top-3 weighted (large vs small)                                                                                                                                                                                                                                                                                     | Jun 16 |
| 1.1   | Migration sequence          | Add `tasks.category` nullable → AI backfill → set NOT NULL                                                                                                                                                                                                                                                          | Jun 16 |
| 1.2   | Category settings store     | Dedicated `category_settings` table (label, color, sort, weekly targets / §7.6 review prefs)                                                                                                                                                                                                                        | Jun 16 |
| 1.3   | Inheritance enforcement     | App layer / shared TS helper (used by both server + offline sync)                                                                                                                                                                                                                                                   | Jun 16 |
| 1.4   | Loose-task capture default  | Default to last-used category, editable (never blocks capture)                                                                                                                                                                                                                                                      | Jun 16 |
| 1.5   | Category entry              | Semicolon property mode — `title; …; <category>` recognized as a category-name segment with autocomplete (5 names); property bar gains a `category` slot; renders as chip, stripped from title; task row/detail chip for later edits. (No `@` token.)                                                               | Jun 16 |
| 1.4a  | Loose-task resolver model   | **Model C — AI-forward.** Shared `resolveTaskCategory` ladder: explicit → project → **AI (if confident)** → last-used → Uncategorized. Same `inferCategoryFromTitle` powers live capture + 0.3 backfill (backfill adds review only)                                                                                 | Jun 16 |
| 1.4b  | Composer category indicator | **No chips.** Color **accent bar** (left edge, category color from `category_settings`) + faint trailing category name; `;` opens fuzzy autocomplete of the 5 names, Tab/Enter accepts as explicit override                                                                                                         | Jun 16 |
| 1.4c  | AI vs last-used             | **AI wins only above a confidence `THRESHOLD`**, else last-used. `inferCategoryFromTitle` returns category + confidence score; threshold tunable. No silent low-confidence overrides                                                                                                                                | Jun 16 |
| 1.4d  | Deep-fallback visibility    | **Invisible plumbing.** Stored as `adulting` (NOT NULL) + `tasks.category_unresolved = true`; rendered as a **neutral "no category yet" marker** (never the word Adulting), excluded from balance math, cleaned up by a backfill pass + resolver later. Distinct from a user-picked Adulting (`unresolved = false`) | Jun 16 |
| 1.4e  | Offline inference           | **Queue for sync.** Offline skips the AI layer, uses last-used (or the unresolved marker), never blocks capture; AI re-resolves `category_unresolved` rows on reconnect. **No local/second categorizer**                                                                                                            | Jun 16 |
| 2     | _pending_                   |                                                                                                                                                                                                                                                                                                                     |        |
| 2     | Time-tracking               | No schema change (entries already ref any task); Focus timer logs on any task; category **derived** from task (not snapshotted); weekly-review roll-ups by category/project                                                                                                                                         | Jun 16 |
| 3.a   | Dependency model            | **Blocked-by-one / blocks-many** → blocker stored as a `blocked_by_task_id` FK column on `tasks` (not a join table); within a project only                                                                                                                                                                          | Jun 16 |
| 3.b   | Cycles                      | **Prevented** — reject any link that loops the blocked-by chain                                                                                                                                                                                                                                                     | Jun 16 |
| 3.c   | Blocked-task UX             | **Visible but distinct** (treatment C: dashed border + striped category bar + lock + "waiting on X"); **RDM skips** blocked tasks                                                                                                                                                                                   | Jun 16 |
| 3.d   | Blocker weight              | **Scales** with the number of incomplete tasks it unblocks                                                                                                                                                                                                                                                          | Jun 16 |
| 3.e   | Edge rules                  | 2nd blocker **rejected** (clear first); self-link rejected; deleting a blocker **frees** the blocked task (`on delete set null`)                                                                                                                                                                                    | Jun 16 |
| 3.f   | Create/remove UI            | **Both** task detail + Miller/Gantt linking                                                                                                                                                                                                                                                                         | Jun 16 |
| 4.2   | Recurrence end model        | All three: on date (UNTIL) / after N (COUNT) / never                                                                                                                                                                                                                                                                | Jun 16 |
| 4.1   | Recurrence rule format      | RRULE (iCalendar) via rrule.js; friendly "Repeat" picker UI serializes to it                                                                                                                                                                                                                                        | Jun 16 |
