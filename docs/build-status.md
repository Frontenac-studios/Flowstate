# Kash 3.0 — Build status (entry point)

> **Last synced:** Jul 2 2026 (Kash 3.0 complete — Phases 0–6, waves 1–4, gap-audit Phases 0–5
> (Top-3, foundations, balance, evidence, goals, tail) on `feat/kash-3.0-complete`).  
> This is the one-page snapshot. Detail lives in the docs linked below.

---

## Headline

| Layer         | Status                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Decisions** | **Closed.** All original product/design forks closed Jul 1 2026 (values shape, About-me UX, Daily Wins labels, self-care cadence, low-stakes defaults). The **Jul 1 gap audit reopened one** (wins memory vs §15 "nothing stored" — see Evidence below) and **added four new decided tracks** (Evidence, Goals progress/steering, Balance nudge, Top-3 assurance); all five gap-audit tracks (incl. foundations) are **built** Jul 2 2026. |
| **Specing**   | **Done for all tracks** — every feature area, including the four new gap-audit tracks, has an authoritative build spec (see [document set](#document-set)).                                                                                                                                                                                                                                                                                |
| **Build**     | **Kash 3.0 complete; Kash 3.1 in progress.** Original scope + gap-audit tracks shipped. **3.1** closes the last mile per `kash-3.1-consolidated-build-spec.md` (design pass, ritual rebuild, learning loop). Legacy `glass.css` cleanup deferred until `--kash-*` alias audit is clean.                                                                                                                                                    |

---

## Decisions

**Closed (Jul 1 2026):** navigation IA, B&W design system + accent states, animation sweep moments, AI confirm-card UX, garden-art direction, and all per-feature product forks in `kash-3.0-plan.md`.

**Also resolved (Jul 1 2026 — final micro-decisions):**

| Item                     | Choice                                                                                           | Owner doc                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------ | --------------------------------------------------- |
| Values shape             | **Flat 3–7 set** (not ranked 1–5)                                                                | `kash-3.0-plan.md` §13 · `values-context.md`        |
| About-me edits           | **Future-only** — no retroactive replan                                                          | `kash-3.0-plan.md` §13 · `values-context.md`        |
| About-me update UX       | **Hybrid** — Settings ghosted accept/reject + chat confirm-card; direct edit always available    | `kash-3.0-plan.md` §11 · `ai-persona-build-spec.md` |
| Category default labels  | **Keep all five** (Professional, Personal Projects, Relationships, Adulting, Body & Mind)        | `kash-3.0-plan.md` §2                               |
| Daily Wins facet labels  | **Body · Mind · Soul** (display); enum keys may stay `physical` / `mental` / `spiritual` in code | `kash-3.0-plan.md` §12 · `daily-wins-build-spec.md` |
| Self-care cadence        | **2–3 walk offers/day** + breathing on heavy/stress days (adaptive signal)                       | `kash-3.0-plan.md` §6 · §12                         |
| Task value tags v1       | **`value_id` on goals only** — no `tasks.value_id` column                                        | `values-context.md` · `planning-mode.md`            |
| Abyss auto-archive       | Fixed **~90d**, no user setting v1                                                               | `abyss-build-spec.md`                               |
| Abyss taxonomy           | Three soft types: **idea / task / reference**                                                    | `abyss-build-spec.md`                               |
| Abyss reference capture  | **URLs only** for now                                                                            | `abyss-build-spec.md`                               |
| Sync detail panel        | Expand from **sidebar footer dot** (D2)                                                          | `kash-3.0-plan.md` §15                              |
| Garden art               | **Procedural until illustrated** art exists                                                      | `care-build-spec.md`                                |
| Values vs urgency        | Values **nudge + explain**; urgency can still win                                                | `values-context.md`                                 |
| Year view                | **PM-A** (quarter cards + heatmap merged) — shipped                                              | `planning-mode.md`                                  |
| Destructive confirm-card | **Inline** for all writes (including deletes)                                                    | `ai-persona-build-spec.md`                          |

**Build-only remainder (not a product fork):** task **tags** — ✅ built (`tasks.tags`, Phase 5 / `0029` migration).

**Reopened / added (Jul 1 2026 — gap audit, `kash-3.0-goals-vs-build.md`) — ✅ all built Jul 2 2026:** the audit held the built app against the README product goals and found the reassurance / steering / balance layer under-built. Four decided tracks (+ foundations prerequisite) came out of it; shipped as gap-audit Phases 0–5:

| Item                                                | Choice                                                                                                                                                                                                                                                                     | Owner doc                               |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| **Wins memory (Evidence)** — _reverses part of §15_ | §15's "ephemeral, nothing stored" stays for **celebrations**, but wins get a **persistent, opt-in memory** surface ("Evidence"). Still **no gamification** (no points/scores/streaks). Care tab; own-voice; resurfaces on larger-goal completion + quarterly (adjustable). | `kash-3.0-evidence-build-spec.md`       |
| **Goals progress + steering**                       | Journey timeline (vertical steps) + attention heatmap; goals' next step surfaces into Today (load-aware). **Horizon renamed Bingo → Goals**, Bingo becomes a sub-mode.                                                                                                     | `kash-3.0-goals-view-build-spec.md`     |
| **Balance nudge**                                   | Learned baseline → overall-lopsidedness trigger → offer an action; one load-aware nudge per kind/day + weekly digest. Category-tinted chip + bar tilt-caption.                                                                                                             | `kash-3.0-balance-nudge-build-spec.md`  |
| **Top-3 assurance**                                 | One-tap time hold (timeline ghost block); morning/midday/wind-down check-ins (load-aware); flag persistent slips.                                                                                                                                                          | `kash-3.0-top3-assurance-build-spec.md` |

---

## Specing

All build-ready specs exist. No feature lacks an implementation guide.

| Area                          | Spec                                                                 |
| ----------------------------- | -------------------------------------------------------------------- |
| Master product plan           | `kash-3.0-plan.md`                                                   |
| Maturity tracker              | `kash-3.0-build-breakdown.md`                                        |
| Remaining backlog             | `kash-3.0-remaining-build.md`                                        |
| Data spine                    | `kash-3.0-data-spine-build-spec.md`                                  |
| Today / Week finish           | `kash-3.0-today-build-plan.md`, `kash-3.0-week-build-plan.md`        |
| Planning Mode                 | `kash-3.0-planning-mode.md`, `kash-3.0-planning-build-plan.md`       |
| Projects Miller               | `kash-3.0-projects-miller.md`                                        |
| Abyss                         | `kash-3.0-abyss-build-spec.md`                                       |
| Care + library                | `kash-3.0-care-build-spec.md`, `kash-3.0-care-library-build-plan.md` |
| Daily Wins                    | `kash-3.0-daily-wins-build-spec.md`                                  |
| Values / About-me             | `kash-3.0-values-context.md`                                         |
| AI persona                    | `kash-3.0-ai-persona-build-spec.md`                                  |
| Design tokens + visual        | `kash-3.0-design-tokens.md`, `kash-3.0-visual-redesign.md`           |
| Animation                     | `kash-3.0-animation-sweep.md`                                        |
| Backend optimization          | `kash-3.0-backend-optimization-spec.md` (parallel track)             |
| **Evidence (wins memory)**    | `kash-3.0-evidence-build-spec.md` _(new — Jul 1 gap audit)_          |
| **Goals progress + steering** | `kash-3.0-goals-view-build-spec.md` _(new — Jul 1 gap audit)_        |
| **Balance nudge**             | `kash-3.0-balance-nudge-build-spec.md` _(new — Jul 1 gap audit)_     |
| **Top-3 assurance**           | `kash-3.0-top3-assurance-build-spec.md` _(new — Jul 1 gap audit)_    |
| Gap audit (goals vs build)    | `kash-3.0-goals-vs-build.md`                                         |

Visual reference mockup: `kash-3.0-mockups.html`.

**Supporting / historical docs (not authoritative specs, not tracked as build work):** `kash-3.0-design-brief.md`, `kash-3.0-design-prompt-today.md`, `kash-3.0-design-system-starter.md` (Claude Design generation prompts, superseded by `design-tokens.md`); `kash-3.0-nav-implementation-plan.md` (reconcile plan — nav shipped); `kash-3.0-redesign-build-prompt.md` (redesign handoff — shipped in Phase 0). Kept for provenance.

---

## Build status by feature

Legend: ⬛ built · ✅ built (gap-audit track) · 🟡 partial · ⬜ not started

| Feature                         | Code | Notes                                                                                                                                                                           |
| ------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §2 Life categories              | ⬛   | Enum on tasks + projects, settings editor, inference, sync                                                                                                                      |
| §4 Navigation                   | ⬛   | Grouped rail, `/today` + `/plan`, chat push panel, ⌘/, mobile drawer, Settings tabs                                                                                             |
| §5 Design tokens / B&W          | 🟡   | `tokens.css` canonical; `--ink-faint` AA fix (#767e8e). Legacy `glass.css` import remains (`--kash-*` aliases still referenced in `tailwind.config.ts`)                         |
| §6 Today                        | ⬛   | TD1–TD6: balance bar, adaptive timeline, living record, wind-down, completion choreography, arrival motion                                                                      |
| §7 Week                         | ⬛   | Grid, protected blocks (+ timed on Today timeline), priorities, tally-on-demand, over-commit, EoW chip, AI draft respects protected blocks, Settings default-week editor        |
| §8 Planning Mode                | ⬛   | Year / Quarter / Month / Week / Bingo views, balance pass, check-in, bingo rewards → garden nourish                                                                             |
| §9 Projects                     | ⬛   | Miller, gallery, multi-project calendar toggle, templates (save + apply + completion suggest chip), weighted % progress, fold-to-filed, estimate-confidence “learning…” hint    |
| §10 Abyss                       | ⬛   | Capture, sky + list, archive, monthly review, promote, embeddings                                                                                                               |
| §11 AI persona                  | ⬛   | Register prompts, confirm-card, proposed-action tools, About-me in context, write-tool catalog audited                                                                          |
| §12 Care                        | 🟡   | All tabs shipped (garden with per-species sprites, tasks library, breathing, reflection, stats, travel, Evidence shrine). **Left:** optional full illustrated seed→grown assets |
| §13 Values / About-me           | ⬛   | Settings About tab: flat 3–7 values, constraints, prose, ghosted suggestions, hybrid update UX                                                                                  |
| §14 Data spine                  | ⬛   | Category, time entries, dependencies, recurrence, protected blocks, **task tags** all built                                                                                     |
| 3 Daily Wins                    | ⬛   | Table, EoD tracker, garden nourish, reflection proposals                                                                                                                        |
| §15 Mechanics                   | 🟡   | Ephemeral celebrations, sync footer dot + **expandable detail panel** (desktop), notification settings. Auto-DND on focus **unverified** on Tauri (3.1 T4).                     |
| Animation pass                  | 🟡   | Stripe-resolving, project fold, sync pulse, bingo lock, page cross-fade, week/care motion. Residual app-wide token audit optional                                               |
| Backend optimization            | 🟡   | Parallel track — batched sync/indexing lands with touched surfaces (`backend-optimization-spec.md`)                                                                             |
| Top-3 assurance                 | ✅   | Gap Phase 0. One-tap hold ghost + confirm, midday slot check-in (`top3MiddayCheckin`), slip chip. `kash-3.0-top3-assurance-build-spec.md`                                       |
| Foundations (morning + arbiter) | 🟡   | Nudge arbiter + Assistance settings built. Morning hand-off is a **placeholder modal** — full ritual rebuild is Kash 3.1 T1. `kash-3.1-consolidated-build-spec.md`              |
| Balance nudge                   | ✅   | Gap Phase 2. Category-starvation nudge + weekly digest; learned baseline + lopsidedness trigger. `kash-3.0-balance-nudge-build-spec.md`                                         |
| Evidence (wins memory)          | ✅   | Gap Phase 3. `evidence_editions` table + Care shrine; cadence setting; milestone triggers. `kash-3.0-evidence-build-spec.md`                                                    |
| Goals progress + steering       | ✅   | Gap Phase 4. Bingo→Goals horizon; per-goal journey timeline + attention heatmap; next-step steering into Today. `kash-3.0-goals-view-build-spec.md`                             |
| Tail polish                     | ✅   | Gap Phase 5. Task tags, projects tail, garden species art, AI tool audit, design cleanup. `kash-3.0-remaining-build.md` §A                                                      |

---

## What’s left (priority order)

See `kash-3.1-consolidated-build-spec.md` for all new work (supersedes `kash-3.0-remaining-build.md`). Historical 3.0 tail (optional):

1. **Legacy cleanup** — retire `glass.css` when `--kash-*` alias audit is clean (`tailwind.config.ts` still references aliases)
2. **Garden illustration art** — optional full illustrated seed→grown assets (per-species SVG sprites shipped)
3. **Backend optimization** — continue fix-as-you-touch per `backend-optimization-spec.md`
4. **Animation residual** — optional app-wide motion token audit

---

## Recent merge wave (main)

| PR       | Scope                                                              |
| -------- | ------------------------------------------------------------------ |
| #124     | Phase 0 — visual foundation (B&W tokens, accent wiring)            |
| #125     | Phase 1 — projects spine (calendar, progress, recurrence polish)   |
| #126     | Phase 2 — AI persona breadth + confirm-card                        |
| #127     | Phase 3 — Abyss                                                    |
| #128     | Phase 4 — Values / About-me                                        |
| #129     | Phase 5 — Care expansion (library, garden, breathing, reflection)  |
| #130     | Phase 6 — mechanics + motion QA                                    |
| #121–123 | Waves 2–4 — spine/projects, AI spine, Daily Wins                   |
| #131     | Design tokens doc publish (DT-9…DT-20)                             |
| gap 0    | Top-3 assurance — hold ghost, midday check-in, slip chip           |
| gap 1    | Foundations — nudge arbiter, morning hand-off, Assistance settings |
| gap 2    | Balance nudge — category-starvation + weekly digest                |
| gap 3    | Evidence — wins memory editions + Care shrine                      |
| gap 4    | Goals — progress timeline, steering, Bingo→Goals rename            |
| gap 5    | Tail — tags, projects tail, garden sprites, AI tool audit          |

---

## Document set

- **Start here:** this file
- **Tracker:** `kash-3.0-build-breakdown.md`
- **Backlog:** `kash-3.0-remaining-build.md`
- **Product spec:** `kash-3.0-plan.md`
- **Product goals (rubric):** `../README.md`
- **Gap audit (goals vs build):** `kash-3.0-goals-vs-build.md`
- **Gap-audit specs:** `kash-3.0-evidence-build-spec.md`, `kash-3.0-goals-view-build-spec.md`, `kash-3.0-balance-nudge-build-spec.md`, `kash-3.0-top3-assurance-build-spec.md`
- **Foundations spec (morning hand-off + nudge arbiter):** `kash-3.0-morning-and-arbitration-build-spec.md`
- **Backlog reframe (Abyss → Backlog):** `kash-3.0-backlog-reframe-build-spec.md`
- **Foundations impl plan:** `kash-3.0-foundations-impl-plan.md`
- **Open decisions / holes (consistency read — A1–C resolved in 4 phases):** `kash-3.0-open-decisions.md`
- **Ideas backlog (future / someday):** `kash-3.0-ideas-backlog.md`
- **Frozen v1 brief (historical):** `planning-start.md`
