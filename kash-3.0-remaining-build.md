# Kash 3.0 — Remaining Build Backlog

> What's **actually left** after Kash 3.0 complete (Jul 2 2026).
> The original 3.0 feature build **and** the Jul 1 gap-audit reassurance track are **done**. Entry
> point: `docs/build-status.md`. Maturity matrix: `kash-3.0-build-breakdown.md`.
>
> **Legend:** ⬜ not started · 🟡 partial · ⬛ built. Sizes: S ≤1 PR, M 2–3, L 4+.

---

## 0. What changed since Jul 1 docs

The Jul 1 tracker assumed most net-new surfaces were still to build. **Kash 3.0 is now complete on
`feat/kash-3.0-complete`:**

| PR / commit  | Shipped                                                                        |
| ------------ | ------------------------------------------------------------------------------ |
| #124 Phase 0 | B&W visual foundation, accent states, motion tokens                            |
| #125 Phase 1 | Projects spine — multi-project calendar, weighted progress, recurrence polish  |
| #126 Phase 2 | AI persona breadth, confirm-card, proposed actions                             |
| #127 Phase 3 | Abyss (sky, list, archive, monthly review)                                     |
| #128 Phase 4 | Values / About-me Settings tab                                                 |
| #129 Phase 5 | Care expansion (library, garden, breathing, reflection, stats, travel)         |
| #130 Phase 6 | Mechanics (celebrations, sync dot, notifications) + motion QA                  |
| #121–123     | Waves 2–4 — spine/projects, AI spine, Daily Wins                               |
| Phase 0      | Top-3 assurance — hold, check-ins, slip chip (`0fd55e5`)                       |
| Phase 1      | Foundations — morning hand-off, nudge arbiter, Assistance settings (`050bba1`) |
| Phase 2      | Balance nudge — category-starvation + weekly digest (`9216617`)                |
| Phase 3      | Evidence — wins memory editions + Care shrine (`0895c89`)                      |
| Phase 4      | Goals — progress timeline, steering, horizon renames (`e02c0c9`)               |
| Phase 5      | Tail — projects, garden sprites, AI tool audit, task tags (`343d3be`)          |

---

## A0. Reassurance & steering track (Jul 1 gap audit) · ⬛

The build faithfully shipped the _mechanical_ product (capture, schedule, track, balance-sense). The
audit (`kash-3.0-goals-vs-build.md`) found the **reassurance / reflection / steering layer** — the
emotional core the README names — under-built. Four features, each fully specced (functional +
visual decisions locked). **All four plus foundations are now built** (Jul 2 2026).

### A0.0 — Foundations · ⬛ · M

`kash-3.0-morning-and-arbitration-build-spec.md` — daily morning hand-off, nudge arbiter, Assistance
settings group, Abyss→Backlog + Bingo→Goals rename sweep.

### A0.1 — Evidence (wins memory) · ⬛ · M

Persistent, opt-in "wall of proof" in Care. `evidence_editions` table + Care shrine + cadence setting.
Spec: `kash-3.0-evidence-build-spec.md`.

### A0.2 — Goals progress + steering · ⬛ · L

Per-goal journey timeline + attention heatmap; next milestone step surfaces into Today. Horizon renamed
**Bingo → Goals**. Spec: `kash-3.0-goals-view-build-spec.md`.

### A0.3 — Balance nudge · ⬛ · M

Learned baseline → overall-lopsidedness trigger → category-starvation nudge + weekly digest. Spec:
`kash-3.0-balance-nudge-build-spec.md`.

### A0.4 — Top-3 assurance · ⬛ · S–M

One-tap time hold, morning/midday/wind-down check-ins, persistent-slip chip. Spec:
`kash-3.0-top3-assurance-build-spec.md`.

---

## A. Tail work (ordered by leverage)

### A.1 — Task tags (§14) · ⬛ · M

**Built** — `tasks.tags` jsonb, composer `;tag` capture, Week tag filter (OR semantics), task-detail
chips, sync parity. Migration `0029_nervous_moonstone.sql`. Spec: `kash-3.0-plan.md` §14,
`data-spine-build-spec.md` Phase 5.

### A.2 — Projects tail · ⬛ · S

Built: save/apply templates, multi-project calendar toggle, weighted % progress, fold-to-filed, AI
**“this looks reusable — save as template?”** chip on completion, duration **estimate-confidence**
“learning…” hint.

### A.3 — Garden illustration art · 🟡 · M (design/art)

Per-species soft-flat SVG sprites shipped (`GardenSpeciesSprite.tsx`, six themes). **Optional
remaining:** replace with full illustrated seed→grown assets. Spec: `care-build-spec.md`,
`animation-sweep.md` AN-C3.

### A.4 — Design tokens cleanup · 🟡 · S

B&W palette and accent states are live. **Left:** retire unused `glass.css` surface classes /
`@import` in `globals.css` when alias audit is clean. Spec: `design-tokens.md` §5 teardown.

### A.5 — Animation residual · 🟡 · S

Core moments shipped. Optional app-wide token audit for stragglers. Spec: `animation-sweep.md`.

### A.6 — AI persona tail · ⬛ · S

Confirm-card + proposed-action pipeline built; write-tool catalog audited. Spec:
`ai-persona-build-spec.md`.

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
- Data spine P1–P5 (incl. task tags)
- Gap-audit track — Foundations, Evidence, Goals steering, Balance nudge, Top-3 assurance

---

## D. Suggested sequence

1. **A.4 Legacy cleanup** — `glass.css` teardown when alias audit is clean
2. **A.3 Garden illustration art** — optional full illustrated assets (sprites shipped)
3. **A.5–A.7** — animation residual + backend optimization as you touch related code

---

## E. Document set

- **Start here:** `docs/build-status.md`
- Tracker: `kash-3.0-build-breakdown.md`
- Product spec: `kash-3.0-plan.md`
- Gap audit: `kash-3.0-goals-vs-build.md`
- Gap-audit specs: `kash-3.0-evidence-build-spec.md`, `kash-3.0-goals-view-build-spec.md`, `kash-3.0-balance-nudge-build-spec.md`, `kash-3.0-top3-assurance-build-spec.md`
- Ideas backlog: `kash-3.0-ideas-backlog.md`
