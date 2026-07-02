# Kash 3.0 — Today (§6) build-finish plan

> Phased plan to finish the Today page. Decisions are all closed (Jun 25–27); **build complete (Jul 1 2026).**
> **Status: TD1–TD6 are BUILT** — Phase 0 (#124) + prior PRs shipped balance bar, adaptive timeline,
> living record, wind-down, completion choreography (#94), and arrival motion (`TodayList` AN-T2).
> Companions: `kash-3.0-design-prompt-today.md`, `kash-3.0-animation-sweep.md`,
> the Today decision records (`kash-3.0-today-q1/q1b/q2/q3`, `-t1/-t2/-t3.html`),
> `kash-3.0-mockups.html` (visual ref), `kash-3.0-design-tokens.md` (§5 motion).

---

## Decisions this plan implements

| #            | Topic                           | Decision                                                                                                                                                                               | Record            |
| ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Q1           | Calendar window                 | **Adaptive fit** (earliest event → latest block + padding; grows through day) + **auto-scroll to now ON** with a "jump to now" affordance                                              | `today-q1`        |
| Q1b          | Empty/early-day floor           | **Min 6h window at now** (a ~6h frame anchored to now) as the _default viewport_, but the **full day stays scrollable** up/down — earlier/later hours are scrolled-away, never clipped | `today-q1b`       |
| Q2           | Balance weighting               | **Top-3 weighted** (Top-3 = 3 units, small = 1); build as **hybrid** so input can swap to minutes later                                                                                | `today-q2`        |
| T3           | Balance population              | **Planned** (all of today, not just done); empty category shown **hatched**; lopsided warning can fire in the morning                                                                  | `today-t3`        |
| Q3           | EoD Review trigger              | **Soft, dismissible nudge** at configurable time (default 6pm); Review always one tap in the switcher; **never auto-opens**                                                            | `today-q3`        |
| T1           | Top-3 deadline                  | **Derived default**: Top-3 target = wind-down −1h; **override allowed**                                                                                                                | `today-t1`        |
| T2           | Untimed completions on Calendar | **Thin markers** (a tick at completion time)                                                                                                                                           | `today-t2`        |
| AN-T1/T1b/T2 | Motion                          | Completion choreography (checkbox→category color, slide-out, **Completed · n** section); arrival/RDM slide-in; reduced-motion respect                                                  | `animation-sweep` |

---

## Current state (verified via code, Jul 1 2026 — complete)

**Built (TD1–TD6):**

- **TD1 balance bar** ✅ — Top-3-weighted, planned population, empty-category hatch + lopsided warning
  (`category-balance.ts` now carries the weighting).
- **TD2 adaptive timeline** ✅ — `src/lib/timeline/adaptive-window.ts` + now-line + auto-scroll-to-now.
- **TD3 living record** ✅ — thin completion markers / now-line in `TimelinePane`.
- **TD4 wind-down + soft nudge** ✅ — `useWindDownHour.ts` + `src/lib/eod/wind-down.ts`; the auto-open
  modal path is replaced by the configurable wind-down + soft chip; derived Top-3 target.
- **TD5 completion choreography + Completed section** ✅ (#94) — category-color fill → strike → slide-out
  → settle into a persistent `CompletedSection` (cleared at local-midnight rollover).
- Plus the prior base: list/calendar/review switcher, Top-3 slots + pin flight (`pin-to-top3.ts`),
  drag-drop timeline + protected blocks (all-day + timed), composer, focus mode, undo, lens engine.
- **TD6 motion pass** ✅ — row arrival slide-in (AN-T2) in `TodayList`, motion tokens, `prefers-reduced-motion` respect.

**Remaining gap:** none — Today §6 is shipped.

---

## Phases

### TD1 · Balance bar = real metric (Top-3 weighted, planned, warning) — ✅ BUILT (#91)

**Implements:** Q2, T3. **Lowest risk — component exists, change the data layer.**

- `category-balance.ts`: weight Top-3 tasks = **3**, others = **1** (use `isTop3`/`top3Order`). Keep
  the function shape returning weighted segment sizes; structure input so a later swap to
  recorded-minutes (Q2 hybrid → time-based) needs no view rework.
- Population = **all tasks planned for today** (incomplete + complete), confirm `BalanceBar`'s feed.
- `BalanceBar.tsx`: render an **empty (hatched) segment** for categories with zero weight, add the
  **"mostly {Category}"** summary label, and a soft **lopsided warning** line ("heavy on work, no
  Relationships planned today") when a life-area is empty / one dominates.

**Acceptance:** the Q2 example day reads "deep work leads, errands shrink"; an all-work morning shows
the hatched Relationships segment + warning before noon. **Size: S.**

---

### TD2 · Adaptive calendar window + auto-scroll to now — ✅ BUILT (#91)

**Implements:** Q1 (+ Q1b sub-decision). **Confirm the floor before building (see below).**

- New `src/lib/timeline/adaptive-window.ts`: compute window = earliest event → latest block +
  padding; grows as blocks land. **Floor (Q1b, resolved):** the _default viewport_ is a **minimum
  ~6h frame anchored to now**; the **full day stays rendered and scrollable** up/down — earlier/
  later hours scroll away, they are never clipped.
- `TimelinePane.tsx`: render the whole day but **default the scroll position to the ~6h-at-now
  frame**; add a **now-line** indicator (ink, "now h:mm"); **auto-scroll to now** on open; show a
  **"jump to now"** chip when the user scrolls away.

**Acceptance:** opening Today parks on a calm ~6h frame around now with the next thing in view;
scrolling up reveals the morning and down reveals the evening; the frame grows to fit as blocks land.
**Size: M.**

---

### TD3 · Timeline as a living record — ✅ BUILT (#91)

**Implements:** T2 + the `design-prompt-today` "living record" framing. Builds on TD2.

- **Thin completion markers (T2-B):** untimed checkoffs render as a thin tick at their completion
  time on the timeline (not full blocks).
- **Completed focus blocks:** render with the category **4px left stripe**, a category chip, a
  **"✓ {n}m"** marker, slightly muted (wire from `task-time-entries` / focus blocks).
- **Active block:** category stripe + Top-3 star + running timer.
- **Self-care gap suggestion:** a gentle **dashed** row in an open gap ("Good gap — a 10-min walk?")
  in Body & Mind teal. _(Suggest-only; coordinate with Care — can ship as a static placeholder if
  Care's pin-to-Today isn't wired yet.)_
- **Open slot:** a dashed "Decide (⌘D) drops the next block here" affordance.

**Acceptance:** an errand-heavy day no longer looks empty on Calendar; completed/active/suggested
states are all legible and match the mockup. **Size: M–L.**

---

### TD4 · Wind-down anchor + Top-3 deadline + soft EoD nudge — ✅ BUILT (#91)

**Implements:** Q3, T1. **Includes a correction** — current EoD auto-opens, which must stop.

- **Settings:** add a **wind-down time** (default 6pm), replacing the fixed `eodThresholdHour()`
  constant (`eod-constants.ts`).
- **Derived Top-3 target = wind-down −1h** (T1-D), with a per-day **override**; surface it in the
  Top-3 status cue / header.
- **EoD Review → soft nudge:** remove the auto-open modal path in `useEodReviewTrigger.ts`
  (`uiState === "modal"` → drop); at wind-down time show a **gentle, dismissible chip** only; keep
  Review **always one tap** away in the switcher.

**Acceptance:** Review never seizes the screen; the chip appears at the configured time and dismisses;
Top-3 target tracks wind-down −1h and is overridable. **Size: M.**

---

### TD5 · Completion choreography + Completed section — ✅ BUILT (#94)

**Implements:** AN-T1, AN-T1b. Structural + motion; first of the two "animation-last" phases.

- **Completion sequence (AN-T1):** checkbox fills with the **task's category color** (white check —
  not ink/gray); title strikes; row **slides out** to the side.
- **Completed · n section (AN-T1b):** new `CompletedSection.tsx` at the bottom of `TodayList`; the
  row reappears there; **persists all day** (cleared at local-midnight rollover); **manual collapse**
  toggle. Reuse `count-completions-today` / `local-day-bounds` / `useSessionUndo`.

**Acceptance:** completing a task plays the category-color → strike → slide-out → settle-into-
Completed sequence; the section survives reload until midnight; undo still works. **Size: M.**

---

### TD6 · Motion pass (arrival/RDM + tokens + reduced-motion) — 🏗️ IN PROGRESS (`feat/today-td6-motion`)

**Implements:** AN-T2, AN-0a/b/c. **Last** — after surfaces are built and Design Tokens rolled out.

- **Arrival / RDM reveal (AN-T2):** task rows **slide in from the side** (+fade) on load; RDM
  ("Decide") picks slide in too.
- Wire the global duration/easing tokens (`--motion-micro/short/medium/long`, gentle-calm easing)
  across the Today surfaces touched above; reconcile the existing pin/pulse animations to the tokens.
- **`prefers-reduced-motion`:** full respect — replace every slide/scale with a quick opacity fade.

**Acceptance:** Today's motion matches the sweep's gentle-calm spec; reduced-motion users get fades
only; no bespoke durations remain. **Size: S–M.**

---

## Sequencing & dependencies

```
TD1 (balance)          ─ independent, ship first
TD2 (adaptive window)  ─ floor resolved (min 6h at now, full day scrollable)
   └─ TD3 (living record) ─ depends on TD2
TD4 (wind-down/nudge)  ─ independent (touches settings + EoD)
TD5 (completion/Completed section) ─ independent structurally; pairs with TD6
TD6 (motion pass)      ─ LAST; depends on surfaces above + Design Tokens rollout
```

Recommended order: **TD1 → TD2 → TD3 → TD4 → TD5 → TD6.** TD1–TD5 are merged (#91, #94); **only TD6
(motion) remains**, on `feat/today-td6-motion` — and it's meant to land last, with the app-wide animation
pass and the Design Tokens rollout.

**Today is functionally complete; TD6 motion polish is the only open phase.**
