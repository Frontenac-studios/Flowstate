# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. The **working checklist**: what's built, what's spec'd-and-ready, and what still needs decisions. **Last synced: Jun 22 2026.**

---

## 0. The core distinction

The **product-direction layer** (the hard, irreversible forks) is now **almost entirely decided.** What remains is mostly **building** plus a few **decision pockets** (Care/garden, Mechanics, Animation). Per-feature, the split is:

- **Product decisions** — forks only you can make. Down to a short list now.
- **Spec detail** — schemas, component props, prompt text. Draftable / drafted.

---

## 0.5 Current code state (verified Jun 22 2026, via git)

The build has moved well past the foundation:

- **Design Tokens — in build.** `feat(design-tokens): flat-calm token system + urgency ramps + lens engine` (#65). The flat-calm system is replacing the legacy glass tokens. Spec: `kash-3.0-design-tokens.md`.
- **Life Categories (data spine Phase 1) — built.** Enum → `body_mind`, `tasks.category` NOT NULL, the Model-C resolver with **hosted** category inference, `category_settings` table + router + editor, composer accent bar, task-row stripe, sync.
- **Task-views / lens engine — in active build** (VF-1…VF-4c): filter + group application, real phase-ramp color, urgency ramps, inbox minimal lenses, projects priority lens. This is the Today/Week/Projects **visualization** layer.
- **Navigation shell — in build** (PR #55): overlay rail, ⌘J chat, command palette, Tauri parity. _(Planning Mode revised nav: a "Plan" rail item with a Week↔Month↔Quarter↔Year zoom, and **Bingo as its own separate rail item**.)_
- **Not yet built (no tables):** time-tracking aggregation, `task_dependencies`, `task_recurrence`, abyss, care/wellbeing/garden, goals, values/about-me. `/abyss` and `/care` remain shells.

**Implication:** the foundation (categories, tokens, nav, task-views) is going in; the **net-new feature surfaces** (Abyss, Planning Mode, Values, Care, AI persona refactor) are **spec'd but unbuilt.**

---

## 1. The recurring spec dimensions

The subsections that recur in every feature build — a checklist:

| #   | Dimension                     | The question it answers                                               |
| --- | ----------------------------- | --------------------------------------------------------------------- |
| 1   | **Data model**                | What tables/fields/relationships and migrations?                      |
| 2   | **Placement & IA**            | Where in nav, what route, what sub-views?                             |
| 3   | **Core flows & interactions** | Primary actions — create, edit, drag, complete?                       |
| 4   | **Visual & components**       | Layout, components, look. (Now governed by the Design Tokens system.) |
| 5   | **AI behavior**               | Which register acts, what it does, autonomy tier, tools.              |
| 6   | **States & edge cases**       | Empty / loading / error / first-run.                                  |
| 7   | **Integration**               | Category, balance, time-tracking, sync/RLS.                           |
| 8   | **Motion**                    | Animations (the final, app-wide pass).                                |

---

## 2. Maturity matrix

**Legend:** ✅ decided · 🟡 partial · 🔴 open · ⬜ not started · ⬛ built · 🏗️ in active build

| Feature               | Product forks | Build spec                    | In code | Remaining                                                       |
| --------------------- | ------------- | ----------------------------- | ------- | --------------------------------------------------------------- |
| §4 Navigation         | ✅            | ✅                            | 🏗️      | finish shell; add Bingo rail item                               |
| §5 Design Tokens      | ✅            | ✅ `design-tokens.md`         | 🏗️      | roll flat-calm tokens across components                         |
| §2 Life Categories    | ✅            | ✅                            | ⬛      | done (minor polish)                                             |
| §14 Task & Data Model | ✅            | ✅ `data-spine-build-spec.md` | 🟡      | **build** Phases 2–4 (time-agg, dependencies, recurrence)       |
| §6 Today              | ✅            | 🟡                            | 🏗️      | calendar "living record" + balance bar; lens engine in build    |
| §7 Week               | ✅            | 🟡                            | 🟡      | protected blocks, per-category load, weekly review              |
| §8 Planning Mode      | ✅            | ✅ `planning-mode.md`         | ⬜      | **build**                                                       |
| §9 Projects           | ✅            | 🟡                            | ⬛ core | templating engine                                               |
| §10 The Abyss         | ✅            | ✅ `abyss-build-spec.md`      | ⬜      | **build**                                                       |
| §11 AI persona        | ✅            | ✅ `ai-persona-build-spec.md` | 🟡      | refactor to registers + confirm-card tools                      |
| §13 Values & Context  | ✅            | ✅ `values-context.md`        | ⬜      | **build** (owns the About-me doc)                               |
| §12 Self-Care / Care  | ✅            | ✅ `care-build-spec.md`       | ⬜      | **build** (stats-first → garden last)                           |
| §15 Mechanics         | ✅            | ✅ (§15 plan)                 | ⬜      | desktop-app fallback · simple controls · ephemeral celebrations |
| Animation pass        | ⚪            | ⚪                            | ⬜      | final phase                                                     |

---

## 3. Where things actually stand

### Built or in active build

§2 Categories (done) · §5 Design Tokens · §4 Navigation · the task-views/lens engine (Today/Week/Projects visualization) · §9 Projects core.

### Spec'd & build-ready — no more decisions, just build

These each have a build spec; hand them to a build session:

- **§14 data spine Phases 2–4** — time-tracking aggregation, dependencies, recurrence (`data-spine-build-spec.md`).
- **§8 Planning Mode** (`planning-mode.md`).
- **§10 The Abyss** (`abyss-build-spec.md`).
- **§13 Values & Context** — incl. the About-me doc (`values-context.md`).
- **§11 AI persona** — register refactor + confirm-card tool catalog (`ai-persona-build-spec.md`).
- **§12 Care / Self-Care** — full Phases 1–8 (`care-build-spec.md`); stats-first, garden last.

### Still needs decisions

- **Animation pass** — page-by-page motion, deliberately last (after build + Design Tokens).

**Headline:** feature planning is **complete.** Every feature is built or has a build spec; the only remaining decision work is the **Animation pass**, which is meant to come last. The app is fully in a **building** phase.

---

## 4. Recommended order from here

**Build track** (no decisions needed): finish Design Tokens rollout + Nav → data spine **Phases 2–4** → then the spec'd surfaces (Values/About-me → AI persona → Abyss → Planning Mode → Care), each off its build spec.

**Decision track** (done bar one): only the **Animation pass** remains — and it's meant to run last, after the surfaces are built and Design Tokens are rolled out.

---

## 5. The document set

- `kash-3.0-plan.md` — the master spec (all features + decisions).
- `kash-3.0-build-breakdown.md` — this tracker.
- Build specs: `data-spine-build-spec.md` · `abyss-build-spec.md` · `ai-persona-build-spec.md` · `care-build-spec.md` · `planning-mode.md` · `values-context.md` · `design-tokens.md`.
- `kash-3.0-data-spine.md` — the data-spine decision log.
- `kash-3.0-backend-optimization-spec.md` — the Jun 24 architecture/latency pass (sync batching + bounded pull, indexing, outbox/storage, AI-seam latency); a **parallel track**, fixed as each feature phase touches the code.
- Claude Design kit: `design-brief.md` · `design-system-starter.md` · `design-prompt-today.md`.
- `kash-3.0-PROJECT-SETUP.md` — mobile/Project setup kit.

A feature is **build-ready** when dimensions 1–3, 5–7 are ✅ in its spec; tokens (§5) and motion (animation pass) are global layers.
