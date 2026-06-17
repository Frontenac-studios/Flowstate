# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. This is the **working checklist** for finishing the spec and building. It answers two questions: _what recurring decisions does every feature need?_ and _which parts are nearly done vs. which need focused breakdown?_

---

## 0. The core distinction (read this first)

So far we've decided the **product-direction layer** — the hard, mostly-irreversible _forks_ (one nav model, strict-MECE categories, recurrence architecture, tiered-autonomy AI, the day-timeline model, etc.). That's the expensive-to-change stuff, and it's largely done.

What remains splits into two very different kinds of work:

- **Product decisions** — forks that still change _what gets built_, and that only you can make (e.g., how the garden grows, the year-view shape). These need **focused sessions**.
- **Spec detail** — mechanical, derivable specifics (schemas, component props, empty/error states, microcopy, AI prompt text). These I can **draft for you to review** — they don't need a decision meeting.

Most features are now **concept-complete but spec-incomplete.** The trick is to spend your decision energy only where a real product fork remains, and let the rest be drafted.

---

## 0.5 Current code state (verified Jun 2026)

A repo scan shows building has **already started on the navigation shell** we spec'd:

- **Navigation shell — in active build** (PR #55 `feat/global-nav-shell`): narrow overlay rail that peeks/expands, chat moved to `⌘J`, command palette, Tauri parity. Matches the §4 spec; moving spec → code.
- **Routes scaffolded:** `/today` (+ `/today/focus`), `/abyss`, `/care` now exist alongside the legacy `/plan`. They have pages but **no data or logic behind them yet** — empty shells.
- **Not yet built (the gap):** `tasks` still has **no `category` column**; there are **no** `task_recurrence`, `task_occurrence_overrides`, `task_dependencies`, abyss, care/wellbeing, goals, or values tables. The data foundation under the new routes doesn't exist.

**Implication:** the _shell_ is going up, but the _foundation_ it stands on hasn't been poured. The empty `/abyss` and `/care` routes exist precisely because the data layer beneath them is missing — which points directly at what to build next (§6).

---

## 1. The recurring spec dimensions

These are the **subsections that recur in every feature build** — the predictable places a decision or a draft is needed before a feature is "done." Use them as a checklist against any feature.

| #   | Dimension                     | The question it answers                                                |
| --- | ----------------------------- | ---------------------------------------------------------------------- |
| 1   | **Data model**                | What tables/fields/relationships and migrations does it need?          |
| 2   | **Placement & IA**            | Where does it live in nav, what route, what sub-views (switcher)?      |
| 3   | **Core flows & interactions** | What are the primary actions — create, edit, drag, keyboard, complete? |
| 4   | **Visual & components**       | Layout, which components it reuses vs. needs new, how it looks.        |
| 5   | **AI behavior**               | Which mode acts here, what it does, autonomy tier, prompts/tools.      |
| 6   | **States & edge cases**       | Empty / loading / error / overflow / conflict / first-run.             |
| 7   | **Integration**               | Category, balance, time-tracking, Abyss, notifications, sync/RLS.      |
| 8   | **Motion**                    | Animations and transitions (the final, app-wide pass).                 |

Two dimensions are deliberately deferred app-wide: **#4 colors/tokens** (the Design Tokens phase) and **#8 motion** (the animation pass). So for most features, "fully spec'd" means dimensions 1–3, 5–7 are nailed, with 4 and 8 finished globally later.

---

## 2. Maturity matrix

Per feature: are the **product forks** decided, and is the **build spec** implementation-ready? Then — what's the nature of the remaining work?

**Legend:** ✅ done · 🟡 partial · 🔴 open · ⬛ already built in code · 🏗️ in active build

| Feature               | Product forks | Build spec | Remaining work is mostly…                                                                   |
| --------------------- | ------------- | ---------- | ------------------------------------------------------------------------------------------- |
| §4 Navigation         | ✅            | 🟡         | 🏗️ **In build (PR #55)** — shell + routes up; finish component spec, route naming           |
| §2 Life Categories    | ✅            | 🟡         | **Spec detail** (migration/backfill, label confirm) + colors in tokens                      |
| §14 Task & Data Model | ✅            | 🟡         | **Spec detail** (field-level schema, RRULE, override edge cases)                            |
| §11 AI Companion      | ✅            | 🔴         | **Mixed** — product (mode identity, About-me format) + heavy spec (prompts, tool catalog)   |
| §6 Today              | ✅            | 🟡         | **Spec detail** (Calendar component, escalation timing, states)                             |
| §7 Week               | ✅            | 🟡         | **Spec detail** (protected-block UX, threshold model)                                       |
| §8 Planning Mode      | 🟡            | 🔴         | **Product decisions** — year-view shape, bingo layout, balance-pass source, goal data model |
| §9 Projects           | ✅ (core ⬛)  | 🟡         | **Product** (templating engine) + spec detail                                               |
| §10 The Abyss         | ✅            | 🔴         | **Mixed** — product (cadence, expiry, capture entry) + spec (pattern logic, data model)     |
| §12 Self-Care / Care  | 🟡            | 🔴         | **Product decisions** — garden growth model + art, breathing UX, reflection design          |
| §13 Values & Context  | 🟡            | 🔴         | **Product** (values ranking, About-me editing UX) — small                                   |
| §5 Design Tokens      | 🟡            | 🔴         | **Product decisions in progress** — aesthetic, palette/accent, theming, then scales         |
| §15 Mechanics         | 🟡            | 🔴         | **Mixed** — product (web-reminder fallback) + spec (delivery + gamification engine)         |
| Animation pass        | ⚪            | ⚪         | Not started — final phase                                                                   |

---

## 3. Where things actually stand

### Nearly complete — concept locked, remaining work is spec detail I can draft

These need **no more decision sessions** (beyond tiny confirmations). I can write the build spec and you review:

- **§4 Navigation** — shell, rail, routes, migration all decided.
- **§2 Life Categories** — model, strictness, source, balance metric decided.
- **§14 Task & Data Model** — recurrence, dependencies, time-tracking architecture decided.
- **§6 Today** — timeline model, Top-3, DND, self-care interleave decided.
- **§7 Week** — protected blocks, balance viz, over-commit decided.
- **§9 Projects** — core is built; similarity/templating/nesting direction decided (templating _engine_ is the one deeper sub-spike).

### Needs focused breakdown — real product forks still open

These deserve their own **focused decision sessions**, broken into subphases:

- **§5 Design Tokens** _(in progress)_ — finish: aesthetic direction · category palette + accent · light/dark/night → then type, spacing, elevation, and a component inventory. _Unblocks every other feature's visual layer, so finish this first._
- **§8 Planning Mode** — the heaviest net-new surface. Subphases: (a) year-view shape (needs a mockup), (b) bingo-card layout + completion/reward link, (c) the balance-pass mechanics (suggest from backlog, Abyss, new tasks, or all), (d) goals/intentions data model.
- **§12 Care / the garden** — subphases: (a) garden growth model + art direction (a design spike of its own), (b) breathing-exercise UX + visualization, (c) reflection-ritual design, (d) stats/metrics spec, (e) reminder scheduling rules.
- **§11 AI persona layer** — subphases: (a) the three modes' personas + when each triggers + visual identity, (b) the About-me doc format + how the AI proposes edits, (c) the tool/action catalog (what the AI can actually _do_ per surface).
- **§10 The Abyss** — subphases: capture entry point · review cadence · pattern-detection rules · promotion UX · expiry. (Smaller than the above.)
- **§13 Values & Context** — subphases: values ranking model · About-me editing UX. (Small; rides on §11's About-me decision.)
- **§15 Mechanics** — mostly settled by reference; the one open product fork is the **web-reminder-when-closed fallback**.

---

## 4. Recommended order of remaining sessions

_These are decision sessions. The next **build** target needs no decisions — it's the data spine in §6, which can proceed in parallel with finishing Design Tokens._

1. **Finish Design Tokens (§5)** — unblocks all visual work; runs in parallel with the §6 build.
2. **Planning Mode (§8)** — biggest open surface; do it as 4 subphase mini-sessions (year-view → bingo → balance-pass → data model).
3. **Care / garden (§12)** — second-biggest; subphase it (growth model + art is its own spike).
4. **AI persona layer (§11)** — modes, About-me format, tool catalog.
5. **Abyss (§10) + Values (§13)** — quick focused passes.
6. **Spec-detail drafting** _(I draft, you review)_ — Data model schemas, Today/Week component specs, Projects templating engine, Navigation component spec.
7. **Animation pass** — last, page by page.

---

## 5. How to use this with the plan

- `kash-3.0-plan.md` = the **spec** (what each feature is and the forks decided so far).
- This file = the **map of what's left**, so you can "check for completeness" before building any feature.
- A feature is **build-ready** when dimensions 1–3 and 5–7 (§1 above) are ✅ in its plan section, with colors (§5) and motion (animation pass) handled globally.

---

## 6. What to build next — the foundation data spine

**Recommendation: build the data spine next — §2 Categories-on-tasks + §14 Task/Data-Model tables.** With the nav shell already in build, this is the true root dependency and the visible gap (the new `/abyss` and `/care` routes are empty because this layer is missing).

**Why this one, in build order (most global → buildable now):**

- **Deepest dependency.** Balance bars, week color, planning heatmaps, the garden's "balance" food, and AI rebalancing all read category + time data that doesn't exist yet. Nothing balance-related can be built until this is.
- **Concept-locked** (✅ forks in §2 and §14) — no decision sessions required. I can draft the full schema/migration spec immediately.
- **Buildable without Design Tokens.** The data layer and inheritance logic don't need colors; colors apply later when category UI renders. So tokens finish in parallel, not as a blocker.
- **Low risk, high leverage** — unblocks the "balance is the product" features the new shell will surface.

**Finish breaking it down — global → detail:**

- **Level 1 — concept (✅ done):** category = strict-MECE first-class dimension, exactly one per task; recurrence = rule + generated occurrences; dependencies = project-scoped; time-tracking on any task.
- **Level 2 — schema (draft next):**
  - `tasks.category` (`project_category` enum) `NOT NULL` + backfill
  - `task_recurrence` (start, frequency/RRULE, end: date | count | never)
  - `task_occurrence_overrides` (per-date complete / skip / reschedule)
  - `task_dependencies` (blocker_id, blocked_id, same-project constraint)
  - generalize `task_time_entries` to any task
  - category label/color overrides store (extend `app_settings` or new `category_settings`)
- **Level 3 — integration detail:** RLS per table (`auth.uid()`); Drizzle one-file-per-table; `db:generate` → review SQL before commit; SQLite/offline-sync parity; project→task category inheritance + override; loose-task backfill; blocked-task RDM behavior.
- **Level 4 — acceptance:** every task carries a category end-to-end; recurring tasks generate occurrences; dependencies block; time tracks on any task; all RLS-scoped; migration reviewed; TS types regenerated.

**Tiny confirmations to make while building (non-blocking):** final category labels · balance weighting (count vs Top-3-weighted) · backfill method (AI vs manual) · recurrence-end options · blocked-task RDM (hide vs flag).

**Then, in order:** (1) finish Design Tokens so category color + balance visuals can render → (2) wire Today's category-aware timeline + balance bar onto the new spine → (3) the balance-dependent features (Week color, Planning balance-pass, Care garden food).
