# Kash 3.0 — Data Spine Build Spec (consolidated)

> **Single source of truth for building the data spine.** One doc, all phases — appended as we spec each. Decisions live in `kash-3.0-data-spine.md` (§7 decision log); this is the _implementation_ spec. Supersedes the standalone `kash-3.0-phase1-…` / `phase2-…` docs.

**Phase status**

| Phase | Scope                     | Spec                                               | Build                                                                                                                                    |
| ----- | ------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Decisions/confirmations   | ✅ logged                                          | n/a                                                                                                                                      |
| 1     | Category on tasks         | ✅ spec'd (1A–1G) · resolver reconciled to Model C | 🟡 spine built (schema, resolver, tRPC, composer accent, task-row stripe, sync); AI provider + backfill + enum-rename + NOT NULL pending |
| 2     | Time-tracking on any task | ✅ spec'd (2A–2E)                                  | ⬜                                                                                                                                       |
| 3     | Task dependencies         | ✅ spec'd (3A–3E)                                  | ⬜                                                                                                                                       |
| 4     | Recurrence                | ⬜ to spec                                         | ⬜                                                                                                                                       |

**Overall build order:** `1 → 2 → 3 → 4` (by risk). Phases 2 (after 2A) and 3 are largely independent of 1; Design Tokens runs in parallel (only category _colors_ depend on it).

---

## Conventions (CLAUDE.md — apply to every sub-phase)

- Drizzle: **one table per file** in `src/db/schema/`; `npm run db:generate`, then **review the SQL** before commit; never edit a committed migration.
- RLS on every new table → `auth.uid()`; SQL in `supabase/rls/` (not `supabase/migrations/`).
- Zod-validate all input; every tRPC procedure has an input schema; infer TS types from Zod.
- `import "server-only"` for server modules; pure utils in `src/lib/` (no framework deps).
- Sync/offline parity: mirror schema + logic into `packages/db-local` + `packages/sync`.
- Vitest alongside code; typecheck + lint gate (no `--no-verify`); Conventional Commits; one logical change per PR.

---

# Phase 1 — Category on tasks

Implements the MECE category dimension end-to-end. Decisions: dedicated `category_settings` table · enum `health_wellness`→`body_mind` · strict one-per-task · inherit-from-project via shared helper · **loose-task resolver = Model C (AI-forward)** · **composer indicator = color accent bar, no chips** · semicolon-property capture + autocomplete.

> **Reconciled Jun 16 (decisions 1.4a–e).** This section was written before the loose-task decision session; the resolver and composer specs below now match `data-spine.md §7` (Model C ladder, no chips, `category_unresolved` invisible-plumbing fallback, queue-for-sync offline). The earlier "default to last-used" / "preview chip" wording is superseded.

### 1A — Schema + enum migration

- **Enum rename:** `ALTER TYPE project_category RENAME VALUE 'health_wellness' TO 'body_mind';` (no row rewrite; updates `projects`). Update `src/db/schema/projects.ts`.
- **`tasks.category`:** add `category project_category` to `src/db/schema/tasks.ts`, **nullable for now**. Plus **`tasks.category_unresolved boolean NOT NULL default false`** (1.4d invisible-plumbing flag) and **`app_settings.last_used_category`** (habit layer).
- **`category_settings`** (new `src/db/schema/category-settings.ts`): `user_id, category, label?, color?, sort_order, weekly_target?`, timestamps; PK `(user_id, category)`.
- **RLS** for `category_settings` in `supabase/rls/`. `db:generate` → review → commit.
- **Accept:** migration clean; column exists (nullable); table + RLS exist; project rows read `body_mind`.

### 1B — Backfill + NOT NULL

- Seed 5 `category_settings` rows/user (default labels, placeholder colors). Until the settings editor (1E) ships, the accent bar + task-row stripe read `PROJECT_CATEGORY_META`, not the DB.
- Project tasks ← project's category (SQL update). Loose tasks ← AI pass (`scripts/backfill-loose-task-categories.cjs`, same `inferCategoryFromTitle` as runtime) → user review → apply. Rows the AI can't resolve stay `category_unresolved=true`.
- Then second migration sets `tasks.category` **NOT NULL** (the column is created nullable in 1A).
- **Accept:** zero NULLs; seeded; NOT NULL; AI assignments spot-checked.

### 1C — Loose-task resolver (shared TS) — **Model C, AI-forward**

- Pure ladder `src/lib/tasks/resolveTaskCategory.ts`: **explicit → project.category → AI(if confident) → lastUsed → Unresolved(`adulting` + `category_unresolved=true`)**. `inferCategoryFromTitle` injected (returns `{category, confidence}`); confidence `THRESHOLD` gates whether AI outranks habit (1.4c). Server wrapper `src/server/tasks/resolve-task-category.ts` gathers project/last-used; `infer-category.ts` is the AI seam (abstains until wired). `online:false` skips the AI layer (offline / client preview).
- **lastUsed update:** set `last_used_category` to the resolved category on create, **except the unresolved fallback** (don't poison habit).
- **Accept:** pure, framework-free, fully tested; server + offline + client-preview import it.

### 1D — Composer: category as semicolon property + autocomplete + **accent bar (no chips)**

- Parser (`parse-quick-input.ts`): recognize a category-name segment → emit `category`, matched before the project slug (`fuzzy-category.ts`, key/label normalized).
- Assist (`composer-assist.ts`): add `category` as the 5th property slot; autocomplete the 5 labels (ghost text); Tab accepts.
- UI **= color accent bar, NOT a chip** (1.4b): `ComposerCategoryAccent.tsx` renders the left accent bar + faint trailing label + neutral "no category yet" marker for unresolved; preview via `previewLineCategory` (resolver, `online:false`). `ComposerPropertyBar.tsx` shows the category hint chip; `QuickInput.tsx` passes `category` to `create`.
- **⚠ Bundle the `#project`-token retirement here** (plan §14 cleanup) — same files; one composer refactor. _(Not yet done.)_
- **Accept:** `Call mom; tomorrow; relationships` files under Relationships, title "Call mom"; autocomplete + accent bar work (no chip).

### 1E — tRPC + task UI

- `tasks.ts` router: `category` in `create`/`update` Zod; `create` calls the resolver; `update` with an explicit category clears `category_unresolved`. New `category-settings` router (`get`/`update`) — _not yet built_.
- `TaskRow.tsx`: category **left stripe** (color when resolved, neutral marker when unresolved) + clickable chip for edit. `TaskDetail.tsx`: category field. `SettingsForm.tsx`: settings editor. _(Stripe done on the plan day view; detail field + settings editor pending.)_
- **Accept:** create/edit category via UI; row shows the life-area stripe; settings persist everywhere.

### 1F — Sync / offline parity

- `packages/db-local`: `category` + `category_unresolved` on SQLite tasks, `last_used_category` on app_settings, new `category_settings` table (idempotent ADD COLUMN for existing DBs). `packages/sync`: register `category_settings`; row-mapper round-trips `category_unresolved` boolean↔0/1; offline create uses the resolver with `online:false`.
- **Reconnect re-resolve (1.4e):** on reconnect, re-run inference for `category_unresolved` rows. **Pending the AI provider** — until `inferCategoryFromTitle` is wired this is a no-op, so it's deliberately not built yet.
- **Accept:** offline create carries category and syncs; settings sync both ways; unresolved rows re-resolve once AI lands.

### 1G — Verification

- Vitest: helper (1C), parser (1D), backfill (1B). Manual QA: capture, inheritance+override, chip edit, settings, offline→sync, NULL check. Gates: typecheck, lint, RLS audit.

**Order:** `1A → 1B → 1C → (1D ∥ 1E) → 1F → 1G`.

---

# Phase 2 — Time-tracking on any task

Capture is **already built** (`timeEntries.start({taskId})` works on any task; `useFocusTimeEntry` logs in Focus). This phase = **aggregation + the weekly review**. No `task_time_entries` schema change. Decisions: derive category (not snapshot); weekly roll-ups by category + project.

### 2A — Verify & ungate capture

- Test a loose task can be tracked; remove any Projects-only UI gating so time shows on any task. Optional: manual entry; optional index `task_time_entries (user_id, started_at)`.
- **Accept:** any task trackable + shows total; loose-task test passes.

### 2B — Category-derived time roll-up _(needs Phase 1)_

- `src/lib/timeline/time-by-category.ts`: sum durations per category over a range (join entries→`tasks.category`); handle open entries. Server query respects RLS. Tested.
- **Accept:** "time per category, this week" correct; no uncategorized.

### 2C — Time-per-project + completion %

- Time grouped by `tasks.project_id` (null = none). **Completion %** (`src/lib/projects/completion.ts`): `completed weight ÷ total weight`, Top-3-weighted. Exposed via `projects`/`phases` router.
- **Accept:** project time totals correct; each project/phase reports 0–100% matching weights.

### 2D — End-of-week review surface (plan §7.6)

- tRPC `weeklyReview` aggregating 2B + 2C for the ISO week. Review surface: category time + project time + progress bars (reuse `FocusTimeChart` language). Reflection & care AI voice narrates.
- **Accept:** weekly review shows accurate time-per-category/project + % progress; AI summary reads naturally.

### 2E — Surface in Today + verification

- Show tracked time on tasks in Today (detail/Review). Vitest: 2B/2C + edge cases. Manual QA: reconcile review vs raw entries. Gates: typecheck, lint, RLS.

**Order:** `2A → 2B → 2C → 2D → 2E` (2A independent; 2B/2D need Phase 1).

---

# Phase 3 — Task dependencies (project-scoped)

**Your decisions (each cited below):** A blocks B · within a project only · **blocked-by-one / blocks-many** · cycles **prevented** · a blocked task stays **visible but visually distinct** (treatment C: dashed border + striped category bar + lock + "waiting on X") · the RDM **skips** blocked tasks · blocker pick-weight **scales with how many it unblocks** · adding a **2nd blocker is rejected** (clear the current one first) · deleting a blocker **frees** the blocked task · created/removed in **both** task detail and the Miller/Gantt board.

> **Two mechanical consequences flagged (say if you'd rather differ):** a task can't block itself (self-links rejected); completing a blocker frees the blocked task (the natural inverse of "blocked until unblocked").

### 3A — Schema

- Because dependencies are **blocked-by-one**, the blocker is a single nullable FK **column on the task**, not a join table: add `blocked_by_task_id uuid → tasks(id) on delete set null` to `src/db/schema/tasks.ts`. This **structurally enforces "at most one blocker"** (your 2nd-blocker-reject decision), makes "blocks many" the natural inverse (many tasks point at one blocker), and means **deleting a blocker frees the blocked task** automatically (`set null`) — matching your delete decision with no extra logic. _(Flag if you'd prefer a separate `task_dependencies` join table.)_
- Same-project is a **write-time app check** (blocker & blocked share a non-null `project_id`).
- Index on `blocked_by_task_id`. RLS already covers `tasks`. `db:generate` → review → commit.
- **Accept:** column + index exist; deleting a blocker nulls the reference (frees the task); cross-project links rejected.

### 3B — Mutations + guards

- `tasks` router gains `setBlocker({ taskId, blockerId })` + `clearBlocker({ taskId })`.
- **Guards (app layer):** same project; reject **self-link**; reject if the task **already has a blocker** (your "clear first" decision); reject any link that would **cycle**.
- Cycle check — pure helper `src/lib/tasks/dependency-cycle.ts`: walk the `blocked_by` chain from the proposed blocker; if it returns to this task, reject. (Blocked-by-one makes the graph simple chains/trees, so this is a chain walk, not full-graph DFS.)
- **Accept:** valid links set; self / second-blocker / cross-project / cycle all rejected with clear messages.

### 3C — Blocked state + RDM

- Pure helpers `src/lib/tasks/blocked-state.ts`: `isBlocked(task, tasksById)` (blocker exists and is incomplete); `unblockCount(taskId, tasks)` (how many incomplete tasks it blocks).
- **RDM skips blocked** (your decision): exclude `isBlocked` tasks from the RDM pools (`pick-task.ts`, `pick-work-on-task.ts`). They still render in lists.
- **Scaled blocker boost** (your decision): in `computeWorkOnWeight` (`pick-work-on-task.ts`), add a boost proportional to `unblockCount` so the biggest bottleneck surfaces first.
- Completing or deleting the blocker → `isBlocked` becomes false → task is actionable again (no extra write).
- **Tests:** `blocked-state.test.ts`; extend `pick-work-on-task.test.ts` (skip + scaled boost).
- **Accept:** blocked tasks never auto-picked; a blocker of 3 outranks a blocker of 1; finishing the blocker frees the task.

### 3D — UI: treatment C + create/remove on both surfaces

- **Treatment C** on blocked rows — `TaskRow.tsx` and project rows (`MillerTaskRow.tsx`): dashed border, striped category bar, lock icon, "waiting on <blocker>".
- **Create/remove — both** (your decision): a blocker picker in `TaskDetail.tsx` (autocomplete same-project tasks) + clear; and visual linking in `MillerColumnsView` / `GanttRow` / `GanttBar`.
- **Accept:** blocked rows show treatment C everywhere they appear; you can set/clear a blocker from task detail and from the project board.

### 3E — Sync + verification

- Sync the new `blocked_by_task_id` column (`packages/db-local`, `packages/sync`); the cycle + blocked helpers (pure) run offline too.
- **Tests:** cycle prevention, same-project guard, second-blocker reject, scaled boost, RDM skip, delete-frees.
- **Manual QA:** A blocks B → B shows treatment C, RDM skips B, A's odds rise per task it blocks; finish/delete A → B free; second blocker rejected; offline parity.
- **Gates:** typecheck, lint (RLS unchanged — lives on `tasks`).

**Order:** `3A → 3B → 3C → (3D ∥ 3E tests)`. Independent of Phases 1–2.

---

# Phase 4 — Recurrence

> ⬜ **To spec next.** Decisions locked (`kash-3.0-data-spine.md` §Phase 4): RRULE via rrule.js behind a friendly picker; ends on date / after N / never; `task_recurrence` + `task_occurrence_overrides` tables; on-the-fly occurrence generation; "edit this vs all future" = split rule at date; one task row as template, occurrences virtual. Sub-phases 4A–4x to be written when we reach it.
