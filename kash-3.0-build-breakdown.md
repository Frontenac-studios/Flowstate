# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. The **working checklist**: what's built, what's spec'd-and-ready, and what still needs decisions. **Last synced: Jun 25 2026 (P4 recurrence + Week protected blocks).**

---

## 0. The core distinction

The **product-direction layer** (the hard, irreversible forks) is now **almost entirely decided.** What remains is mostly **building** plus a few **decision pockets** (Care/garden, Mechanics, Animation). Per-feature, the split is:

- **Product decisions** — forks only you can make. Down to a short list now.
- **Spec detail** — schemas, component props, prompt text. Draftable / drafted.

---

## 0.5 Current code state (verified Jun 25 2026, via git)

The build has moved well past the foundation:

- **Design Tokens — in build, palette REVISED.** `feat(design-tokens): flat-calm token system + urgency ramps + lens engine` (#65) is in code, but the **flat-calm gray palette was overhauled Jun 24 → black-and-white** (the gray canvas read "too gray"). New direction: pure-white surfaces, near-black ink `#16181d`, **black accent + outline buttons**, color reserved for category stripes. PR1 token swap largely landed in `src/styles/tokens.css`; PR2a glass mostly flat. _Left:_ PR2b outline-primary button audit across surfaces. Specs: `kash-3.0-design-tokens.md` (updated) + `kash-3.0-visual-redesign.md` (the redesign log).
- **Life Categories (data spine Phase 1) — built.** Enum → `body_mind`, `tasks.category` NOT NULL, the Model-C resolver with **hosted** category inference, `category_settings` table + router + editor, composer accent bar, task-row stripe, sync.
- **Data spine Phases 2–4 — built (Jun 25).** Phase 2 time-tracking substantially built (`task_time_entries` on any task, manual CRUD, `weeklyRollup`). Phase 3 dependencies built (revised many-blockers design). **Phase 4 recurrence ✅** — `task_recurrence` + `task_occurrence_overrides`, `src/lib/recurrence/expand.ts`, tRPC recurrence router, virtual occurrences in Today/Week, composer shorthand + ↻ chip, task-detail Repeat presets, week drag reschedule/skip (`drizzle/0014_vengeful_randall.sql`).
- **Week protected blocks — data + basic UI built (Jun 25).** `protected_block_templates` + `protected_blocks` (`proposed` | `confirmed`), tRPC CRUD + `proposeFromTemplates` / `confirmProposedForWeek`, Week column chips + add flow, Today all-day chips above timeline (`drizzle/0015_yummy_moondragon.sql`). _Not yet:_ Settings template editor, timed blocks on Today timeline, over-commit load counting, per-column tally on hover/tap, AI week-draft respecting protected blocks.
- **Task-views / lens engine — built** (VF-1…VF-4c): filter + group application, real phase-ramp color, urgency ramps, inbox minimal lenses, projects priority lens. This is the Today/Week/Projects **visualization** layer.
- **Navigation shell — in build** (PR #55): overlay rail, chat, command palette, Tauri parity. _(Finalized Jun 25: one "Plan" rail item with a Week↔Month↔Quarter↔Year↔**Bingo** switcher — Bingo is a **Plan sub-view, not its own rail item**. Routes Today→`/today`, Plan→`/plan`. Chat = collapsed, ⌘/ gray "Ask Claude" chip → push panel. Mobile = hamburger drawer. New Lucide icon set; active nav = gray pill.)_
- **Not yet built (feature UI):** abyss, care/wellbeing/garden, values/about-me. **Planning foundation ✅ (Jun 25)** — schema + `/plan` shell + GhostedAccept + tRPC CRUD; horizon page UIs still placeholder. `/abyss` and `/care` remain shells.

**Implication:** the **data spine is complete**; Week §7 still needs polish (load/tally/review/AI). **Planning foundation is in code** (schema + `/plan` shell); horizon page UIs and cross-feature integration remain. Other net-new surfaces (Abyss, Values, Care, AI persona refactor) are spec'd with placeholder or no UI.

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

| Feature               | Product forks | Build spec                    | In code   | Remaining                                                                                                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------- | ----------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §4 Navigation         | ✅            | ✅                            | ⬛ mostly | **built Jun 25** (PRs on `feat/projects-index-bw-progress`): new icon set + gray active pill, "Ask Claude" chip + ⌘/, label "Week", Settings top tabs, mobile hamburger drawer. Routes Today→/today & Plan→/plan already shipped. _Left:_ Bingo Plan-tab (deferred to Bingo build)                                                                                          |
| §5 Design Tokens      | ✅            | ✅ `design-tokens.md` (B&W)   | 🏗️        | **swap gray→B&W neutrals**, then roll across components                                                                                                                                                                                                                                                                                                                     |
| Visual redesign (B&W) | ✅            | ✅ `visual-redesign.md`       | ⬜        | apply B&W + active-states + per-page layouts (mockup is the ref)                                                                                                                                                                                                                                                                                                            |
| §2 Life Categories    | ✅            | ✅                            | ⬛        | done (minor polish)                                                                                                                                                                                                                                                                                                                                                         |
| §14 Task & Data Model | ✅            | ✅ `data-spine-build-spec.md` | ⬛        | **re-baselined Jun 25:** P1 (category) ✅, P2 (time-tracking) 🟡 substantially built, P3 (dependencies) ✅, **P4 (recurrence) ✅** (4A–4G shipped — `rrule`, expand util, virtual occurrences, composer shorthand, sync). _Tail:_ full Repeat picker (custom ends/interval), `editOccurrence` UI on plan rows                                                               |
| §6 Today              | ✅            | 🟡                            | 🏗️        | open Qs closed Jun 25 (adaptive calendar window + auto-scroll-now; planned, Top-3-weighted balance bar; wind-down anchor → Top-3 deadline + soft EoD nudge; thin completion markers); build living record + balance bar; **all-day protected chips ✅**                                                                                                                     |
| §7 Week               | ✅            | 🟡                            | 🏗️        | open Qs closed Jun 25. **Protected blocks ✅** (templates + instances, Week chips, Today all-day chips, propose/confirm). _Left:_ per-column tally on hover/tap, learned over-commit warning (+ protected blocks in load), Settings template editor, timed protected blocks on Today timeline, AI week-draft respecting protected blocks, EoW review chip                   |
| §8 Planning Mode      | ✅            | ✅ `planning-mode.md`         | 🏗️        | **foundation built Jun 25** — schema + sync + RLS + `/plan` 5-tab shell + breadcrumb + GhostedAccept + tRPC CRUD. _Parallel next:_ Bingo · Year · Quarter · Month · Week plan-mode · balance pass                                                                                                                                                                           |
| §9 Projects           | ✅            | 🟡                            | ⬛ core   | open Qs closed Jun 25 (templating = explicit save + AI-suggest; estimates silent until n≈3; multi-project calendar = category/project toggle, default category; **% progress = weighted task-weight ratio per §2** — closes the deferred completion-metric). Build: templating engine, completion metric, calendar toggle (needs distinct project-hue set in Design Tokens) |
| §10 The Abyss         | ✅            | ✅ `abyss-build-spec.md`      | ⬜        | **build**                                                                                                                                                                                                                                                                                                                                                                   |
| §11 AI persona        | ✅            | ✅ `ai-persona-build-spec.md` | 🟡        | refactor to registers + confirm-card tools                                                                                                                                                                                                                                                                                                                                  |
| §13 Values & Context  | ✅            | ✅ `values-context.md`        | ⬜        | **build** (owns the About-me doc)                                                                                                                                                                                                                                                                                                                                           |
| §12 Self-Care / Care  | ✅            | ✅ `care-build-spec.md`       | ⬜        | **build** (stats-first → garden last)                                                                                                                                                                                                                                                                                                                                       |
| §15 Mechanics         | ✅            | ✅ (§15 plan)                 | ⬜        | desktop-app fallback · simple controls · ephemeral celebrations                                                                                                                                                                                                                                                                                                             |
| Animation pass        | ⚪            | ⚪                            | ⬜        | final phase                                                                                                                                                                                                                                                                                                                                                                 |

---

## 3. Where things actually stand

### Built or in active build

§2 Categories (done) · §14 data spine P1–P4 (done) · §7 protected blocks (data + basic UI) · §5 Design Tokens · §4 Navigation · the task-views/lens engine (Today/Week/Projects visualization) · §9 Projects core.

### Spec'd & build-ready — no more decisions, just build

These each have a build spec; hand them to a build session:

- **§14 data spine tail** — time-tracking aggregation polish, recurrence Repeat-picker refinements (`data-spine-build-spec.md`).
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

**Headline:** feature planning, the visual redesign, **and global navigation** are all **complete.** The **data spine (Phases 1–4) is built**; Week protected blocks have data + basic UI. Every remaining feature has a build spec, the B&W palette is locked, all nine pages are wireframed, and the nav layer is fully decided. Remaining work: Week polish (load/tally/review), B&W PR2b, a few accent states, per-feature UX detail, the garden-art spike, and the final Animation pass. The app is fully in a **building** phase.

---

## 4. Recommended order from here

**Build track** (no decisions needed): **B&W PR2b** (outline-primary audit) + finish Design Tokens rollout + Nav polish → **Week §7 polish** (tally-on-demand, over-commit load, EoW review chip, Settings protected-block templates, AI week-draft) → then the spec'd surfaces (Values/About-me → AI persona → Abyss → Planning Mode → Care), each off its build spec. Use `kash-3.0-mockups.html` as the visual reference.

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
