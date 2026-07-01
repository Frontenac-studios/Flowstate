# Kash 3.0 — Remaining Build Backlog

> The single consolidated list of **what's left to build** now that **all product/design forks are closed
> (Jul 1 2026)**. Planning is done; this is a pure build phase. Companion to
> `kash-3.0-build-breakdown.md` (status matrix) and `kash-3.0-plan.md` (the product spec). Each item points
> at its authoritative spec — this doc adds the newly-decided detail inline and a suggested sequence.
>
> **Legend:** ⬜ not started · 🟡 partial/in-flight · ⬛ built. Sizes are rough (S ≤1 PR, M 2–3, L 4+).

---

## 0. What changed Jul 1

The last open forks were resolved and written back to their specs:

- **Bespoke animations** → `animation-sweep.md` AN-B6/B7/B8 + AN-P2c.
- **Accent states** → `plan.md` §5.
- **AI confirm-card UX** → `ai-persona-build-spec.md` ("Confirm-card UX").
- **Garden-art direction** → `build-breakdown.md` decision-wrap + §A.4 below.

Nothing else needs a decision. Everything below is buildable as-is.

---

## A. Design & motion application (small, fully decided — do first, unblocks the look)

These are cheap, high-leverage, and gate the feel of every feature built after them.

### A.1 — B&W teardown tail (PR2b) · 🟡 · S

Finish the black-and-white rollout: **outline-primary button audit** across all surfaces, and the
**gray→B&W neutral swap** in `src/styles/tokens.css` (then roll across components). Spec:
`kash-3.0-design-tokens.md` §5 teardown, `visual-redesign.md`. This is the only redesign work still open.

### A.2 — Accent states · ⬜ · S

One focused PR wiring the four resolved states (`plan.md` §5). Concrete implementation:

- **Checkbox — checked:** in a **task** context, fill with the task's category solid (`--cat-{cat}-solid`)
  - a **white check** glyph (mirrors the Today completion, AN-T1). In a **no-task/no-category** context
    (settings toggles, filters, confirm-card row toggles), fill with **`--ink`** (`#16181d`) + white check.
- **Top-3 star:** filled star tinted with the pinned task's category solid (`--cat-{cat}-solid`). This is the
  glyph the AN-B3 "star pop" lands on.
- **Links (body):** `color: var(--accent)` (ink) · `text-decoration: underline` · `text-underline-offset: 2px`,
  always visible (not hover-only).
- **Focus ring:** `box-shadow: 0 0 0 2px var(--surface), 0 0 0 4px var(--ink-muted)` — a **soft gray** ring
  with a 2px knockout gap. **Use `--ink-muted` (`#6b7280`, ~4.8:1), NOT `--ink-faint`/`#c9ccd2`** — the light
  gray fails WCAG focus-visibility (3:1). Applies to every keyboard-focusable control.

### A.3 — Animation sweep application · 🟡 · M

Apply `animation-sweep.md` end-to-end (mostly CSS on the AN-0 motion tokens). Most moments already have
homes; the four resolved Jul 1 need building:

- **AN-B6 · Project complete "fold to filed":** on the Projects **gallery** `ProjectCard`, at 100% →
  `scaleY` collapse from the top (`transform-origin: top; --motion-medium; ease-in`) + fade, then re-render as
  a slim **"Completed · [name]"** row inside the gallery's collapsible **"Completed · n"** group (reuse the
  Today/Projects completion-filing path, PROJ-A). Reduced-motion: opacity fade only, no scaleY.
- **AN-B7 · Create-shimmer "stripe breathes":** the optimistic task-row / composer 3px stripe gets a
  `.resolving` state → **opacity breathe keyframe** (`--motion-medium`, looped, ~0.4↔1). On server category
  resolve, drop `.resolving` and **cross-fade** the stripe to the final `--cat-{cat}-solid` (`--motion-short`).
  Reduced-motion: static stripe at the guess color until it settles (no pulse). _(Backend: `backend-optimization-spec.md` D1.)_
- **AN-B8 · Sync dot:** a **pulsing dot** in the **left-nav (sidebar) footer**, bound to the outbox-flush
  state (`--motion-medium` opacity+scale pulse, looped) + a small "sync" label. Idle = hidden/static.
  Reduced-motion: static dot.
- **AN-P2c · Bingo finalize→lock "grid seats to ink":** on card finalize, transition every cell border from
  `--border` to `--ink` with one synchronized micro scale-settle (`--motion-short`). No badge/lock glyph.
  Reduced-motion: instant border color change.

_Already in code / spec'd elsewhere:_ Top-3 pin flight (`pin-to-top3.ts`), Today completion choreography
(TD5, #94), Today TD6 motion (`feat/today-td6-motion`), Week motion (WD7).

### A.4 — Garden art production · ⬜ · M (design/art task, not eng)

Direction locked Jul 1:

- **Style:** **soft flat color** — friendly, rounded, gentle flat greens/flowers (Finch-adjacent). The
  garden is the deliberate **lush exception** to the B&W palette (`plan.md` §5, §12).
- **Growth model:** **accumulating** — each nourish event (self-care / Daily Win drip) plants a new thing;
  the garden fills over time. **Every plant starts as a seed and grows up from the soil** (scale-from-base
  with a slight overshoot — this is AN-C3, already spec'd).
- **Neglect:** **gentle dormancy** — after a lapse, plants soften to a muted/dormant palette and **revive
  when tended**. They never die (non-punitive).
- **Deliverable:** per-species seed→sprout→grown illustration stages, drawn in the soft-flat style, wired to
  the Care garden growth state and the Daily Wins nourish beats (`daily-wins-build-spec.md`, `care-build-spec.md`).

---

## B. Feature builds (each has a build spec — hand to a build session)

### B.1 — Week polish (WD backlog) · 🟡 · L

`week-build-plan.md` (WD1–WD7). Built: 7-day grid, inbox, AI week draft, protected blocks, week time agg.
**Left:** per-day priorities · on-demand per-column tally (hover/tap) · learned over-commit warning ·
protected-loop finish (Settings template editor + ritual + timed blocks on the Today timeline) · AI draft
respecting protected + balance · EoW review chip + % progress · motion (WD7).

### B.2 — Planning Mode horizons · 🟡 · L

`planning-mode.md`. Foundation built (schema + `/plan` shell + GhostedAccept + tRPC CRUD). **Left (parallel):**
Bingo view (incl. **AN-P2c finalize→lock** and the finalize/lock data path) · Year · Quarter · Month · Week
plan-mode · the soft **balance pass** closing step · the year-viz form.

### B.3 — Projects build-out · ⬛ core · M

`projects-miller.md`. Core columns + gallery in code. **Left:** templating engine (explicit save + AI-suggest,
learned durations) · the **% completion metric** (weighted task-weight ratio per §2) · the multi-project
**calendar/project-hue toggle** (distinct project-hue set, legend) · **AN-B6 fold-to-filed** on the gallery.

### B.4 — Care (stats-first → garden last) · ⬜ · L

`care-build-spec.md` (Phases 1–8) + `care-library-build-plan.md` (**CL1–CL5**, the recommended first PR set,
branch off `main`): Tasks-tab Finch library, 2 tables + `tasks.care_activity_id`, 6 themes (~23 seeds), static
seed catalog, cadence pre-fills recurrence. Garden (art from A.4 + AN-C3 growth) lands **last**.

### B.5 — Daily Wins · ⬜ · M

`daily-wins-build-spec.md` (**DWN-1..5**). Hybrid source (AI ghosted + manual), ranked taxonomy (1-care-event
cap), hard 3, qualitative wins, garden nourish (drip per win + bigger beat on full 3), midnight reset + morning
grace, EoD-only Today tracker, `daily_wins` table. Cross-cuts §6 Today + §12 Care (and the garden, A.4).

### B.6 — AI persona layer · 🟡 · L

`ai-persona-build-spec.md`, sub-phases **7A → 7B → 6A → 7C → 6B → 8A → Verify**. Refactor one voice →
register-tuned base + tone modifiers; inject About-me + live state; expand `chat-tools.ts` to the read/write
catalog as **proposed-action returns**; build the **confirm-card UI** — now fully specified: **inline in the
chat rail**, **one grouped card with per-row toggles** for multi-task proposals, and **Focus applies its
minimal tools (complete/park) silently** (no card; broader writes not exposed in Focus). Then per-surface
wiring + essential nudges. _(Open tail: About-me update mechanism — §13.)_

### B.7 — The Abyss · ⬜ · M

`abyss-build-spec.md`. Dark/immersive capture surface; ⌘⇧A modal capture; park = sink+blur (AN, §5);
fixed archive threshold (~90d) + override.

### B.8 — Values & About-me · ⬜ · M

`values-context.md` (owns the About-me doc: hybrid structured + free-form, read into AI context each turn,
edits via `propose_about_me_edit` → confirm). Start empty; AI continuously proposes ghosted additions.

### B.9 — Mechanics · ⬜ · S

`plan.md` §15: desktop-app fallback · simple controls · ephemeral celebrations.

### B.10 — Data spine tail · ⬛ mostly · S

`data-spine-build-spec.md`: time-tracking aggregation polish · full Repeat picker (custom ends/interval) ·
`editOccurrence` UI on plan rows.

---

## C. Suggested build sequence

1. **A.1 + A.2 + A.3** — finish the B&W teardown, land the accent states, apply the animation sweep. Small,
   and everything after inherits the finished look/feel. (A.4 garden art can start in parallel as a design task.)
2. **B.1 Week polish** + **B.3 Projects build-out** — close out the two surfaces already deepest in code.
3. **B.6 AI persona** (7A–7C confirm-card spine) — the confirm-card mechanism many later writes depend on;
   get one write working end-to-end before breadth (6B).
4. **B.2 Planning horizons** + **B.4 Care library (CL1–5)** — the two biggest net-new surfaces.
5. **B.5 Daily Wins** + **A.4 garden art** — they cross-cut Today/Care and light up the garden together.
6. **B.7 Abyss** · **B.8 Values/About-me** · **B.9 Mechanics** · **B.10 data-spine tail** — remaining
   surfaces and cleanup.

Backend note: the offline-first optimizations (`backend-optimization-spec.md`, OPT-1..7 / D1–D4) land **with**
the surface each touches, not as a blocking pre-phase — D1 create-shimmer + sync dot ride along with A.3/A.2
(composer + shell), D2 detail panel with the shell, D3 chat windowing with B.6.
