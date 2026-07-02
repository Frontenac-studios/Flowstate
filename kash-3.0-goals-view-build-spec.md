# Kash 3.0 — Goals Horizon: Progress & Steering Build Spec

> Makes goal progress something you can **see** (a journey timeline + attention heatmap) and something
> that **steers your day** (the next milestone surfaces one small step, gently, load-aware). Resolves
> **Gap A** (progress visualization — README goal #5) and **Gap B** (goal→daily-step steering — README
> goal #4) in `kash-3.0-goals-vs-build.md`.
>
> **Status:** shaped Jul 1 2026 (decision session). Ready to slice.

---

## 0. Purpose

Today goal progress is a bare text label (`"{n}% via milestones"`) buried in the bingo goal panel,
and milestone tasks get created into the **"later"** bucket — pushed _away_ from the day. So goals
are a place you visit, not a path you can see or a force that moves you. This spec gives goals a
visible journey and a gentle pull toward the next step — while honoring "guided, but in control" and
staying quiet when the user is slammed.

---

## 1. Decision log (locked Jul 1 2026)

| #   | Decision                    | Choice                                                                                                                                                                                                                                  |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Visual form                 | **Journey / timeline** as the spine (milestones as stops: behind you / here / ahead), with a **calendar heatmap** layer for attention rhythm.                                                                                           |
| G2  | Steering                    | **Next stop → next step.** The next unfinished milestone can surface **one small actionable step** into the day — user pulls it in, or Kash offers it in the morning hand-off. **No full auto-scheduling.**                             |
| G3  | Restraint                   | **Load-aware. Not persistent.** Steering offers back off when the day/week is already full — rides the existing over-commit / balance load signals. Never nags.                                                                         |
| G4  | Scope                       | **Both** — an all-goals **overview** and a per-goal **deep timeline**.                                                                                                                                                                  |
| G5  | IA — the big one            | Promote the Planning horizon **"Bingo" → "Goals."** Bingo becomes a **view mode under Goals** (keep the name "Bingo"). Three lenses: **Bingo** (grid + reward), **List** (progress overview + timelines), **per-goal journey** (depth). |
| G6  | Panel-only goals            | Get a real home — they appear in the **List / overview** even when not placed on the bingo board (resolves the latent seam where non-board goals had nowhere to live).                                                                  |
| G7  | Per-goal timeline placement | Lives in the existing goal **detail panel** (`BingoGoalPanel`), **replacing** the bare "% via milestones" text.                                                                                                                         |

### Visual design (locked Jul 1 2026)

| #   | Decision       | Choice                                                                                                                                                                                               |
| --- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GD1 | Timeline style | **Vertical steps** — a top-to-bottom checklist-timeline (done ✓ / here ◉ / upcoming ○ descending). Fits the narrow goal detail panel and scrolls naturally.                                          |
| GD2 | Heatmap style  | **Calendar grid** — GitHub-style squares beneath the timeline; darker = more attention that day, faint = quiet. Familiar, reads rhythm at a glance. Renders per-goal; toggle to keep the panel calm. |

**Open (settle during build):**

- Heatmap grain: per-goal attention (locked) — plus whether an **all-goals** attention heatmap doubles as a category-balance signal (nice-to-have; ties to §2).
- _(Settled Phase 4: milestone target dates are **optional** — add one when useful; undated milestones order by sequence and space evenly. Timeline always works.)_
- Steering copy + exact load threshold at which offers go silent (§3d).

---

## 2. Data model

Read-mostly again — reuses `goals`, `goal_milestones`, `tasks` (`milestoneId`), `task_time_entries`.
Small additions to power the timeline + heatmap:

- **`goal_milestones`** — add:
  - `targetDate` (date, **nullable**) — optional placement on the journey; if absent, milestones
    order by existing `sortOrder` and render as evenly-spaced stops. Timeline works with or without dates.
  - `completedAt` (timestamp, nullable) — set when the milestone first derives complete (all linked
    tasks done). Gives the timeline real "when you reached this stop" points and feeds the heatmap.
    (Completion stays **derived**; this just records the moment.)
- **Heatmap** — no new table. Attention to a goal on a given day = task completions + `task_time_entries`
  on tasks linked to that goal's milestones. Aggregate per day/week for the heatmap.
- **Steering setting** — extend `app_settings`: `goalSteering` (`on` | `off`, default `on`),
  load-aware by default (G3). No per-goal toggle v1.

RLS `auth.uid()`; `(user_id, updated_at)` index already on milestones; new columns ride existing sync.

---

## 3. Placement & flows

### 3a. The "Goals" horizon (G5)

Rename the horizon; `PlanHorizonView` gains **Goals** in place of **Bingo**. Inside Goals, a
lens/mode switch (reuses the existing grid ↔ list toggle pattern):

- **Bingo mode** — `BingoCard` grid, unchanged. Still the annual 5×5, still feeds line-bingo → garden.
- **List mode** — the **progress overview** (G4): every goal (board + panel-only) as a row showing
  title, category color, a **compact progress indicator**, and a **peek of its timeline**. Sortable/
  groupable by category or horizon. This is the enriched `BingoListView`.
- Selecting any goal (either mode) opens the **detail panel** with the full journey (3b).

### 3b. Per-goal journey (G1, G7) — in the detail panel

Replaces the bare "% via milestones" text in `BingoGoalPanel`:

- **Timeline spine — vertical steps (GD1)** — milestones as ordered stops descending the panel:
  completed = ✓ (behind you), current = ◉ (here), upcoming = ○ (ghosted, ahead). Uses `targetDate`
  when present, else `sortOrder`.
- **Each stop** shows its linked-task counts (`{done}/{total}`) — the real work beneath the milestone.
- **Heatmap layer — calendar grid (GD2), toggle** — GitHub-style squares beneath the steps showing
  attention to _this goal_ over time; darker = fed, faint = quiet. Hidden until toggled to keep the
  panel calm.
- **Progress** reads as "3 of 7 stops" / a filling spine — never a bare percentage as a score.

### 3c. Steering — next stop → next step (G2)

- Kash identifies the **next unfinished milestone** (first incomplete by `sortOrder`/date) and its
  **next actionable step**.
- **Two calm entry points**, both opt-in:
  1. **Pull-in** — from the goal journey, a "work toward this today" affordance adds the step to
     **Today** (into an active bucket, **not** "later" — reversing today's behavior).
  2. **Morning hand-off offer** — during the morning review, Kash may _offer_ one goal's next step
     as a ghosted-accept suggestion (reuses the existing ghosted-accept pattern). Accept → enters
     Today; ignore → it simply doesn't.
- **Never** auto-schedules across the calendar (G2). The user always takes the step; Kash only places
  it in reach.

### 3d. Load-awareness (G3)

- Before offering a step, check the day/week load via the existing **over-commit** + **balance**
  signals. If the day is already at or over capacity (over-commit flag set, or Top-3 unfilled-and-busy),
  **suppress** the morning offer entirely — the journey pull-in stays available, but Kash doesn't
  initiate.
- Rotate which goal gets an offer so no single goal nags; at most **one** goal-step offer per morning.
- Setting `goalSteering = off` silences all initiated offers; the pull-in affordance remains.

---

## 4. States & edges

- **Goal with no milestones** — timeline shows an empty spine + "add the first stop"; no fake progress.
- **No dates on any milestone** — evenly-spaced stops by order; timeline still reads left-to-right.
- **Panel-only goal** — full journey works; simply absent from the bingo grid, present in List (G6).
- **Busy day** — no initiated steering offer (§3d); nothing feels withheld because the pull-in is there.
- **Completed goal** — timeline fully filled; becomes eligible for an **Evidence** milestone edition
  (see `kash-3.0-evidence-build-spec.md` E5/E8 — larger goals only).
- **First run** — Goals horizon shows onboarding to create/finalize the bingo card (existing flow).

---

## 5. Integration

- **Evidence** — a completed larger goal's filled journey is exactly the "trail that got you here"
  Evidence surfaces (Gap A's two halves reinforce each other).
- **Today / steering** — pulled-in steps are normal tasks (category-carrying, Top-3-eligible,
  time-trackable); they land in an active bucket, not "later."
- **Balance (§2)** — the per-goal heatmap shows attention rhythm; an optional all-goals attention view
  doubles as a category-starvation signal, connecting to the balance-nudge work (`goals-vs-build` Gap C).
- **Over-commit / load** — steering consumes the existing over-commit + balance computations for §3d.
- **Planning-mode spec** — this **supersedes** the "Bingo" horizon label; update
  `kash-3.0-planning-mode.md` (PM-1 / §7) and `docs/build-status.md` to reflect **Goals** as the
  horizon with Bingo as a sub-mode. Line-bingo reward + garden feed are unchanged.
- **Sync / RLS** — new milestone columns + setting respect the optimized sync model; `auth.uid()`.

---

## 6. Motion

Timeline stops fill with a soft settle as milestones complete (earned, not confetti — celebration is
separate). Heatmap cells fade in. Mode switches (Bingo ↔ List) cross-fade. Per the app-wide motion
tokens (`animation-sweep.md`).

---

## 7. Build slice (suggested PRs)

1. **Horizon reframe** — `PlanHorizonView` "Bingo" → "Goals" with Bingo/List modes; panel-only goals
   surface in List. Update planning-mode + build-status docs.
2. **Data** — `goal_milestones.targetDate` + `completedAt`; set `completedAt` on derived completion;
   `app_settings.goalSteering`.
3. **Per-goal journey** — timeline spine + heatmap in `BingoGoalPanel`, replacing the text %.
4. **List overview** — enriched `BingoListView`: progress indicator + timeline peek, sort/group.
5. **Steering** — next-step identification; journey pull-in (into active bucket); morning ghosted-
   accept offer; load-aware suppression (§3d); setting.
6. **(Optional)** all-goals attention heatmap → balance signal.

```

```
