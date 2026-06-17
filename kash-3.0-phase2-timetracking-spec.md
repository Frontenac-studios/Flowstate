# Kash 3.0 — Phase 2 Build Spec: Time-Tracking on Any Task

> Follows `kash-3.0-phase1-category-spec.md`. Implements the **time data spine** — but capture is largely already built, so this phase is mostly **aggregation + the end-of-week review**. Broken into sub-phases 2A–2E.
> Decisions implemented (`kash-3.0-data-spine.md` §Phase 2): no schema change to `task_time_entries` · Focus timer logs any task · category **derived** (not snapshotted) · weekly-review roll-ups by category + project. **Depends on Phase 1** (category) for the per-category views.

---

## Reality check — what already exists

- `src/trpc/routers/time-entries.ts` — `start({ taskId })` / `end({ entryId, reason })` already work on **any** task (only checks ownership + not-completed). No project gating.
- `src/hooks/useFocusTimeEntry.ts` — starts an entry whenever you enter Focus on a task (Today `/today/focus`), so standalone tasks already get tracked.
- Consumers already read entries: `eod/FocusTimeChart.tsx`, `eod/EodReviewModal.tsx`, `day-reviews` router, plus AI context (`fetch-plan-context.ts`) and nudges.

**Implication:** the _capture_ layer is done. Phase 2 is about **reading** that data per category/project and building the weekly review. No `task_time_entries` schema change.

---

## Conventions

Same as Phase 1 (CLAUDE.md): Zod inputs on every procedure; pure aggregation helpers in `src/lib/`; RLS already covers `task_time_entries`; Vitest for aggregation logic; typecheck + lint gates.

---

## Sub-phase 2A — Verify & ungate capture

**Goal:** confirm time-tracking is truly task-agnostic and exposed outside Projects.

- Confirm `timeEntries.start` works for loose/Today tasks (it does) — add a test asserting a project-less task can be tracked.
- Remove any **UI gating** that only surfaces "time on task" inside Projects; ensure a task's tracked time is viewable on any task (Today task detail/row).
- **Optional:** a manual start/stop or manual time-entry affordance for tasks tracked outside a Focus session (decide if in-scope for v1 or defer).
- **Optional perf:** add an index on `task_time_entries (user_id, started_at)` for range aggregation if queries are slow.

**Acceptance:** any task (project or loose) can be time-tracked and shows its total; a test covers a loose task.

---

## Sub-phase 2B — Category-derived time roll-up _(depends on Phase 1)_

**Goal:** total time per category over a date range, derived (not snapshotted).

- Pure helper `src/lib/timeline/time-by-category.ts`: given entries joined to `tasks.category`, sum durations (`endedAt − startedAt`) per category for a range. Skip open/`null`-end entries (or count to now — decide).
- Server query path joining `task_time_entries → tasks (category)`; respects RLS.
- **Tests:** durations, open entries, range boundaries, category grouping.

**Acceptance:** "time per category, this week" returns correct totals; uncategorized impossible (Phase 1 guarantees a category).

---

## Sub-phase 2C — Time-per-project + completion % metric

**Goal:** time per project, and a **% progress toward completion** metric (for the weekly review).

- Time-per-project: same roll-up grouped by `tasks.project_id` (null = "no project").
- **Completion % metric** — define in the Projects layer: per project/phase, `completed weight ÷ total weight`, where weight uses the **Top-3-weighted** model (decision 0.4) so it matches balance. Helper `src/lib/projects/completion.ts`.
- Expose via the `projects`/`phases` routers (or a small `progress` query).

**Acceptance:** time-per-project totals are correct; each project/phase reports a 0–100% completion that matches its task weights.

---

## Sub-phase 2D — End-of-week review surface (plan §7.6)

**Goal:** the weekly reflection you asked for — time per category, time per project, % progress.

- tRPC `weeklyReview` query aggregating 2B (category) + 2C (project + completion) for the ISO week.
- A weekly **Review** surface (in Week, per §7.6, or as a Review view): category time + project time + per-project progress bars. Reuse the `FocusTimeChart` visual language; category colors from `category_settings` (placeholder until tokens).
- **Reflection & care AI voice** (§11) narrates wins ("most time went to Body & Mind this week — nice").

**Acceptance:** opening the weekly review shows accurate time-per-category, time-per-project, and % progress for the week; AI summary reads naturally.

---

## Sub-phase 2E — Surface in Today + verification

**Goal:** time is visible where you work, and the phase is proven.

- Show tracked time on tasks in **Today** (task detail/Review view), not just Projects/EoD.
- **Unit (Vitest):** 2B category roll-up, 2C project roll-up + completion %, edge cases (open entries, week boundaries, no-project).
- **Manual QA:** track a loose task → appears in category total; weekly review numbers reconcile with raw entries; completion % matches a hand count.
- **Gates:** typecheck, lint; confirm RLS still scopes all new read paths.

**Acceptance:** all tests green; weekly review reconciles with raw data; time visible in Today.

---

## Build order & dependencies

`2A → 2B → 2C → 2D → 2E`

- **2A** is independent (ungate/verify) and could ship before Phase 1 finishes.
- **2B, 2D** depend on **Phase 1** (category) for per-category views.
- **2C**'s completion % depends only on the Top-3-weight model, not Phase 1.
- The **time-based balance upgrade** (replacing Top-3-weighted counts with real time, §2) becomes possible after 2B but is a _later_ feature, not part of Phase 2.

## What this unblocks

Honest time-per-category/project data + project completion %. Feeds the weekly review now, and the future time-based balance metric and AI project-scoping (Phase 9 templating) later. Next: **Phase 3 — dependencies** (`kash-3.0-data-spine.md`), then **Phase 4 — recurrence**.
