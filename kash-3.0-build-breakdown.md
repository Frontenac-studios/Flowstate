# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. The **working checklist**: what's built, what's spec'd-and-ready, and what still needs decisions. **Last synced: Jul 1 2026 (post Phases 0–6 + waves 1–4 on `main`).** All product/design forks closed Jul 1; **~85% of the 3.0 build is now in code.** Entry-point snapshot: `docs/build-status.md`. Consolidated backlog: `kash-3.0-remaining-build.md`.

---

## 0. The core distinction

The **product-direction layer** (the hard, irreversible forks) is **fully decided (Jul 1 2026).** The **major build wave shipped** (Phases 0–6 on `main`); what remains is **tail + polish** — task tags schema, projects/AI micro-gaps, garden illustration art, legacy cleanup. Per-feature:

- **Product decisions** — forks only you can make. Down to a short list now.
- **Spec detail** — schemas, component props, prompt text. Draftable / drafted.

---

## 0.5 Current code state (verified Jul 1 2026, post Phases 0–6 on `main`)

The **major 3.0 build wave is largely complete.** Phases 0–6 and waves 1–4 merged to `main`:

- **Design Tokens — built (🟡 cleanup).** B&W palette in `src/styles/tokens.css` (#124 Phase 0): ink `#16181d`, category hexes, motion tokens, focus ring, z-index scale, `lucide-react`. Accent states wired on task checkboxes, Top-3 stars, links. Legacy `glass.css` still imported for `--kash-*` aliases — no `glass-panel` usage in Kash components.
- **Life Categories — built.** `tasks.category` NOT NULL, Model-C inference, `category_settings`, composer accent, stripes, sync.
- **Data spine Phases 1–4 — built.** Category, time entries, dependencies (revised many-blockers), recurrence + virtual occurrences, protected blocks (templates + instances). **Tail:** task **tags** (decided v1, schema not yet added).
- **Navigation — built.** Grouped rail, `/today` + `/plan`, chat push panel + ⌘/, hamburger drawer, Settings top tabs, sync footer dot.
- **Today §6 — built.** TD1–TD6: balance bar, adaptive timeline, living record, wind-down, completion choreography, arrival motion (`TodayList` AN-T2).
- **Week §7 — built.** Priorities (`week_day_priorities`), tally-on-demand (`ColumnTallyPopover`), learned over-commit (`OverCommitFlag`), protected blocks (Week + Today timed grid), default-week editor (`DefaultWeekSection`), EoW chip (`EowReviewRunner`), AI week-draft respects protected blocks.
- **Planning §8 — built.** Year / Quarter / Month / Week / Bingo views live in `PlanHorizonView`; balance pass + check-in providers; bingo goal panel, list mode, onboarding, spelling pass, line rewards → `care.recordBingoNourish`.
- **Projects §9 — mostly built.** Miller + gallery, multi-project calendar toggle, save/apply templates, weighted % progress, fold-to-filed animation. **Left:** AI “save as template?” on completion, duration-estimate confidence UI.
- **Abyss §10 — built.** Sky + list, capture (⌘⇧A), archive, monthly review, promote, embeddings.
- **Care §12 — mostly built.** All tabs: procedural garden (`GardenScene`), Finch library (`CareTasks`), breathing, reflection, stats, travel. **Left:** custom illustration art (procedural stand-in shipped).
- **Values / About-me §13 — built.** Settings About tab: values, constraints, prose, ghosted suggestions.
- **AI persona §11 — mostly built.** Confirm-card, proposed-action pipeline, expanded tool catalog, hybrid About-me update UX (Settings ghosted rows + chat confirm-card). **Left:** full write-tool catalog audit.
- **Daily Wins — built.** `daily_wins` table, EoD tracker, garden nourish hooks.
- **Mechanics §15 — built.** Ephemeral celebrations, sync dot, notification settings, sync detail panel.
- **Animation pass — mostly built.** Stripe-resolving, project fold, sync pulse, bingo lock, page cross-fade, week/care motion CSS.

**Implication:** planning is done; build is in **tail + polish**. See `docs/build-status.md` and `kash-3.0-remaining-build.md`.

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

| Feature               | Product forks | Build spec                                             | In code | Remaining                                                                |
| --------------------- | ------------- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------------ |
| §4 Navigation         | ✅            | ✅                                                     | ⬛      | —                                                                        |
| §5 Design Tokens      | ✅            | ✅ `design-tokens.md`                                  | 🟡      | Retire legacy `glass.css` import when safe                               |
| Visual redesign (B&W) | ✅            | ✅ `visual-redesign.md`                                | ⬛      | Applied in Phase 0 (#124)                                                |
| §2 Life Categories    | ✅            | ✅                                                     | ⬛      | —                                                                        |
| §14 Task & Data Model | ✅            | ✅ `data-spine-build-spec.md`                          | 🟡      | **Task tags** (decided v1, not in schema); Repeat picker polish optional |
| §6 Today              | ✅            | ✅ `today-build-plan.md`                               | ⬛      | —                                                                        |
| §7 Week               | ✅            | ✅ `week-build-plan.md`                                | ⬛      | —                                                                        |
| §8 Planning Mode      | ✅            | ✅ `planning-mode.md`                                  | ⬛      | Ongoing horizon polish; core shipped                                     |
| §9 Projects           | ✅            | ✅ `projects-miller.md`                                | 🟡      | AI template-suggest on completion; estimate-confidence UI                |
| §10 The Abyss         | ✅            | ✅ `abyss-build-spec.md`                               | ⬛      | —                                                                        |
| §11 AI persona        | ✅            | ✅ `ai-persona-build-spec.md`                          | 🟡      | Full write-tool audit                                                    |
| §13 Values & Context  | ✅            | ✅ `values-context.md`                                 | ⬛      | —                                                                        |
| §12 Self-Care / Care  | ✅            | ✅ `care-build-spec.md` + `care-library-build-plan.md` | 🟡      | Custom garden illustration art (procedural garden live)                  |
| §15 Mechanics         | ✅            | ✅ (§15 plan)                                          | ⬛      | —                                                                        |
| Animation pass        | ✅            | ✅ `animation-sweep.md`                                | 🟡      | Residual token audit; optional polish                                    |
| 3 Daily Wins          | ✅            | ✅ `daily-wins-build-spec.md`                          | ⬛      | —                                                                        |

---

## 3. Where things actually stand

### Decisions — done

All product/design forks closed **Jul 1 2026**, including final micro-decisions: flat 3–7 values (not ranked), future-only About-me edits, hybrid About-me update UX, Daily Wins facet labels (Body · Mind · Soul), self-care cadence, and low-stakes defaults (Abyss archive/taxonomy, sync panel D2, procedural garden art, values nudge vs urgency, goals-only `value_id`, PM-A year view, inline destructive confirm-card). **Build-only remainder:** task **tags** schema (§14 — decided v1, not yet in schema).

### Specing — done

Every feature area has an authoritative build spec. No area lacks an implementation guide.

### Build — ~85% shipped (Phases 0–6 + waves 1–4 on `main`)

**Built:** §2 Categories · §4 Nav · §6 Today · §7 Week · §8 Planning horizons · §10 Abyss · §13 Values/About-me · Daily Wins · §15 Mechanics · lens engine · task-views.

**Mostly built (tail work):** §5 Design tokens (glass.css cleanup) · §9 Projects (AI template-suggest, estimate UI) · §11 AI persona (write-tool audit) · §12 Care (custom garden art — procedural stand-in live) · §14 Data spine (tags) · animation pass (residual polish).

**Entry point:** `docs/build-status.md`.

### Closed Jul 1 (product/design forks)

Bespoke animations, accent states, AI confirm-card UX, garden-art direction — all resolved and largely implemented in Phases 0–6.

**Headline (Jul 1 2026):** **Planning is done.** The app has moved from **building** to **tail + polish**. See `kash-3.0-remaining-build.md`.

---

## 4. Recommended order from here

**Tail track** (no major decisions): **task tags** (§14) → **Projects tail** (AI template-suggest, estimate confidence) → **garden illustration art** → **legacy glass.css cleanup** → **backend optimization** (parallel, fix-as-you-touch per `backend-optimization-spec.md`).

---

## 5. The document set

- **`docs/build-status.md`** — one-page entry point (decisions / specing / build snapshot).
- `kash-3.0-plan.md` — the master spec (all features + decisions).
- `kash-3.0-build-breakdown.md` — this tracker.
- Build specs: `data-spine-build-spec.md` · `abyss-build-spec.md` · `ai-persona-build-spec.md` · `care-build-spec.md` · `planning-mode.md` · `values-context.md` · `design-tokens.md` · `projects-miller.md` · `animation-sweep.md` · `daily-wins-build-spec.md`.
- Build-finish plans: `today-build-plan.md` (TD1–TD6) · `week-build-plan.md` (WD1–WD7).
- `kash-3.0-data-spine.md` — the data-spine decision log.
- `kash-3.0-backend-optimization-spec.md` — the Jun 24 architecture/latency pass (sync batching + bounded pull, indexing, outbox/storage, AI-seam latency); a **parallel track**, fixed as each feature phase touches the code.
- Claude Design kit: `design-brief.md` · `design-system-starter.md` · `design-prompt-today.md` (all updated to B&W Jun 24).
- Visual redesign: `kash-3.0-visual-redesign.md` (decision log) · `kash-3.0-mockups.html` (9-page reference mockup) · context studies (`active-states`, `context-segmented`, `context-settingsnav`, `week-layout`, `week-inverted`).
- Nav finalization studies (Jun 25): `nav-bingo`, `nav-chatrail`, `nav-chattoggle(-v2)`, `nav-icons`, `nav-icon-picker`, `nav-mobile`.
- `kash-3.0-PROJECT-SETUP.md` — mobile/Project setup kit.

A feature is **build-ready** when dimensions 1–3, 5–7 are ✅ in its spec; tokens (§5) and motion (animation pass) are global layers.
