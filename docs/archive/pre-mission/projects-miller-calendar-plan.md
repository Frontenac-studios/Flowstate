# Project Planning: Miller Columns + Calendar Board

Implementation plan for the per-project planning workspace. The data + API layer
is **done and merged in this PR**; the UI (tasks 3–6) is **not yet built**.

## Locked decisions

Captured from product Q&A — these are the source of truth for the UI work.

| Area                     | Decision                                                                                                                                                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Nesting                  | **Arbitrary depth** sub-directories (phases) via `phases.parent_phase_id` self-reference.                                                                                                                                             |
| Categories               | 5 fixed categories (enum). Category is a **filterable badge**, not a Miller column.                                                                                                                                                   |
| Calendar unit            | **Phase date-range bars** (Gantt-style).                                                                                                                                                                                              |
| Leaf phase dates         | **Per-side manual or auto** on leaf phases: DB `start_date` / `end_date` override that side; unset sides derive from incomplete tasks' `scheduled_date` (ISO week Mon–Sun snap). Display-time merge only — auto dates are not stored. |
| Parent phase dates       | **Auto-derived** (min start / max end of descendants) — computed in app layer, not stored.                                                                                                                                            |
| Calendar scope           | **One project at a time.**                                                                                                                                                                                                            |
| Calendar scale           | **Adaptive** zoom to the project's full span.                                                                                                                                                                                         |
| Calendar editing         | **Leaf bars** drag-to-shift + resize-to-rechange-duration; **parent bars locked** (read-only summary).                                                                                                                                |
| Task ↔ plan              | **Same unified task** — a project task with a `scheduled_date` shows in Today/Week on `/plan`.                                                                                                                                        |
| Loose tasks              | A task may live **directly under a project** (`phase_id = null`) or inside any phase.                                                                                                                                                 |
| Phase completion         | **Crossing off completes everything inside** (descendant phases + tasks), but **prompt first** (client-side) if it contains incomplete tasks.                                                                                         |
| Inline `#project` create | **Blocked** — composer points to `/projects`; projects must be created there with a required category.                                                                                                                                |
| Project index            | **Flat list + category filter**, color badge per row.                                                                                                                                                                                 |
| Workspace layout         | \*\*Header `[Columns                                                                                                                                                                                                                  | Calendar]` toggle\*\* (reuse the Day/Week toggle pattern). |
| Add items                | **Inline "+ new" row per Miller column.**                                                                                                                                                                                             |
| Completed items          | **Dimmed + sunk to bottom** of their column.                                                                                                                                                                                          |

### Categories (enum value → label → color)

Defined in [`src/lib/projects/categories.ts`](../src/lib/projects/categories.ts).

| Enum value          | Label             | Color     |
| ------------------- | ----------------- | --------- |
| `professional`      | Professional      | `#ffb900` |
| `personal_projects` | Personal Projects | `#f78200` |
| `relationships`     | Relationships     | `#973999` |
| `health_wellness`   | Body & Mind       | `#5ebd3e` |
| `adulting`          | Adulting          | `#e23838` |

## Done (this PR)

- **Schema** (Postgres `src/db/schema/` + desktop SQLite mirror `packages/db-local/`):
  `projects.category` (NOT NULL enum) + `description`; new `phases` table; `tasks.phase_id` + `sort_order`.
- **Migration** `drizzle/0005_projects_phases.sql` — category added nullable → backfilled → set NOT NULL.
- **RLS** `supabase/rls/20260529120000_phases_rls.sql` (owner-scoped, validates project + parent ownership on insert).
- **Offline sync** — `phases` added to `SYNC_TABLES` + row mapper field mappings.
- **Routers**:
  - `projects` — `list` (with category/description), `getById`, `create` (category required), `update`, `delete`.
  - `phases` — `listByProject`, `create`, `update` (name/desc/dates), `setComplete` (cascade complete + uncomplete), `delete`.
  - `tasks` — added `phaseId` to `create`/`update`, plus `listByProject` and `moveToPhase`.
- **Composer** — inline project creation removed; unknown `#project` now directs to `/projects`.

## Remaining work

### 3. `/projects` index page

- Route: `src/app/projects/page.tsx` (Server Component shell + client list).
- Flat list of `projects.list`, each row: color badge (category), name, description preview, task/phase counts (optional).
- Category filter: segmented control over the 5 categories + "All".
- "New project" form (client): name, **required category picker** (color swatches), optional description. Calls `projects.create`. Slug auto-derived (`slugifyProjectName`); handle CONFLICT.
- Empty state.

### 4. `/projects/:id` workspace shell

- Replace the stub at `src/app/projects/[id]/page.tsx`.
- Load `projects.getById`; 404 handling.
- Header: project name + category badge + editable description; `[Columns | Calendar]` toggle (reuse the Day/Week toggle component pattern from `/plan`).
- Fetch `phases.listByProject` + `tasks.listByProject`; build the phase/task tree client-side.
- Shared selection state (selected phase path) driving both views.

### 5. Miller columns view

> **Source of truth for the columns UX:** [`kash-3.0-projects-miller.md`](../kash-3.0-projects-miller.md) (MC-1/MC-2, ID-1, ID-3, PROJ-A, PROJ-C), reconciled in `kash-3.1-consolidated-build-spec.md` D39. This section is aligned to it.

- Horizontally scrolling columns of **fixed, equal width** (256px; the strip scrolls, columns never stretch — Finder-style). Column 1 = top-level phases + loose tasks (`phase_id = null`). Selecting a **phase** opens the next column with its child phases + tasks (drill only). **Swipe → Edit** (or Shift+Enter / E) expands an inline phase-detail panel in place (progress / rename / dates; ID-3/PROJ-C). Selecting a **task** focuses the row; **Swipe → Edit** expands inline-editable detail — **no separate detail column** (ID-1). Empty viewport slots show solid-outline ghost columns. Depth is **unlimited** and click-driven (no auto-pad).
- Inline **"+ new"** row per column: type a name → create phase or task at that level (`phases.create` / `tasks.create` with `bucketOverride: "later"` so new project tasks stay out of Today).
- **Suggested date chip** on Miller task rows when `suggestedScheduledDate` is set and task is unscheduled — shared `SuggestedDateChip` + Accept (same contract as Week inbox). Shipped [#202](https://github.com/Frontenac-studios/Flowstate/pull/202).
- Completed items **dimmed + sunk to a per-column collapsible "Completed · n" group** (PROJ-A).
- Phase cross-off: confirm dialog **only if** the subtree has incomplete tasks (compute from loaded tree); then `phases.setComplete({ completed: true })`.
- Task complete/uncomplete via existing `tasks.complete` / `tasks.uncomplete`.
- Drag tasks between phases/root → `tasks.moveToPhase`.
- Keyboard nav (arrow keys between columns/items) — keyboard-first per app principles.

### 6. Calendar Gantt board

- One project; adaptive zoom to span (earliest start → latest effective end across all phases).
- **Leaf phases** (no child phases): effective bar from manual dates and/or week-snapped task schedules; draggable + resizable → `phases.update` (commits both sides as manual).
- **Parent phases**: locked summary bars spanning the min/max of descendant **effective** ranges (computed client-side); visually distinct (thinner/lighter).
- Phases without an effective range: not drawn (or shown in an "undated" tray when no manual dates and no scheduled tasks).
- Category color theming on bars.
- Zoom/scroll controls; today marker.

## Project setup backlog (Jul 2026 — shipped)

Setup wizard and template seeding now follow the same backlog contract as inline Miller create (`bucketOverride: "later"`, not Today).

| PR                                                              | What shipped                                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#200](https://github.com/Frontenac-studios/Flowstate/pull/200) | `resolveProjectBacklogCreateFields` helper; template apply uses backlog fields; `projects.commitSetup` (single transaction for phases/milestones/tasks + bulk import); bulk import accepts optional `suggestedScheduledDate`; phase `startDate` maps to task `suggestedScheduledDate` |
| [#201](https://github.com/Frontenac-studios/Flowstate/pull/201) | `ProjectSetupWizard` → `commitSetup`; template projects skip wizard auto-open; blank projects open at Phases (Basics captured in `NewProjectForm`); edit mode warns about duplicate tasks on Tasks step                                                                               |
| [#202](https://github.com/Frontenac-studios/Flowstate/pull/202) | `SuggestedDateChip` on Miller task rows; `tasks.listByProject` returns `suggestedScheduledDate`                                                                                                                                                                                       |

See also [`chat-first-task-creation-plan.md`](./chat-first-task-creation-plan.md) — inbox model row and "Shipped — Project setup backlog" section.

## Notes / gotchas

- Migration history: the repo applies via the **idempotent glob scripts** (`scripts/apply-drizzle-migrations.cjs` + `apply-supabase-migrations.cjs`), which skip already-existing objects. `0004_sync_updated_at.sql` is intentionally un-journaled. Keep new migrations numbered sequentially and review generated SQL for stray `updated_at` re-adds caused by snapshot drift.
- Desktop (SQLite) parity: any new table/column must be mirrored in `packages/db-local/src/schema/` **and** `packages/db-local/src/migrate.ts`, and added to `packages/sync/src/tables.ts` if it should sync.
- "Same unified task" means project tasks already flow through the existing `/plan` queries via `scheduled_date`; no separate planning store.
