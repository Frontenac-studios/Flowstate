# Kash 3.0 — Phase 1 Build Spec: Category on Tasks

> The next build. Implements the **category** dimension end-to-end, per the locked decisions in `kash-3.0-data-spine.md` (§Phase 0–1). Broken into focused sub-phases 1A–1G, each independently reviewable and ordered by dependency.
> Decisions this implements: dedicated `category_settings` table · enum `health_wellness`→`body_mind` · strict MECE, one per task · inherit-from-project (shared TS helper) · loose tasks default to last-used · semicolon-property capture + autocomplete · Top-3-weighted balance (read side, later).

---

## Conventions (from CLAUDE.md — apply to every sub-phase)

- Drizzle: **one table per file** in `src/db/schema/`; `npm run db:generate`, then **review the generated SQL** before commit; never edit a committed migration.
- RLS on every new table, scoped to `auth.uid()`; SQL lives in `supabase/rls/` (not `supabase/migrations/`).
- Zod-validate all external input; every tRPC procedure has an input schema; infer TS types from Zod.
- Server-only modules guarded with `import "server-only"`; pure utils in `src/lib/` (no framework deps).
- Sync/offline parity: mirror schema + logic into `packages/db-local` + `packages/sync`.
- Tests in Vitest alongside the code; typecheck + lint must pass (pre-commit, no `--no-verify`).
- Conventional Commits; one logical change per PR.

---

## Sub-phase 1A — Schema + enum migration

**Goal:** the column and settings table exist; enum renamed.

- **Enum rename:** `ALTER TYPE project_category RENAME VALUE 'health_wellness' TO 'body_mind';` (no row rewrite; updates existing `projects` rows). Update `src/db/schema/projects.ts` enum definition.
- **`tasks.category`:** add `category project_category` to `src/db/schema/tasks.ts` — **nullable for now** (set NOT NULL in 1B after backfill).
- **`category_settings` table** — new file `src/db/schema/category-settings.ts`:
  - `id uuid pk`, `user_id uuid`, `category project_category`, `label text` (override, nullable → fall back to default), `color text` (nullable → token default), `sort_order int`, timestamps.
  - Unique index on `(user_id, category)`.
- **RLS:** `supabase/rls/` policy for `category_settings` → `user_id = auth.uid()` (all ops). `tasks` already RLS'd; the new column inherits.
- **Migrate:** `npm run db:generate` → review SQL → commit.

**Acceptance:** migration applies cleanly; `tasks.category` exists (nullable); `category_settings` exists with RLS; existing project rows now read `body_mind`.

---

## Sub-phase 1B — Backfill + NOT NULL

**Goal:** every existing task has a category; column locked to NOT NULL.

- **Seed `category_settings`:** one row per category per user (5 rows), with default labels and placeholder colors (real colors land in the Design Tokens phase; overridable now).
- **Project tasks:** `UPDATE tasks SET category = (project's category) WHERE project_id IS NOT NULL`.
- **Loose tasks (AI pass):** script `scripts/backfill-loose-task-categories.cjs` — reads each project-less task's title, calls the AI to assign a best-guess category, writes results to a review file; after user review, apply. (Decision 0.3.)
- **Lock:** once backfilled + verified, second migration sets `tasks.category` **NOT NULL**.

**Acceptance:** zero NULL categories; `category_settings` seeded; column is NOT NULL; spot-check AI assignments look sane.

---

## Sub-phase 1C — Inheritance helper (shared TS)

**Goal:** one rule deciding a task's category, used by every write path (server + offline).

- New pure util `src/lib/tasks/resolve-task-category.ts`:
  - `resolveTaskCategory({ explicit, project, lastUsed }) → category`
  - Precedence: **explicit → project.category (if in a project) → lastUsed → app default**.
- Used by the server tRPC create path (1E) **and** the offline-sync write path (1F) — identical behavior online/offline.
- **Tests:** `resolve-task-category.test.ts` covering each precedence branch.

**Acceptance:** helper is pure, framework-free, fully unit-tested; both write paths import it.

---

## Sub-phase 1D — Composer: category as semicolon property + autocomplete

**Goal:** capture a category inline via the existing `title; …` model with autocomplete.

- **Parser** (`src/lib/parser/parse-quick-input.ts`): recognize a **category-name segment** in semicolon mode → emit `category`; strip from saved title. Reuse the fuzzy-match approach from `fuzzy-project.ts` for name matching.
- **Composer assist** (`src/lib/parser/composer-assist.ts`): add `category` to the property bar slots (`title · due · #project · priority · category`); ghost-text + autocomplete of the 5 category labels (from `category_settings`); Tab accepts.
- **UI:** `ComposerPropertyBar.tsx` (new category slot), `ParsePreviewChips.tsx` (render category as a colored chip), `QuickInput.tsx` (wire autocomplete dropdown).
- **Fallback:** no category segment → `lastUsed` (via 1C) on submit.
- **⚠ Overlaps the `#project`-token retirement** (plan §14 cleanup): the same files change. Decide whether to bundle the `#project`→semicolon migration into this sub-phase (recommended — one composer refactor) or do it as a fast-follow.
- **Tests:** extend `parse-quick-input.test.ts`, `composer-assist.test.ts` for category segments + autocomplete.

**Acceptance:** typing `Call mom; tomorrow; relationships` files the task under Relationships with title "Call mom"; autocomplete suggests categories; preview shows the chip.

---

## Sub-phase 1E — tRPC + task UI

**Goal:** category flows through the API and is visible/editable on tasks.

- **tRPC** (`src/trpc/routers/tasks.ts`): add `category` to `create`/`update` Zod input; `create` calls `resolveTaskCategory` (1C). New small `category-settings` router: `get` + `update` (label/color/sort).
- **Task UI:** `TaskRow.tsx` — category **left-border color** + a clickable category **chip** (menu to change). `projects/TaskDetail.tsx` — category field. Colors read from `category_settings` (placeholder until tokens).
- **Settings:** `settings/SettingsForm.tsx` — a `category_settings` editor (rename label, recolor, reorder).

**Acceptance:** create/edit a task's category via UI; row shows category color + chip; settings rename/recolor persists and reflects everywhere.

---

## Sub-phase 1F — Sync / offline parity

**Goal:** category works identically offline (Tauri SQLite) and syncs.

- `packages/db-local`: add `category` to the SQLite `tasks` mirror; add the `category_settings` table.
- `packages/sync`: include `category` + `category_settings` in the sync set; offline create path uses `resolveTaskCategory` (1C).
- Verify dev/prod parity (per the existing desktop sync work).

**Acceptance:** create a task with a category offline → it syncs with the right category; settings sync both directions.

---

## Sub-phase 1G — Verification

**Goal:** prove it before moving on.

- **Unit (Vitest):** inheritance helper (1C), parser category segment + autocomplete (1D), backfill logic (1B).
- **Manual QA:** semicolon capture; project inheritance + override; chip edit; settings rename/recolor; offline create→sync; NULL check.
- **Gates:** `npm run typecheck`, `npm run lint`, RLS audit (`docs/rls-audit.md`) for `category_settings`.
- **Optional:** a subagent review of the migration + RLS before merge.

**Acceptance:** all tests green; typecheck/lint pass; RLS verified; no NULL categories; offline parity confirmed.

---

## Build order & dependencies

`1A → 1B → 1C → (1D ∥ 1E) → 1F → 1G`

- 1A/1B are the data floor. 1C is a small pure helper that 1D/1E depend on.
- 1D (composer) and 1E (API/UI) can proceed in parallel once 1C exists.
- 1F threads it through offline; 1G verifies.
- **Design Tokens runs in parallel** — only the category _colors_ depend on it; everything here uses placeholder colors until then.

## What this unblocks

Once Phase 1 ships, every task carries a category → Today's balance bar, Week color, the §7.6 weekly review (with Phase 2 time-tracking), Planning balance-pass, and AI rebalancing all become buildable. Phases 2 (time-tracking), 3 (dependencies), 4 (recurrence) follow per `kash-3.0-data-spine.md`.
