# Kash 3.0 — Planning Mode (§8) build-finish plan

> Phased plan to finish Planning Mode. Decisions are all closed (Jun 22–25 gap-pass); this is **build-only**.
> **Status (Jul 1 2026):** horizons shipped on `main` — Year / Quarter / Month / Week / Bingo views,
> balance pass, check-in, bingo goal panel + list + onboarding + rewards. **Planning §8 is largely complete.**
> Residual polish only. Phase set = **PB1–PB8** (historical); companions unchanged.
> Companions: `kash-3.0-planning-mode.md` (incl. **§13 Tasks across horizons**), `kash-3.0-plan.md` §8,
> `kash-3.0-build-breakdown.md`, `kash-3.0-mockups.html` (Plan/Bingo pages), `kash-3.0-design-tokens.md` (§5 motion).

---

## Decisions this plan implements

| #       | Topic             | Decision                                                                      | Record             |
| ------- | ----------------- | ----------------------------------------------------------------------------- | ------------------ |
| NAV-1   | Plan switcher     | **Week · Month · Quarter · Year · Bingo** in-page on `/plan`; Bingo = 5th tab | planning-mode §8   |
| NAV-2/3 | Breadcrumb zoom   | Click period → zoom in; full path Year › Q3 › Aug › wkN                       | planning-mode §8   |
| NAV-5   | Resume last view  | localStorage (`horizon-storage.ts`)                                           | planning-mode §8   |
| NAV-4   | Transition motion | **zoom-grow ~240ms** (AN-P1) — last phase                                     | animation-sweep §2 |
| PM1-3   | Goal progress     | **Hybrid** — milestones auto-complete from linked tasks                       | planning-mode §2   |
| PM1-10  | Goal ↔ Project    | Panel-only until big → **promote to Project** (GP4-4)                         | planning-mode §7   |
| PM5-1   | Week in Plan      | **Same WeekCanvas** + plan-mode rail toggle (not duplicate `/this-week`)      | planning-mode §3   |
| PM6     | Balance pass      | Auto at end of planning; two-tier floor + target; ghosted; dismissible        | planning-mode §4   |
| PM7     | Check-in          | On-demand + gentle cadence; ghosted apply; mock AI OK until §11               | planning-mode §4   |
| GP3     | Finalize          | AI spelling pass → finalize-to-activate; **no rewards until final**           | planning-mode §7   |
| GP4     | Goal panel        | Tap locked cell → milestones, task counts, project link, promote              | planning-mode §7   |
| ET-5    | Bingo list mode   | Dense manage view; category ↔ status grouping toggle                          | planning-mode §10  |
| ON-1    | Bingo onboarding  | Three **equal** options: brain-dump / blank / guided                          | planning-mode §11  |
| PM11.3  | Capacity nudge    | Committed = sum `time_estimate_minutes`; nudge at **~130%+** of weekly target | planning-mode §11  |
| RW-1–3  | Line bingo reward | Line glow + toast; `recordBingoReward()` → Care; escalating → blackout finale | planning-mode §11  |
| GA-1–5  | Ghosted-accept    | Reuse `GhostedAccept` for all AI suggestions                                  | planning-mode §9   |

---

## Current state (verified via code, Jul 1 2026)

**Built:**

| Layer          | Status | Notes                                                                                                                                                      |
| -------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema + sync  | ✅     | `bingo_cards`, `goals`, `goal_milestones`, `quarter_themes`, `month_intentions`, `reserved_days`, `planning_suggestions`; task milestone + estimate fields |
| tRPC           | ✅     | `planning.ts` — full CRUD + suggestions stage/apply                                                                                                        |
| Plan shell     | ✅     | `/plan` → `PlanHorizonView`: switcher + breadcrumb + localStorage resume                                                                                   |
| Horizons       | ✅     | `YearView`, `QuarterView`, `MonthView`, `WeekPlanView`, `BingoCard` — all live (not placeholders)                                                          |
| Bingo          | ✅     | Goal panel, list view, onboarding, spelling pass, line rewards → `care.recordBingoNourish`, finalize→lock animation                                        |
| Balance pass   | ✅     | `BalancePassProvider` + chip + ghosts                                                                                                                      |
| Check-in       | ✅     | `CheckInProvider` + modal + cadence nudge                                                                                                                  |
| GhostedAccept  | ✅     | Shared; wired across planning surfaces                                                                                                                     |
| Tasks/horizons | ✅     | Per-tab task flows documented in **planning-mode §13**; milestone link + week rail shipped                                                                 |

**Residual gaps (polish, not blockers):**

- Horizon UX refinement as usage feedback arrives
- Optional zoom-grow transition (AN-P1) — page cross-fade ships instead
- Task **tags** (`tasks.tags`, §14) — global spine tail; not a planning-tab feature

---

## Phases

### PB1 · Bingo finish — goal panel, milestones, list, rewards, onboarding, finalize

**Implements:** GP3, GP4, ET-5, ON-1, PM11.3, RW-1–3. **Highest partial implementation — ship first.**

- **`BingoGoalPanel`:** tap any placed cell → lightweight side/bottom panel: locked statement, category/value/target,
  hybrid progress %, milestone list with per-milestone task counts, link to backing project, **promote to Project**
  (GP4-4 — create project + phases from milestones, set `goal.project_id`).
- **Milestones + tasks (GP4-2/3):** panel CRUD via existing tRPC; extend `tasks.update` (or `planning.linkTask`)
  for `milestoneId` + `timeEstimateMinutes`; list/link/create tasks under a milestone.
- **AI milestone breakdown (GP4-2):** ghosted suggestions via `planning_suggestions` + `GhostedAccept` (mock payload OK).
- **`BingoListView` (ET-5):** card ↔ list toggle; grouping toggle category / status.
- **`BingoOnboarding` (ON-1):** first empty card — three equal CTAs: brain-dump / blank grid / guided walkthrough.
- **Finalize polish (GP3):** pre-finalize spelling pass (ghosted fixes); rewards **only after `status = final`**.
- **Line reward (RW-1–3):** detect new completed lines on final card → line glow (exists) + in-place toast;
  call `recordBingoReward()`; track tier (1st / 2nd / blackout) per card year in localStorage.
- **Capacity nudge (PM11.3):** `goal-capacity.ts` — committed = sum estimates on linked tasks; available = weekly
  target (category-settings default); soft banner in panel at ≥130%.

**Acceptance:** finalize flow includes spelling ghosts; locked card opens goal panel with milestones + task link;
list mode manages same goals; first bingo line toast fires + stub reward; capacity over-commit shows soft nudge.
**Size: L.** **Branch:** `feat/plan-pb1-bingo-panel`.

---

### PB2 · Year view — quarter cards, heatmap, light placement

**Implements:** PM-2, PM2-1–4, ET-3. **Replace `PlanHorizonPlaceholder` for `year`.**

- Quarter cards with theme snippet + proportional balance bar; per-week scroll with dominant-color dots.
- **Actual-only** encoding from completed-task / time aggregation (Phase 2 substrate or lightweight count fallback).
- Unplaced-goals tray + drag/tap-to-assign quarter (`updateGoal` target fields).
- Calm neglected-category callout; full strips on quarter drill-in (breadcrumb zoom).

**Acceptance:** Year tab shows four quarter cards with heat encoding; dragging a goal onto Q2 sets its horizon;
breadcrumb zoom into quarter works. **Size: L.** **Depends on:** foundation tRPC (exists).

---

### PB3 · Quarter view — theme + ghosted month spread

**Implements:** PM-3, PM3-1–2b, ET-1.

- Theme phrase + focus-category chips (`upsertQuarterTheme`).
- Three month columns; unassigned goals tray; manual drag assign.
- AI-proposed month spread as `GhostedAccept` ghosts (`surface: quarter_spread`).

**Acceptance:** theme saves; ghost spread stages/applies via Apply; manual drag still works. **Size: M–L.**

---

### PB4 · Month view — intentions, calendar toggle, reserved days

**Implements:** PM-4, PM4-1–3, ET-2, ET-4.

- Five category intention lines (always shown, empty = "—").
- List default / calendar toggle.
- Reserved-day slots → ghosted date suggestions → suggested protected blocks on accept.

**Acceptance:** intentions persist per category; reserved day accept creates protected-block suggestion row. **Size: L.**

---

### PB5 · Week in `/plan` — embed WeekCanvas + plan-mode rail

**Implements:** PM5-1–3. **Unify with `/this-week` view — no duplicate canvas.**

- Week tab renders `WeekCanvas` scoped to breadcrumb week.
- `PlanModeToggle` reveals planning rail + `WeekDraftPanel` (ghosted AI draft).
- Today's column handoff unchanged (scheduling sets date).

**Acceptance:** `/plan` Week tab matches `/this-week` execution view; plan-mode toggle exposes draft rail;
breadcrumb week scopes columns. **Size: M.** **Depends on:** Week foundation (built).

---

### PB6 · Balance pass (PM-6)

**Implements:** PM6-1–3.

- Auto-trigger at end of planning session (week/month horizon exit — hook in `PlanHorizonView` or week canvas).
- Two-tier: floor (near-zero) then target gap; rank floor above target.
- Sources: `fetchAbyssBalanceCandidates()` stub + generated suggestions; all ghosted via `GhostedAccept`.
- Always dismissible; never blocks navigation.

**Acceptance:** finishing a week planning session surfaces balance pass chip; floor category flagged first;
accept/dismiss/apply follows GA pattern. **Size: M.**

---

### PB7 · Check-in shell (PM-7)

**Implements:** PM7-1, PM7-3, PM7-4.

- Entry affordance on `/plan` (and optionally global); cadence set/snooze in settings or inline.
- Small-bite scope picker each run; mock AI conversation OK until §11 persona.
- Proposals persist as `planning_suggestions` (`surface: check_in`); apply via ghosts.

**Acceptance:** user can open Check-in, pick scope, see ghosted proposals, stage + Apply; cadence snooze persists.
**Size: M–L.** **Parallel with PB2–PB6 OK** (planning-mode §12).

---

### PB8 · Zoom motion (NAV-4 + AN-P1) + polish pass

**Implements:** AN-P1, AN-P2, AN-P2b. **Last — after surfaces stable + motion tokens on main (TD6/#95).**

- Breadcrumb/switcher navigation: **zoom-grow ~240ms** (`--motion-medium`); reduced-motion → opacity fade.
- Line-bingo gentle bounce (AN-P2); blackout card bounce + finale copy (AN-P2b).
- Token sweep: replace any remaining legacy `kash-*` / `glass-*` in plan surfaces.

**Acceptance:** zoom between Year→Quarter→Month→Week feels depth-aware; reduced-motion users get fades only;
Bingo line completion bounces once. **Size: S–M.** **Depends on:** PB1–PB5 surfaces, TD6 motion tokens.

---

## Sequencing & dependencies

```
PB1 (Bingo finish)     ─ independent; ship first
PB2 (Year)             ─ independent after foundation
PB3 (Quarter)          ─ benefits from PB2 breadcrumb zoom; can parallel PB2 tail
PB4 (Month)            ─ parallel with PB3
PB5 (Week in /plan)    ─ independent of PB2–4; parallel once PB1 lands
PB6 (Balance pass)     ─ soft-depends on PB5 exit hook; stub Abyss OK
PB7 (Check-in)         ─ parallel anytime after foundation
PB8 (motion + polish)  ─ LAST; depends on TD6 tokens + plan surfaces
```

Recommended order: **PB1 → PB2 → PB3 → PB4 → PB5 → PB6 → PB7 → PB8.**

PB6 and PB7 may run in parallel with PB3–PB5 per §12 foundation fan-out.

**Integration seams (wired Jul 1 2026):**

- §10 Abyss → `fetchAbyssBalanceCandidates()` (live)
- §12 Care → `recordBingoReward()` → `care.recordBingoNourish`
- §13 Values → `value_id` on goals; About-me picker in goal panel
- §11 AI persona → mock ghost payloads in `planning_suggestions` until persona breadth complete
- §14 Task tags → deferred; see `planning-mode.md` §13.7 + `data-spine-build-spec.md` Phase 5

---

## Branch workflow (each phase)

```bash
git fetch origin && git status && test ! -d .git/rebase-merge
git checkout -b feat/plan-pbN-… origin/main
# … implement PBn only …
npm run typecheck && npm run lint && npm run test:run
git commit -m "feat(plan): … (PBn)"
gh pr create   # rebase onto origin/main before push
```

Do not stage unrelated `kash-3.0-*.md` / `.html` from other sessions.
