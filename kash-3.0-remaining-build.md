# Kash 3.0 — Remaining Build Backlog

> What's **actually left** after Phases 0–6 + waves 1–4 merged to `main` (Jul 1 2026).
> The original 3.0 feature build is **done** (tail + polish, §A). A **Jul 1 gap audit**
> (`kash-3.0-goals-vs-build.md`) then held the app against the README product goals and added a
> **reassurance & steering track** (§A0) — four newly-specced features that were under-built. Entry
> point: `docs/build-status.md`. Maturity matrix: `kash-3.0-build-breakdown.md`.
>
> **Legend:** ⬜ not started · 🟡 partial · ⬛ built. Sizes: S ≤1 PR, M 2–3, L 4+.

---

## 0. What changed since Jul 1 docs

The Jul 1 tracker assumed most net-new surfaces were still to build. **Phases 0–6 landed on `main`:**

| PR           | Shipped                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| #124 Phase 0 | B&W visual foundation, accent states, motion tokens                           |
| #125 Phase 1 | Projects spine — multi-project calendar, weighted progress, recurrence polish |
| #126 Phase 2 | AI persona breadth, confirm-card, proposed actions                            |
| #127 Phase 3 | Abyss (sky, list, archive, monthly review)                                    |
| #128 Phase 4 | Values / About-me Settings tab                                                |
| #129 Phase 5 | Care expansion (library, garden, breathing, reflection, stats, travel)        |
| #130 Phase 6 | Mechanics (celebrations, sync dot, notifications) + motion QA                 |
| #121–123     | Waves 2–4 — spine/projects, AI spine, Daily Wins                              |

**Still accurate from Jul 1:** all _original_ product/design forks closed; specs complete. **New
since:** the Jul 1 gap audit reopened the wins-memory fork and added four decided tracks — see §A0.

---

## A0. Reassurance & steering track (Jul 1 gap audit) · ⬜

The build faithfully shipped the _mechanical_ product (capture, schedule, track, balance-sense). The
audit (`kash-3.0-goals-vs-build.md`) found the **reassurance / reflection / steering layer** — the
emotional core the README names — under-built. Four features, each fully specced (functional +
visual decisions locked):

### A0.1 — Evidence (wins memory) · ⬜ · M

Persistent, opt-in "wall of proof" in Care that reflects wins + reflections back in the user's own
voice. Read-mostly: one `evidence_editions` table + cadence setting. **Reverses part of §15** (wins
get memory; celebrations stay ephemeral; still no gamification). Resurfaces on larger-goal completion

- quarterly (default). Spec: `kash-3.0-evidence-build-spec.md`.

### A0.2 — Goals progress + steering · ⬜ · L

Per-goal **journey timeline** (vertical steps) + attention **heatmap** (calendar grid), replacing the
bare "% via milestones" text. Next milestone step surfaces into Today (load-aware; lands in an active
bucket, not "later"). **IA change:** rename the Planning horizon **Bingo → Goals**, with Bingo a
sub-mode + an enriched List overview (panel-only goals finally get a home). Spec:
`kash-3.0-goals-view-build-spec.md`. Updates `planning-mode.md`.

### A0.3 — Balance nudge · ⬜ · M

Closes the §2 promise the build never delivered. Learned baseline → **overall-lopsidedness** trigger
→ offer an action (Abyss item / small task). One load-aware nudge/day + weekly digest. Category-tinted
chip (BD1) + bar tilt-caption (BD2). Reuses `computeCategoryBalance`, `abyss-balance-candidates`,
`EssentialNudgeChip`. Spec: `kash-3.0-balance-nudge-build-spec.md`.

### A0.4 — Top-3 assurance · ⬜ · S–M

One-tap time **hold** (timeline ghost block → protected block); morning/midday/wind-down check-ins
(load-aware, midday lives on the slots); flag **persistent slips** (2+ days) as a gentle chip. Reuses
`Top3Slots`, `protected_blocks`, `evaluate-top3-stall`. Spec: `kash-3.0-top3-assurance-build-spec.md`.

---

## A. Tail work (ordered by leverage)

### A.1 — Task tags (§14) · ⬛ · M

**Built** — `tasks.tags` jsonb, composer `;tag` capture, Week tag filter (OR semantics), task-detail
chips, sync parity. Migration `0029_nervous_moonstone.sql`. Spec: `kash-3.0-plan.md` §14,
`data-spine-build-spec.md` Phase 5.

### A.2 — Projects tail · 🟡 · S

Built: save/apply templates, multi-project calendar toggle, weighted % progress, fold-to-filed.
**Left:**

- AI **“this looks reusable — save as template?”** on project completion (§9)
- Duration **estimate-confidence** UI — silent until N≈3 samples, show “learning…” below threshold

Spec: `kash-3.0-projects-miller.md`, `kash-3.0-plan.md` §9.

### A.3 — Garden illustration art · 🟡 · M (design/art)

Direction locked Jul 1 (soft-flat, seed→grown, gentle dormancy). **Procedural garden shipped**
(`GardenScene.tsx`) as the functional stand-in. Remaining = per-species illustrated stages if
replacing procedural art. Spec: `care-build-spec.md`, `animation-sweep.md` AN-C3.

### A.4 — Design tokens cleanup · 🟡 · S

B&W palette and accent states are live. **Left:** retire unused `glass.css` surface classes /
`@import` in `globals.css` when alias audit is clean. Spec: `design-tokens.md` §5 teardown.

### A.5 — Animation residual · 🟡 · S

Core moments shipped (stripe-resolving, project fold, sync pulse, bingo lock, page cross-fade,
week/care motion, Today arrival). Optional app-wide token audit for stragglers. Spec:
`animation-sweep.md`.

### A.6 — AI persona tail · 🟡 · S

Confirm-card + proposed-action pipeline built; hybrid About-me update UX decided (Settings ghosted rows + chat confirm-card). **Left:** audit full write-tool catalog vs spec. Spec: `ai-persona-build-spec.md`.

### A.7 — Backend optimization · 🟡 · ongoing

Parallel track — batched sync, keyset pull, indexing, outbox prune. Lands with touched surfaces.
Spec: `backend-optimization-spec.md`.

---

## B. Micro-decisions — RESOLVED (Jul 1 2026)

All former micro-decisions are closed. See `docs/build-status.md` § Decisions for the full list (values shape, About-me UX, facet labels, self-care cadence, low-stakes defaults).

---

## C. No longer on the backlog (shipped)

These were listed in the Jul 1 remaining-build doc; **now in code:**

- B&W teardown + accent states (Phase 0)
- Week polish WD1–WD7 (priorities, tally, over-commit, EoW, default-week editor, timed protected blocks)
- Planning horizons + balance pass + check-in + bingo finish
- Abyss, Care (all tabs), Daily Wins, Values/About-me
- AI confirm-card, mechanics, sync footer dot, ephemeral celebrations
- Data spine P1–P4 (except tags)

---

## D. Suggested sequence

1. **A0 Reassurance & steering track** — highest emotional leverage (the README's core promise):
   A0.1 Evidence · A0.4 Top-3 assurance (small) · A0.3 Balance nudge · A0.2 Goals progress + steering (largest)
2. **A.1 Task tags** — only deferred schema item from §14
3. **A.2 Projects tail** — small UX gaps on an otherwise complete surface
4. **A.3 Garden art** — design task, parallel to eng
5. **A.4–A.7** — cleanup + optimization as you touch related code

---

## E. Document set

- **Start here:** `docs/build-status.md`
- Tracker: `kash-3.0-build-breakdown.md`
- Product spec: `kash-3.0-plan.md`
- Gap audit: `kash-3.0-goals-vs-build.md`
- Gap-audit specs: `kash-3.0-evidence-build-spec.md`, `kash-3.0-goals-view-build-spec.md`, `kash-3.0-balance-nudge-build-spec.md`, `kash-3.0-top3-assurance-build-spec.md`
- Ideas backlog: `kash-3.0-ideas-backlog.md`
