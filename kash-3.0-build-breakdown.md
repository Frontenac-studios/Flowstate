# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. The **working checklist**: what's built, what's spec'd-and-ready, and what still needs decisions. **Last synced: Jun 25 2026.**

---

## 0. The core distinction

The **product-direction layer** (the hard, irreversible forks) is now **almost entirely decided.** What remains is mostly **building** plus a few **decision pockets** (Care/garden, Mechanics, Animation). Per-feature, the split is:

- **Product decisions** — forks only you can make. Down to a short list now.
- **Spec detail** — schemas, component props, prompt text. Draftable / drafted.

---

## 0.5 Current code state (verified Jun 22 2026, via git)

The build has moved well past the foundation:

- **Design Tokens — in build, palette REVISED.** `feat(design-tokens): flat-calm token system + urgency ramps + lens engine` (#65) is in code, but the **flat-calm gray palette was overhauled Jun 24 → black-and-white** (the gray canvas read "too gray"). New direction: pure-white surfaces, near-black ink `#16181d`, **black accent + outline buttons**, color reserved for category stripes. The token build needs to swap the gray/graphite neutrals for the B&W values before further rollout. Specs: `kash-3.0-design-tokens.md` (updated) + `kash-3.0-visual-redesign.md` (the redesign log).
- **Life Categories (data spine Phase 1) — built.** Enum → `body_mind`, `tasks.category` NOT NULL, the Model-C resolver with **hosted** category inference, `category_settings` table + router + editor, composer accent bar, task-row stripe, sync.
- **Task-views / lens engine — in active build** (VF-1…VF-4c): filter + group application, real phase-ramp color, urgency ramps, inbox minimal lenses, projects priority lens. This is the Today/Week/Projects **visualization** layer.
- **Navigation shell — in build** (PR #55): overlay rail, chat, command palette, Tauri parity. _(Finalized Jun 25: one "Plan" rail item with a Week↔Month↔Quarter↔Year↔**Bingo** switcher — Bingo is a **Plan sub-view, not its own rail item**. Routes Today→`/today`, Plan→`/plan`. Chat = collapsed, ⌘/ gray "Ask Claude" chip → push panel. Mobile = hamburger drawer. New Lucide icon set; active nav = gray pill.)_
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

| Feature               | Product forks | Build spec                    | In code | Remaining                                                                                                                                                                                                                                     |
| --------------------- | ------------- | ----------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4 Navigation         | ✅            | ✅                            | 🏗️      | finish shell; routes Today→/today, Plan→/plan; chat=⌘/ chip+push panel; mobile=drawer; new icon set; nav-active=gray pill                                                                                                                     |
| §5 Design Tokens      | ✅            | ✅ `design-tokens.md` (B&W)   | 🏗️      | **swap gray→B&W neutrals**, then roll across components                                                                                                                                                                                       |
| Visual redesign (B&W) | ✅            | ✅ `visual-redesign.md`       | ⬜      | apply B&W + active-states + per-page layouts (mockup is the ref)                                                                                                                                                                              |
| §2 Life Categories    | ✅            | ✅                            | ⬛      | done (minor polish)                                                                                                                                                                                                                           |
| §14 Task & Data Model | ✅            | ✅ `data-spine-build-spec.md` | 🟡      | **build** Phases 2–4 (time-agg, dependencies, recurrence)                                                                                                                                                                                     |
| §6 Today              | ✅            | 🟡                            | 🏗️      | open Qs closed Jun 25 (adaptive calendar window + auto-scroll-now; planned, Top-3-weighted balance bar; wind-down anchor → Top-3 deadline + soft EoD nudge; thin completion markers); build living record + balance bar; lens engine in build |
| §7 Week               | ✅            | 🟡                            | 🟡      | protected blocks, per-category load, weekly review; layout = horizontal-scroll days, gray week + white today                                                                                                                                  |
| §8 Planning Mode      | ✅            | ✅ `planning-mode.md`         | ⬜      | **build**                                                                                                                                                                                                                                     |
| §9 Projects           | ✅            | 🟡                            | ⬛ core | templating engine                                                                                                                                                                                                                             |
| §10 The Abyss         | ✅            | ✅ `abyss-build-spec.md`      | ⬜      | **build**                                                                                                                                                                                                                                     |
| §11 AI persona        | ✅            | ✅ `ai-persona-build-spec.md` | 🟡      | refactor to registers + confirm-card tools                                                                                                                                                                                                    |
| §13 Values & Context  | ✅            | ✅ `values-context.md`        | ⬜      | **build** (owns the About-me doc)                                                                                                                                                                                                             |
| §12 Self-Care / Care  | ✅            | ✅ `care-build-spec.md`       | ⬜      | **build** (stats-first → garden last)                                                                                                                                                                                                         |
| §15 Mechanics         | ✅            | ✅ (§15 plan)                 | ⬜      | desktop-app fallback · simple controls · ephemeral celebrations                                                                                                                                                                               |
| Animation pass        | ⚪            | ⚪                            | ⬜      | final phase                                                                                                                                                                                                                                   |

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

### Visual redesign (Jun 24–25) — DONE, ready to apply

The "too gray" complaint is resolved: the palette is now **black-and-white** (white canvas, near-black ink, black accent, outline buttons; color = category stripe only). **Confirmed Jun 25** this is the wanted direction — palette locked.

- **All nine pages wireframed** (Today · Week · Projects · Plan · Focus · Abyss · Care · Bingo · Settings) — reference mockup: `kash-3.0-mockups.html`.
- **Active/selected states resolved** (replacing the old black fills): nav rail = soft gray pill · segmented controls = inset white pill (documented shadow exception) · Settings = **top tab bar** (was left rail) + inset white pill · Week "today" = inverted (gray week, white today column + white date pill), horizontal-scroll days.
- **Stale design docs updated** to B&W: `design-tokens.md`, `design-brief.md`, `design-system-starter.md`.

### Global navigation (Jun 25) — FINALIZED

All §4 open questions are now closed (recorded in `plan.md` §4 + applied to the mockup):

- **Bingo** = a Plan sub-view (5th switcher tab), **not** a rail item → rail = 6 destinations + Settings.
- **Routes:** Today → `/today`, Plan → `/plan` (legacy `/plan` redirect + link updates).
- **Chat:** collapsed by default; opened from a gray **"Ask Claude" chip** (top-right), **`⌘/`**; opens as a **push panel** (no permanent right strip).
- **Mobile/Tauri:** desktop rail as designed; narrow widths → **hamburger drawer**.
- **Rail icons (Lucide):** sun · calendar-days · folder · compass · sparkles · sprout · sliders (replaces emoji glyphs).
- **Settings:** top tab bar (active = inset-white pill).

### Still needs decisions

- **Minor accent states** — checkbox-checked, Top-3 star, link styling, focus ring (small; finish anytime).
- **Per-feature spec polish** — Today / Week / Projects still 🟡 in the matrix (UX detail, not product forks).
- **Animation pass** — page-by-page motion, deliberately last (after build + Design Tokens).
- **Care garden art** — illustrative spike (detailed garden visuals).

**Headline:** feature planning, the visual redesign, **and global navigation** are all **complete.** Every feature is built or has a build spec, the B&W palette is locked, all nine pages are wireframed, and the nav layer is fully decided. Remaining work is small polish: a few accent states, per-feature UX detail, the garden-art spike, and the final Animation pass. The app is fully in a **building** phase.

---

## 4. Recommended order from here

**Build track** (no decisions needed): **swap tokens to B&W** + finish Design Tokens rollout + Nav (apply the finalized active-states, icons, routes, chat chip, drawer) → data spine **Phases 2–4** → then the spec'd surfaces (Values/About-me → AI persona → Abyss → Planning Mode → Care), each off its build spec. Use `kash-3.0-mockups.html` as the visual reference.

**Decision track** (done bar one): only the **Animation pass** remains — and it's meant to run last, after the surfaces are built and Design Tokens are rolled out.

---

## 5. The document set

- `kash-3.0-plan.md` — the master spec (all features + decisions).
- `kash-3.0-build-breakdown.md` — this tracker.
- Build specs: `data-spine-build-spec.md` · `abyss-build-spec.md` · `ai-persona-build-spec.md` · `care-build-spec.md` · `planning-mode.md` · `values-context.md` · `design-tokens.md`.
- `kash-3.0-data-spine.md` — the data-spine decision log.
- `kash-3.0-backend-optimization-spec.md` — the Jun 24 architecture/latency pass (sync batching + bounded pull, indexing, outbox/storage, AI-seam latency); a **parallel track**, fixed as each feature phase touches the code.
- Claude Design kit: `design-brief.md` · `design-system-starter.md` · `design-prompt-today.md` (all updated to B&W Jun 24).
- Visual redesign: `kash-3.0-visual-redesign.md` (decision log) · `kash-3.0-mockups.html` (9-page reference mockup) · context studies (`active-states`, `context-segmented`, `context-settingsnav`, `week-layout`, `week-inverted`).
- Nav finalization studies (Jun 25): `nav-bingo`, `nav-chatrail`, `nav-chattoggle(-v2)`, `nav-icons`, `nav-icon-picker`, `nav-mobile`.
- `kash-3.0-PROJECT-SETUP.md` — mobile/Project setup kit.

A feature is **build-ready** when dimensions 1–3, 5–7 are ✅ in its spec; tokens (§5) and motion (animation pass) are global layers.
