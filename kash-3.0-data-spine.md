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

- **Model = C (AI-forward).** AI inference is consulted _before_ last-used on the live capture path, not just as an opt-in suggestion. `inferCategoryFromTitle` returns a **category + confidence score** (see "AI inference provider" below); a tunable confidence gate decides whether it outranks habit (1.4c).
- **Composer indicator (1.4b)** — **no chips.** The composer input renders a **color accent bar** (left edge in the resolved category's color, from `category_settings`) with the category **name as a faint trailing label**. Typing `;` opens a **fuzzy autocomplete** of the five category names; **Tab/Enter accepts** and becomes an explicit assignment (layer 1), overriding the AI guess. Same color language carries to the task row + detail.
- **Disagreement (1.4c)** — when AI and last-used differ, **AI wins only when confident** (floor + margin, see AI provider below); otherwise last-used. No silent low-confidence overrides.
- **`lastUsed` update rule** — set `last_used_category` to the **resolved** category on successful create whenever a real layer (explicit / project / AI / lastUsed) decided it, so habit stays true even when AI picked the first one. **Skip the update when the unresolved fallback fired** (1.4d) — the `adulting` placeholder is plumbing, not a choice, and must not become the next default.
- **Deep fallback (1.4d — invisible plumbing)** — layer 5 only fires when **inference isn't confident** (floor+margin fail) **and** no project **and** no last-used. Stored as `adulting` for NOT NULL but flagged `category_unresolved = true`, rendered as a **neutral "no category yet" marker** (the accent bar shows no category color/name), kept out of balance math, and swept by the **backfill** later. The word "Adulting" is **never** shown for these.
- **Offline (1.4e — superseded by local embeddings)** — capture never blocks, and offline now **categorizes live**: the local embedding model (AI provider, location = hybrid) runs layer 3 on-device, so there's **no offline-skips-AI and no reconnect re-resolve**. The mutation still queues for sync, but the category is already resolved locally. **One runtime categorizer everywhere** (local embeddings) — web/desktop/offline never disagree. _This replaces the earlier "queue / skip AI offline" plan._
- `adulting` is **plumbing, never presented as "we chose Adulting for you."** A genuine user-picked Adulting task has `category_unresolved = false`; the fallback has it `true` and renders as the neutral marker.

**AI inference provider (decided — C1–C4)**

The `inferCategoryFromTitle` seam is an **embeddings nearest-prototype** classifier, not an LLM:

- **C1 — Trigger: live, per keystroke** (debounced ~150ms). The accent bar reflects the AI guess continuously as you type. _Open optimization (user ask): tune the model/runtime so per-keystroke stays free — embeddings + caching by normalized title makes this viable._
- **C2 — Model: embeddings match.** Embed the title; pick the nearest of 5 **category prototype vectors** (each category seeded from a few example titles, embedded once). Chosen over an LLM because it's cheap/cacheable, runs locally, and **cosine similarity is a real confidence** for 1.4c.
- **C3 — Confidence: floor + margin.** AI outranks last-used only when the top category clears an **absolute floor** (e.g. ≥ 0.70) **and** beats the runner-up by a **margin** (e.g. ≥ 0.10). Two tunable knobs; ambiguous titles (two areas close) defer to habit. This is the concrete `THRESHOLD` of 1.4c.
- **C4 — Location: hybrid.** A small **local** embedding model (~few MB, ONNX/transformers.js) powers the **live + offline** path (free, keystroke-safe, single runtime categorizer → resolves 1.4e). A **sharper hosted model** (hosted embeddings or Haiku) powers only the **one-time bulk backfill** (0.3), where accuracy matters and per-call cost is irrelevant.
- **Result:** `inferCategoryFromTitle(title)` → `{ category, confidence }` where confidence encodes floor+margin; the same function (local embeddings) is injected on client, server, and offline; the backfill swaps in the sharper model behind the same interface.

**Platform**

- **1.8 RLS** — `category_settings` (if new table) → `auth.uid()` policy in `supabase/rls/`.
- **1.9 Sync/offline** — add `category` to the SQLite `tasks` mirror + sync package; mirror `category_settings`.

**Acceptance:** every task has a category; new tasks inherit or require one; settings (labels) editable; offline-consistent.

**Phase 1 follow-up decisions (Q1–Q6, decided):**

- **Q1 Undo-delete** — restore **preserves the snapshot's exact category + `category_unresolved`** (undo = "put it back exactly"). Add `category` to the delete snapshot + `createFromSnapshot` input.
- **Q2 Backfill review (0.3)** — **confidence-gated**: auto-apply guesses that pass floor+margin (1.AIc); route only shaky/ambiguous ones to a short review list (or leave as the unresolved marker). Reuses confidence + the neutral marker.
- **Q3 Settings editor scope (1E)** — **labels + sort order only** in Phase 1. Colors stay with Design Tokens; weekly targets stay schema-only until Week/review. No half-built surfaces.
- **Q5 Category edit affordance** — **task detail panel only**. Category is a field in the detail view; rows stay clean (no always-on chip). Single edit surface.
- **Q6 `#project` token** — **retired**. Project is set only via the `;` property segment, like category — one input language. Bundle the parser/composer change with 1D.

---

## Task views, filters & visual language (cross-cutting)

> Driven by the Q4 expansion. Applies to every task-list surface (Today, This Week, Inbox, Projects, Focus). Decisions VF1–VF4 below; per-page defaults VF5.

**Core model — calm by default, reveal on demand.** Task rows are **clean** (checkbox + title) by default. Each task **property** (category, priority, project, due, …) has its **own toggle — one per property**. Flipping a property's toggle turns on a **lens** for that dimension.

- **VF1 — Default + indicators.** No property chrome shown until a lens is on. Each property has a fixed **zone** so revealed indicators never crowd: **category = left color stripe · priority = pips · project = pill · due = date**. Priority and project read as distinct channels from category (the user's explicit ask).
- **VF2 — A lens = reveal + filter + group.** Toggling a property reveals its indicator, exposes **value filters** (narrow to values), and lets you **group/sort** the list by it. A lens is a mode, not just "show".
- **VF3 — One group lens + ≤2 lenses total.** Exactly **one** property colors/groups at a time (group-by is naturally singular); value-filters stack on top, but **at most 2 lenses are active at once** (hard cap — toggling a 3rd drops the oldest). Toggle via **keystroke + UI**. _(Refined Jun 22: the cap was added; the earlier "unlimited stackable filters" wording is superseded.)_
- **VF4 — Color model.** **Category** = the 5 life-area colors (hexes from Design Tokens) shown as the **left stripe — category's exclusive channel** (project never colors the stripe). **Projects** = a trailing **phase-colored dot + "Project · Phase" name** (no `#` pill — the `#project` token is retired, Q6), **auto-ramp by phase order** (sequential ramp; phase = identity, not status); projects get no category lens (one project = one category). **Priority** = a low→high urgency ramp on the pips (muted → amber → red dots, none/low/med/high). **Due** = relative label (`today` / `in 3d` / `overdue 2d`) with danger/warning/muted emphasis, suppressed on day-grouped surfaces.
- **VF5 — Per-page defaults** (all clean; lenses opt-in):
  - **Today** — clean, no lens.
  - **This Week** — day groups (existing), clean tasks; Category lens reveals weekly balance.
  - **Inbox** — clean flat list; Category/Project lens to triage.
  - **Projects** — **Miller columns as today, no lens on**; phase coloring + Priority lens available on demand.

> Build note: this is its own UI workstream layered on the data spine, not a schema change. The category data + stripe (Step 4c) are the first slice; the lens/filter framework + per-page wiring + project phase-ramp are net-new UI.

**Sub-unit division (linear; each independently shippable):**

- **VF-1 — Clean rows + zoned indicators + colors** (VF1 + VF4 colors). ✅ **built (Jun 22).** `TaskRow` reveal prop (default clean); category-only left stripe; priority dots (none/low/med/high, muted→amber→red); project = trailing phase-dot + name (`projectPhaseColor` seam — real phase ramp deferred to VF-4); relative due (`formatRelativeDue`, suppressed on day-grouped); task-detail control relabeled None/Low/Med/High; priority is a `;` property word (low/med/high, `!`/`!!`/`!!!` kept only as a `;` alias — inline bang retired, one input language). Dev verification via `?vfReveal=…` until VF-2 wires real state.
- **VF-2 — Lens state engine + controls** (VF2/VF3). ✅ **built (Jun 22).** Pure, unit-tested state engine (`lens.ts`: `LensState`, `toggleLens` with the 2-lens hard cap → 3rd drops the oldest, `revealFlagsFromLens`, serialize/parse); per-surface `localStorage` persistence (`lens-storage.ts`, keys `kash-lens:today` / `kash-lens:this-week`) — lens is opt-in client view state, kept out of `packages/sync`; a scoped `LensProvider` context owns state + the **c/p/r/d** keystrokes (c=Category, p=Project, r=pRiority, d=Due, guarded by `is-editable-target`) and feeds `TaskRow` via `useReveal()` (replaces the `?vfReveal` dev toggle, now removed); `LensControlBar` = 4 multi-toggle chips on Today (day+week) + This Week. **Cap semantics (Q2):** the cap counts active _property_ lenses (≤2 revealed); value-filters and the single group/color designation are **VF-3** (slot into `LensState` additively). Wiring uses context rather than prop-threading — same result, smaller blast radius. Projects stays Miller (uses `MillerTaskRow`, no lens). Ships against the `projectPhaseColor` seam (real ramp = VF-4).
- **VF-3 — Filter + group application** (VF2/VF3). ✅ **built (Jun 22).** `LensState` extended additively with `group` (the one group/color lens, ∈ active) + per-lens `filters`; pure reducers `setGroupLens`/`toggleFilterValue` (+ `toggleLens` clears a deactivated lens's group/filter). Pure `lens-apply.ts` (`taskLensValue` · `filterTasks` AND-across-lenses/OR-within · `groupTasks` canonical order + **sort priority-desc then title** · `applyLens`), unit-tested. Control bar gains a single-select **Group-by** control + stackable **value-filter chips** (category/priority/due; project filters deferred). Wired into **This Week, nested**: day-groups stay the outer level, lens sub-groups (`LensGroupSection`) nest within each day — gated to the `this-week` scope so Today stays VF-2 reveal-only until VF-4. Projects/Miller untouched. Default sort within a group = priority desc, then title.
- **VF-4 — Per-page defaults + rollout** (VF5 + project auto-ramp-by-phase color): Today clean · This Week day-groups + category-lens balance · Inbox clean flat + triage lenses · Projects Miller-as-is + phase-ramp + priority lens on demand. _Sliced; decisions Jun 22: plumb phase data everywhere · Inbox = minimal bespoke rows · Today stays reveal-only._
  - **VF-4a — Real phase-ramp color.** ✅ **built (Jun 22).** `phaseRampColor(projectId, phaseOrdinal)` replaces the hash seam — stable per-project hue + lightness ramp by phase `sortOrder` (earlier phases lighter), clamped, muted fallback; unit-tested. Phase data plumbed into `tasks.listIncomplete` (leftJoin `phases` → `phaseName`, `phaseSortOrder`) and onto `PlanTaskRow` (both `toRow` mappers; This Week's mapper also now forwards category/scheduledDate, which it had been dropping). `TaskRow` project indicator → ramp dot + **"Project · Phase"** name. Miller `MillerPhaseRow` gets a ramp dot keyed on `phase.sortOrder`. Verified: identical ramp colors across This Week project lens + Miller.
  - **VF-4b — Inbox minimal lenses.** ✅ **built (Jun 22).** `listTriageCandidates` plumbed (leftJoin `phases`; + category/phase columns). `LensProvider` generalized with `properties` (limit exposed lenses) + `bindKeys` (the inbox strip shares a route with the day/week canvas, so it's **click-only** — no c/p/r/d collision with the page lens). `ContextualInbox` wraps a `scope="inbox"` provider (`properties=[category, project]`) with a `LensControlBar`; `InboxPanel` bespoke rows reveal a category stripe + project phase-ramp dot + "Project · Phase" under those lenses (default clean, replacing the always-on `#slug`). 1–4 triage keys + arrows preserved.
  - **VF-4c — Projects priority lens.** ✅ **built (Jun 22).** A Miller-only on-demand **filter** (priority pips are always shown there, so reveal/group don't apply): a header chip control (High/Med/Low/None) narrows visible tasks to the selected levels; phases stay as the column structure; clean by default; persists to `localStorage` (`kash-miller-priority`). Pure `filterTasksByPriority` + tests. **VF-4 complete.**

---

## Phase 2 — Time-tracking on any task (light)

**Goal:** Focus timer + manual entries work on _any_ task (Today/standalone, not just project tasks).

> Schema already supports this (`task_time_entries.task_id` → any task). This phase is mostly wiring + surfacing.

- **2.1** Confirm no schema change needed; if we want category analytics on entries, decide whether to **snapshot category on the entry** or always derive from the task (recommend derive). → **Decided: derive** (no new column). Lands with the 2.5 roll-ups (PR2).
- **2.2** Focus-mode timer writes entries for Today/standalone tasks (currently project-task-centric in UI). → ✅ **PR1.** Confirmed the write path was already task-agnostic (`timeEntries.start`/`end` take any `taskId`, no project gate); browser-verified a standalone Today task auto-logs a completed entry.
- **2.2a** Manual add/edit/delete entries (decided in-scope; placement **P1 — shared `<TaskTimeEntries>`** in Projects task detail + the Focus surface). → ✅ **PR1.** `timeEntries.create`/`update`/`delete` (reason `"manual"`, ≤24h window guard, RLS belt-and-braces); pure parse/format helpers in `src/lib/time/duration.ts` (Vitest). Browser-verified create/edit/delete in both hosts.
- **2.3** Surface time-on-task in Today (not just Projects) — read path for EoD chart + future balance/scoping. → **Decided: A3 — EoD focus chart only** (no per-row Today changes); the existing chart already aggregates per-task and now picks up manual entries via `started_at`.
- **2.4** Confirm RLS/sync already cover it (they should). → ✅ Confirmed: `task_time_entries` is in `packages/sync` `SYNC_TABLES` + the SQLite mirror (no column drift); RLS scoped to `auth.uid()` for select/insert/update/delete. Derive (2.1) means **no sync changes needed**.
- **2.5** Aggregations for the **end-of-week review** (plan §7.6): time-per-category and time-per-project roll-ups from `task_time_entries` joined to `tasks.category` / `tasks.project_id`. → **PR2** (decided **B2** — data layer + a thin read-only weekly summary card). (The "% progress toward completion" metric is a Projects concern — define a project/phase completion calc in §9, fed by Top-3-weighted task counts.)

**Acceptance:** starting a focus block on any task logs a time entry ✅; entries queryable per task (✅ PR1) and per category (PR2 roll-ups).

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

**Resolved (Jun 22) — full sub-phase spec in `kash-3.0-data-spine-build-spec.md` §Phase 4 (4A–4G):**

- **4.1 / 4.2 (Jun 16):** RRULE via rrule.js; ends = date / count / never.
- **4.8 Occurrence model: VIRTUAL** — one template task row + occurrences computed on read + a `task_occurrence_overrides` table for exceptions (no row-per-occurrence).
- **4.6 / 4.7 Single-occurrence: FULL control** — complete / skip / reschedule / edit any one occurrence as an override; the series continues. "Edit all future" = update the rule in place (forward); past overrides stay valid.
- **Entry point:** a task-detail **Repeat picker** + a **composer shorthand** ("water plants; every tue" → rule).
- **4.5 Generation:** one shared pure util (`src/lib/recurrence/expand.ts`) on server + client (offline).

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
| 1.4e  | Offline inference           | **Superseded by 1.AId.** Local embeddings categorize offline live — no queue/skip, no reconnect re-resolve; mutation still syncs, category resolved locally                                                                                                                                                         | Jun 16 |
| 1.AIa | AI trigger                  | **Live, per keystroke** (debounced ~150ms); accent bar reflects the guess as you type. Open: optimize model/runtime to keep per-keystroke free                                                                                                                                                                      | Jun 16 |
| 1.AIb | AI model                    | **Embeddings nearest-prototype** (not an LLM): embed title → nearest of 5 category prototype vectors. Cheap, cacheable, local-capable; cosine similarity = real confidence                                                                                                                                          | Jun 16 |
| 1.AIc | Confidence rule             | **Floor + margin** — top must clear an absolute floor (≈0.70) AND beat the runner-up by a margin (≈0.10), else defer to last-used. The concrete 1.4c threshold                                                                                                                                                      | Jun 16 |
| 1.AId | Embeddings location         | **Hybrid** — small local model for live + offline (free, single runtime categorizer, resolves 1.4e); sharper hosted model for the one-time backfill (0.3) only                                                                                                                                                      | Jun 16 |
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
| Q1    | Undo-delete category        | **Preserve the snapshot** — restore the exact `category` + `category_unresolved`; add category to delete snapshot + `createFromSnapshot`                                                                                                                                                                            | Jun 17 |
| Q2    | Backfill review (0.3)       | **Confidence-gated** — auto-apply floor+margin passes (1.AIc); only shaky/ambiguous go to a short review list or stay unresolved                                                                                                                                                                                    | Jun 17 |
| Q3    | Settings editor scope       | **Labels + sort order only** in Phase 1; colors via Design Tokens, weekly targets schema-only until Week/review                                                                                                                                                                                                     | Jun 17 |
| Q5    | Category edit affordance    | **Task detail panel only** — category is a detail-view field; rows stay clean (no always-on chip)                                                                                                                                                                                                                   | Jun 17 |
| Q6    | `#project` token            | **Retired** — project set only via the `;` property segment (one input language); bundle parser/composer change with 1D                                                                                                                                                                                             | Jun 17 |
| VF1   | Row default + indicators    | **Clean by default**; one toggle per property; zoned indicators (category = left stripe · priority = pips · project = pill · due = date)                                                                                                                                                                            | Jun 17 |
| VF2   | Lens behavior               | A property toggle = **reveal + filter + group** (a lens / mode, not just "show")                                                                                                                                                                                                                                    | Jun 17 |
| VF3   | Lens multiplicity           | **One group lens at a time + ≤2 active lenses total** (hard cap — toggling a 3rd drops the oldest); toggle via keystroke + UI. _(Jun 22: cap added; supersedes "unlimited stackable")_                                                                                                                              | Jun 17 |
| VF4   | Color model                 | Category = 5 life-area colors (Design Tokens) on the **left stripe (category's exclusive channel)**; Projects = trailing **phase-dot + "Project · Phase" name, no `#` pill** (auto-ramp by phase order, no category lens, never the stripe); priority = urgency dots; due = relative label + danger/warning/muted   | Jun 17 |
| VF5   | Per-page defaults           | All clean / lenses opt-in: Today clean · This Week day-groups + clean · Inbox clean flat · Projects **Miller as-is, no lens**                                                                                                                                                                                       | Jun 17 |
| VF1.a | Priority input syntax       | Priority is a **`;` property word** (none/low/med/high) with autocomplete; **`!`/`!!`/`!!!` survive only as a `;` alias** — the inline space-mode bang is retired (one input language, mirrors Q6 `#project`)                                                                                                       | Jun 22 |
