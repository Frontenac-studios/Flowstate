# Kash 3.0 — Remaining Build Backlog

> What's **actually left** after Phases 0–6 + waves 1–4 merged to `main` (Jul 1 2026).
> Planning and major feature build are **done**; this is tail + polish. Entry point:
> `docs/build-status.md`. Maturity matrix: `kash-3.0-build-breakdown.md`.
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

**Still accurate from Jul 1:** all product/design forks closed; specs complete.

---

## A. Tail work (ordered by leverage)

### A.1 — Task tags (§14) · ⬜ · M

**Decision = build in v1** (Jun 27), but `tasks.tags` is **not in schema yet**. Needs migration,
composer/filter UI, sync parity. Spec: `kash-3.0-plan.md` §14, `data-spine-build-spec.md`.

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

1. **A.1 Task tags** — only deferred schema item from §14
2. **A.2 Projects tail** — small UX gaps on an otherwise complete surface
3. **A.3 Garden art** — design task, parallel to eng
4. **A.4–A.7** — cleanup + optimization as you touch related code

---

## E. Document set

- **Start here:** `docs/build-status.md`
- Tracker: `kash-3.0-build-breakdown.md`
- Product spec: `kash-3.0-plan.md`
