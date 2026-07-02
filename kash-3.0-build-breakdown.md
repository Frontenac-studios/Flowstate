# Kash 3.0 — Build Breakdown & Spec-Maturity Tracker

> Companion to `kash-3.0-plan.md`. The **working checklist**: what's built, what's spec'd-and-ready, and what still needs decisions. **Last synced: Jul 2 2026 (Kash 3.0 complete on `feat/kash-3.0-complete`).** All original product/design forks closed Jul 1; gap-audit reassurance track built Jul 2. Entry-point snapshot: `docs/build-status.md`. Consolidated backlog: `kash-3.0-remaining-build.md`.

---

## 0. The core distinction

The **product-direction layer** (the hard, irreversible forks) is **fully decided (Jul 1 2026).** The **Kash 3.0 build shipped** (Phases 0–6, waves 1–4, gap-audit track, tail polish on `feat/kash-3.0-complete`); what remains is **optional polish** — illustrated garden assets, legacy `glass.css` cleanup, backend optimization. Per-feature:

- **Product decisions** — forks only you can make. Down to a short list now.
- **Spec detail** — schemas, component props, prompt text. Draftable / drafted.

---

## 0.5 Current code state (verified Jul 2 2026, Kash 3.0 complete)

**Kash 3.0 is complete.** Phases 0–6, waves 1–4, gap-audit reassurance track, and tail polish:

- **Design Tokens — built (🟡 cleanup).** B&W palette in `src/styles/tokens.css` (#124 Phase 0): ink `#16181d`, category hexes, motion tokens, focus ring, z-index scale, `lucide-react`. Accent states wired on task checkboxes, Top-3 stars, links. Legacy `glass.css` still imported for `--kash-*` aliases — no `glass-panel` usage in Kash components.
- **Life Categories — built.** `tasks.category` NOT NULL, Model-C inference, `category_settings`, composer accent, stripes, sync.
- **Data spine Phases 1–5 — built.** Category, time entries, dependencies, recurrence, protected blocks, **task tags**.
- **Projects §9 — built.** Miller + gallery, templates (save/apply + completion suggest), estimate-confidence hint, weighted % progress.
- **Care §12 — mostly built.** All tabs + Evidence shrine; per-species garden sprites. **Left:** optional full illustrated art.
- **AI persona §11 — built.** Confirm-card, proposed-action pipeline, write-tool catalog audited.
- **Gap-audit track — built.** Foundations (morning hand-off, nudge arbiter), Evidence, Goals progress/steering, Balance nudge, Top-3 assurance.
- **Navigation — built.** Grouped rail, `/today` + `/plan`, chat push panel + ⌘/, hamburger drawer, Settings top tabs, sync footer dot.
- **Today §6 — built.** TD1–TD6: balance bar, adaptive timeline, living record, wind-down, completion choreography, arrival motion (`TodayList` AN-T2).
- **Week §7 — built.** Priorities (`week_day_priorities`), tally-on-demand (`ColumnTallyPopover`), learned over-commit (`OverCommitFlag`), protected blocks (Week + Today timed grid), default-week editor (`DefaultWeekSection`), EoW chip (`EowReviewRunner`), AI week-draft respects protected blocks.
- **Planning §8 — built.** Year / Quarter / Month / Week / Goals views live in `PlanHorizonView`; balance pass + check-in providers; goal panel, list mode, onboarding, bingo rewards → garden nourish.
- **Abyss §10 — built.** Sky + list, capture (⌘⇧A), archive, monthly review, promote, embeddings.
- **Values / About-me §13 — built.** Settings About tab: values, constraints, prose, ghosted suggestions.
- **Daily Wins — built.** `daily_wins` table, EoD tracker, garden nourish hooks.
- **Mechanics §15 — built.** Ephemeral celebrations, sync dot, notification settings, sync detail panel.
- **Animation pass — mostly built.** Stripe-resolving, project fold, sync pulse, bingo lock, page cross-fade, week/care motion CSS.

**Implication:** Kash 3.0 is **complete**. Optional polish remains — see `docs/build-status.md` and `kash-3.0-remaining-build.md`.

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

| Feature                   | Product forks    | Build spec                                             | In code | Remaining                                                          |
| ------------------------- | ---------------- | ------------------------------------------------------ | ------- | ------------------------------------------------------------------ |
| §4 Navigation             | ✅               | ✅                                                     | ⬛      | —                                                                  |
| §5 Design Tokens          | ✅               | ✅ `design-tokens.md`                                  | 🟡      | Retire legacy `glass.css` import when safe                         |
| Visual redesign (B&W)     | ✅               | ✅ `visual-redesign.md`                                | ⬛      | Applied in Phase 0 (#124)                                          |
| §2 Life Categories        | ✅               | ✅                                                     | ⬛      | —                                                                  |
| §14 Task & Data Model     | ✅               | ✅ `data-spine-build-spec.md`                          | ⬛      | Repeat picker polish optional                                      |
| §6 Today                  | ✅               | ✅ `today-build-plan.md`                               | ⬛      | —                                                                  |
| §7 Week                   | ✅               | ✅ `week-build-plan.md`                                | ⬛      | —                                                                  |
| §8 Planning Mode          | ✅               | ✅ `planning-mode.md`                                  | ⬛      | —                                                                  |
| §9 Projects               | ✅               | ✅ `projects-miller.md`                                | ⬛      | —                                                                  |
| §10 The Abyss             | ✅               | ✅ `abyss-build-spec.md`                               | ⬛      | —                                                                  |
| §11 AI persona            | ✅               | ✅ `ai-persona-build-spec.md`                          | ⬛      | —                                                                  |
| §13 Values & Context      | ✅               | ✅ `values-context.md`                                 | ⬛      | —                                                                  |
| §12 Self-Care / Care      | ✅               | ✅ `care-build-spec.md` + `care-library-build-plan.md` | 🟡      | Optional full illustrated garden art (per-species sprites shipped) |
| §15 Mechanics             | ✅               | ✅ (§15 plan)                                          | ⬛      | —                                                                  |
| Animation pass            | ✅               | ✅ `animation-sweep.md`                                | 🟡      | Residual token audit; optional polish                              |
| 3 Daily Wins              | ✅               | ✅ `daily-wins-build-spec.md`                          | ⬛      | —                                                                  |
| Foundations               | ✅ _(gap audit)_ | ✅ `morning-and-arbitration-build-spec.md`             | ⬛      | —                                                                  |
| Evidence (wins memory)    | ✅ _(gap audit)_ | ✅ `evidence-build-spec.md`                            | ⬛      | —                                                                  |
| Goals progress + steering | ✅ _(gap audit)_ | ✅ `goals-view-build-spec.md`                          | ⬛      | —                                                                  |
| Balance nudge             | ✅ _(gap audit)_ | ✅ `balance-nudge-build-spec.md`                       | ⬛      | —                                                                  |
| Top-3 assurance           | ✅ _(gap audit)_ | ✅ `top3-assurance-build-spec.md`                      | ⬛      | —                                                                  |

---

## 3. Where things actually stand

### Decisions — done

All product/design forks closed **Jul 1 2026**, including final micro-decisions and gap-audit tracks (Evidence, Goals steering, Balance nudge, Top-3 assurance, Foundations). Task **tags** built (§14).

### Specing — done

Every feature area has an authoritative build spec. No area lacks an implementation guide.

### Build — Kash 3.0 complete (Jul 2 2026)

**Built:** full original scope + gap-audit reassurance track + tail polish (tags, projects tail, garden sprites, AI tool audit).

**Optional remaining:** §5 Design tokens (`glass.css` cleanup) · §12 Care (full illustrated garden art) · animation residual · backend optimization.

**Entry point:** `docs/build-status.md`.

### Closed Jul 1 (product/design forks)

Bespoke animations, accent states, AI confirm-card UX, garden-art direction — all resolved and implemented.

**Headline (Jul 2 2026):** **Kash 3.0 is complete.** See `kash-3.0-remaining-build.md` for optional polish.

---

## 4. Recommended order from here

**Optional polish track:** **legacy `glass.css` cleanup** → **full illustrated garden art** → **animation residual** → **backend optimization** (parallel, fix-as-you-touch per `backend-optimization-spec.md`).

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
