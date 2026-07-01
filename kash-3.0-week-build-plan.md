# Kash 3.0 — Week (§7) build-finish plan

> Phased plan to finish the Week view. Decisions are all closed (Jun 25); this is **build-only**. Phase
> set = **WD1–WD7**, sequenced low-risk → high-choreography, animation last (per
> `kash-3.0-animation-sweep.md` §5 + §3 of the build-breakdown). Mirrors `kash-3.0-today-build-plan.md`.
> Companions: `kash-3.0-plan.md` §7, the Week decision records (`kash-3.0-week-q1-column-tally`,
> `-q2-overcommit-threshold`, `-q2b-learned-guard`, `-q3-protected-recurrence`, `-week-layout`,
> `-week-inverted.html`), `kash-3.0-mockups.html` (visual ref), `kash-3.0-design-tokens.md` (§5 motion).

---

## Decisions this plan implements

| #          | Topic                    | Decision                                                                                                                                                                                                                        | Record                |
| ---------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| W-PB       | Protected blocks         | **Placeholder + soft constraint**; no fixed clock time required; **recurring template + weekly confirm** (a "default week" proposed each planning session)                                                                      | plan §7.1 / `week-q3` |
| W-PB-today | Protected block on Today | No-clock-time block = an **all-day pinned chip** above the timeline; **timed** blocks render on the grid                                                                                                                        | plan §7.1             |
| W-bord     | Balance visualization    | **Category-colored borders on every task**; mix read by scanning colors (no always-on column bars)                                                                                                                              | plan §7.2             |
| W-tally    | Per-column tally         | **On demand** — borders stay default; a proportional category tally (Today's balance visual) appears on **hover/tap of a day**; mobile = explicit tap on day header                                                             | `week-q1`             |
| W-prio     | Per-day priorities       | **Up to 3 priorities per day**, set ahead — the Top-3 mechanic at week scale                                                                                                                                                    | plan §7.3             |
| W-over     | Over-commit warning      | **Soft, non-blocking**, in §2 Top-3-weighted units; **learned/adaptive** threshold ("more than usual for you"); fixed default ~3–4 wks → learned; **protected blocks count fully**; drift named by §11 reflection (no hard cap) | `week-q2`/`-q2b`      |
| W-ai       | AI week arrangement      | Extend week-draft to respect **category balance + protected blocks** (Planner mode; high-stakes → confirm-first, §11)                                                                                                           | plan §7.5             |
| W-eow      | End-of-week review       | **Soft, dismissible chip** at a configurable **week wind-down (default Sun eve)**; always one tap in the switcher; **never auto-opens** (mirrors §6 EoD)                                                                        | plan §7.6             |
| §5 motion  | Motion                   | Drag **lift** (scale+shadow); per-category **load bar animates its fill**; protected blocks **place with scale/fade**; reduced-motion respect                                                                                   | `animation-sweep` §5  |

---

## Current state (verified via code, Jun 30)

**Built:** `this-week` page; `WeekCanvas` / `WeekColumn` / `WeekInbox` / `WeekLaterBacklog`; AI week
draft (`WeekDraftPanel`, `week-draft` router, `generate-week-draft`, `validate-week-draft-assignments`);
protected blocks **data + UI** (`protected_block_templates` + `protected_blocks` schema, `protected-blocks`
router with `proposeFromTemplates` / `confirmProposedForWeek`, `AddProtectedBlockButton`, `ProtectedWeekBar`,
`ProtectedBlockChip`, Today all-day chips); week time aggregation (`aggregate-week.ts`); `WeeklySummaryCard`
(focus time **by category + by project** — the EoW substrate); category coloring inherited from the lens
engine (VF).

**Gaps vs decisions:**

- **No per-day priorities** — no day-scoped Top-N anywhere (no `dayPriority`/`day_priority` in code).
- **No per-column tally** — borders exist via the lens, but there's **no on-hover/tap proportional
  category tally** per day; no day-load calc.
- **No over-commit warning** — no load/over-commit computation; no learned threshold; protected blocks
  not yet counted toward a day's load.
- **AI week-draft ignores protected blocks** — `fetch-week-draft-context` / `generate-week-draft` /
  `validate-week-draft-assignments` have **no protected-block awareness**; no explicit category-balance pass.
- **EoW review is content-only** — `WeeklySummaryCard` renders time by category/project but has **no
  trigger/chip**, **no configurable week wind-down**, and **no % progress** per project/phase.
- **Protected blocks: loop unfinished** — no **Settings "default week" template editor** surfaced; the
  weekly **propose/confirm** isn't wired into a planning-ritual moment; **timed** protected blocks don't
  render on the Today timeline grid (only all-day chips).
- **No Week motion** — drag lift, load-bar fill, protected-place scale/fade not implemented (AN §5).

---

## Phases

### WD1 · Per-day priorities (Top-3 at week scale)

**Implements:** W-prio. **Self-contained mechanic, mirrors Today's Top-3.**

- Reuse the Top-3 pattern at day scope: mark **up to 3 tasks per weekday** as that day's priorities
  (a `(task, scheduled_date, dayPriorityOrder 0–2)` relationship, or a day-scoped flag mirroring
  `isTop3`/`top3Order`). Cap = 3/day, enforced app-layer.
- `WeekColumn`: a small **priority affordance** (star/pin) on each task; the 3 chosen rise to a
  per-day **"Priorities" group** at the column top; the rest sit below.
- Feeds the over-commit weighting (WD3) — a day-priority counts as a heavy unit, like Top-3 in Today.

**Acceptance:** you can set ≤3 priorities on any weekday ahead of time; they're visually distinct at the
column top; the cap holds; they persist + sync. **Size: M.**

---

### WD2 · Category mix legible — borders + on-demand tally

**Implements:** W-bord, W-tally. **Builds on the lens engine + Today's `BalanceBar`.**

- **Confirm category-colored borders** render on **every** week task card (verify the lens applies in
  `WeekColumn`; add the 4px category accent if any path is missing). Borders are the clean default.
- **Per-column tally on demand:** on **hover** of a day (desktop) / **tap of the day header** (touch),
  show a proportional **category tally** reusing Today's balance visual language (the same weighted
  segments as `category-balance.ts`), scoped to that day. Dismiss on leave/tap-away. No always-on bars.

**Acceptance:** the week reads as a field of category colors; hovering/tapping a day reveals its
proportional category mix in the same visual language as Today's balance bar; no column clutter at rest.
**Size: S–M.**

---

### WD3 · Over-commit soft warning (learned, weighted, protected-aware)

**Implements:** W-over. **Shares the Top-3-weighted load calc with Today TD1; the drift-flag depends on §11.**

- **Day load = Σ weighted units** (Top-3/day-priority = 3, others = 1; the §2 weighting locked in
  Today TD1) — **including protected blocks**, which count fully (spoken-for time).
- **Threshold = learned/adaptive:** **cold-start** uses a fixed sane default for the first ~3–4 weeks,
  then switches to **your typical day** so the warning means "more than usual **for you**." No hard cap.
- **Warning = a gentle, non-blocking flag** on the over-full day (never disables drops).
- **Drift guard (depends on §11 reflection):** the §11 reflection layer **names a rising baseline**
  ("your typical day has grown 30% in 6 weeks — intended?"). Ship the warning with the cold-start default
  first; wire the learned baseline + drift-flag when the §11 reflection layer lands.

**Acceptance:** a day stacked past your norm shows a soft flag (not a block); over-protecting a day can
itself trip it; early weeks use the fixed default, later weeks track your baseline. **Size: M** (+ §11 dep
for the drift-flag only).

---

### WD4 · Protected blocks — finish the loop

**Implements:** W-PB (recurrence/ritual), W-PB-today (timed on grid). **Tables + router already built.**

- **Settings "default week" editor:** a UI over `protected_block_templates` — add/edit/remove the
  recurring blocks (category, weekday, optional time window, label) that form your default week.
- **Weekly propose/confirm in the ritual:** surface `proposeFromTemplates` → `confirmProposedForWeek`
  at the weekly-planning moment (accept/adjust the proposed default week). Routine without autopilot —
  proposed, never silently applied.
- **Timed protected blocks on Today's timeline:** render a protected block **with** a clock window as a
  block on Today's grid (not just the all-day chip); keep the no-time blocks as all-day chips.

**Acceptance:** you maintain a default week in Settings; each weekly plan proposes it for accept/adjust;
a timed protected block appears on Today's grid while no-time ones stay all-day chips. **Size: M.**

---

### WD5 · AI week arrangement respects protected blocks + balance

**Implements:** W-ai. **Extends the existing week-draft; depends on WD4's protected-block data.**

- `fetch-week-draft-context`: include the week's **protected blocks** + a **per-category load** snapshot.
- `generate-week-draft` / `validate-week-draft-assignments`: treat protected blocks as **spoken-for**
  (don't pile work over them) and add a **category-balance objective** (fill gaps toward the
  month/quarter intentions, §8 balance pass) without forcing.
- **Planner mode, confirm-first (§11):** the draft is proposed (ghosted-accept), never auto-applied.

**Acceptance:** the AI week draft never schedules over a protected block, evens category mix where it can,
and arrives as a reviewable proposal. **Size: M–L.**

---

### WD6 · End-of-week review (soft chip + % progress)

**Implements:** W-eow. **Reuses Today's TD4 EoD-trigger pattern; `WeeklySummaryCard` is the substrate.**

- **Trigger = soft, dismissible chip** at a configurable **week wind-down (default Sun eve)** — add a
  Settings value; **never auto-opens**; Review is always one tap in the switcher (mirror `useEodReviewTrigger`
  done right per Today TD4 — chip only, no modal seizing the screen).
- **Content:** extend `WeeklySummaryCard` with **% progress per project/phase** (the §9 weighted metric:
  completed task-weight ÷ total), alongside the existing time-by-category + time-by-project. The §11
  Reflection voice narrates wins.
- **Depends on:** data-spine Phase-2 time agg (built, `aggregate-week.ts`) + the §9 completion metric.

**Acceptance:** a gentle chip appears at the configured week wind-down and dismisses; the review shows
time/category, time/project, and honest % progress; it never auto-opens. **Size: M.**

---

### WD7 · Motion pass (Week)

**Implements:** AN §5 (Week), AN-0a/b/c. **Last** — after surfaces are built and Design Tokens rolled out.

- **Drag = lift:** scale + shadow on grab; settles into the day on drop.
- **Load bar animates its fill** on change (the WD2 tally + any per-category load).
- **Protected blocks place with a scale/fade.**
- Wire the global duration/easing tokens; **`prefers-reduced-motion`** = quick opacity fade only.

**Acceptance:** Week motion matches the sweep's gentle-calm spec; reduced-motion users get fades; no
bespoke durations. **Size: S–M.**

---

## Sequencing & dependencies

```
WD1 (per-day priorities)   ─ independent, ship first; feeds WD3 weighting
WD2 (borders + tally)      ─ independent (lens + BalanceBar)
WD3 (over-commit warning)  ─ uses WD1 weighting; drift-flag depends on §11 reflection (ship cold-start first)
WD4 (protected loop)       ─ independent (tables/router built)
   └─ WD5 (AI respects protected + balance) ─ depends on WD4
WD6 (EoW review)           ─ reuses Today TD4 trigger; depends on §9 completion metric (P2 agg built)
WD7 (motion pass)          ─ LAST; depends on surfaces above + Design Tokens rollout
```

Recommended order: **WD1 → WD2 → WD4 → WD3 → WD5 → WD6 → WD7.** WD2 and WD4 can run in parallel with WD1
if two build sessions are available. WD5 must follow WD4; WD7 is last.

**All sub-decisions resolved — the plan is fully build-ready** (WD3 drift-flag + WD5 balance lean on the
§11 reflection layer; both ship a functional first cut without it).
