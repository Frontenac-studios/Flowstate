# Kash 3.0 — Build status (entry point)

> **Last synced:** Jul 1 2026 (post Phases 0–6 + waves 1–4 on `main`).  
> This is the one-page snapshot. Detail lives in the docs linked below.

---

## Headline

| Layer         | Status                                                                                                                                                                                                                                                                 |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Decisions** | **Done** — all product/design forks closed (Jul 1 2026), including the last micro-decisions (values shape, About-me update UX, Daily Wins facet labels, self-care cadence, low-stakes defaults).                                                                       |
| **Specing**   | **Done** — every feature area has an authoritative build spec (see [document set](#document-set)).                                                                                                                                                                     |
| **Build**     | **~85% shipped** — daily loop, week, planning horizons, projects, Abyss, Care, Daily Wins, Values, AI confirm-card, and mechanics are in code. Remaining work is polish, one deferred schema item (tags), art production, and the backend-optimization parallel track. |

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

**Build-only remainder (not a product fork):** task **tags** (`tasks.tags` freeform) — decided for v1, schema not yet added (`kash-3.0-plan.md` §14).

---

## Specing

All build-ready specs exist. No feature lacks an implementation guide.

| Area                   | Spec                                                                 |
| ---------------------- | -------------------------------------------------------------------- |
| Master product plan    | `kash-3.0-plan.md`                                                   |
| Maturity tracker       | `kash-3.0-build-breakdown.md`                                        |
| Remaining backlog      | `kash-3.0-remaining-build.md`                                        |
| Data spine             | `kash-3.0-data-spine-build-spec.md`                                  |
| Today / Week finish    | `kash-3.0-today-build-plan.md`, `kash-3.0-week-build-plan.md`        |
| Planning Mode          | `kash-3.0-planning-mode.md`, `kash-3.0-planning-build-plan.md`       |
| Projects Miller        | `kash-3.0-projects-miller.md`                                        |
| Abyss                  | `kash-3.0-abyss-build-spec.md`                                       |
| Care + library         | `kash-3.0-care-build-spec.md`, `kash-3.0-care-library-build-plan.md` |
| Daily Wins             | `kash-3.0-daily-wins-build-spec.md`                                  |
| Values / About-me      | `kash-3.0-values-context.md`                                         |
| AI persona             | `kash-3.0-ai-persona-build-spec.md`                                  |
| Design tokens + visual | `kash-3.0-design-tokens.md`, `kash-3.0-visual-redesign.md`           |
| Animation              | `kash-3.0-animation-sweep.md`                                        |
| Backend optimization   | `kash-3.0-backend-optimization-spec.md` (parallel track)             |

Visual reference mockup: `kash-3.0-mockups.html`.

---

## Build status by feature

Legend: ⬛ built · 🟡 partial · ⬜ not started

| Feature                | Code | Notes                                                                                                                                                                                         |
| ---------------------- | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §2 Life categories     | ⬛   | Enum on tasks + projects, settings editor, inference, sync                                                                                                                                    |
| §4 Navigation          | ⬛   | Grouped rail, `/today` + `/plan`, chat push panel, ⌘/, mobile drawer, Settings tabs                                                                                                           |
| §5 Design tokens / B&W | 🟡   | `tokens.css` canonical; accent states wired on tasks. Legacy `glass.css` import remains (aliases only)                                                                                        |
| §6 Today               | ⬛   | TD1–TD6: balance bar, adaptive timeline, living record, wind-down, completion choreography, arrival motion                                                                                    |
| §7 Week                | ⬛   | Grid, protected blocks (+ timed on Today timeline), priorities, tally-on-demand, over-commit, EoW chip, AI draft respects protected blocks, Settings default-week editor                      |
| §8 Planning Mode       | ⬛   | Year / Quarter / Month / Week / Bingo views, balance pass, check-in, bingo rewards → garden nourish                                                                                           |
| §9 Projects            | 🟡   | Miller, gallery, multi-project calendar toggle, templates (save + apply), weighted % progress, fold-to-filed. **Left:** AI “save as template?” on completion, duration-estimate confidence UI |
| §10 Abyss              | ⬛   | Capture, sky + list, archive, monthly review, promote, embeddings                                                                                                                             |
| §11 AI persona         | 🟡   | Register prompts, confirm-card, proposed-action tools, About-me in context. **Left:** full write-tool breadth audit                                                                           |
| §12 Care               | 🟡   | All tabs shipped (garden, tasks library, breathing, reflection, stats, travel). **Left:** custom seed→grown illustration art (procedural garden in code)                                      |
| §13 Values / About-me  | ⬛   | Settings About tab: flat 3–7 values, constraints, prose, ghosted suggestions, hybrid update UX                                                                                                |
| §14 Data spine         | 🟡   | Category, time entries, dependencies, recurrence, protected blocks all built. **Left:** task **tags** column + UI                                                                             |
| 3 Daily Wins           | ⬛   | Table, EoD tracker, garden nourish, reflection proposals                                                                                                                                      |
| §15 Mechanics          | ⬛   | Ephemeral celebrations, sync footer dot, notification settings, desktop sync panel                                                                                                            |
| Animation pass         | 🟡   | Stripe-resolving, project fold, sync pulse, bingo lock, page cross-fade, week/care motion. Residual app-wide token audit optional                                                             |
| Backend optimization   | 🟡   | Parallel track — batched sync/indexing lands with touched surfaces (`backend-optimization-spec.md`)                                                                                           |

---

## What’s left (priority order)

See `kash-3.0-remaining-build.md` for the full backlog. Highest leverage:

1. **Task tags** (§14) — schema + composer + filters (decided for v1, not built)
2. **Projects tail** — AI template suggestion on completion, estimate-confidence “learning…” UI
3. **Garden illustration art** — per-species seed→grown assets (procedural garden already live)
4. **Legacy cleanup** — retire unused `glass.css` surface classes when safe
5. **Backend optimization** — continue fix-as-you-touch per `backend-optimization-spec.md`

---

## Recent merge wave (main)

| PR       | Scope                                                             |
| -------- | ----------------------------------------------------------------- |
| #124     | Phase 0 — visual foundation (B&W tokens, accent wiring)           |
| #125     | Phase 1 — projects spine (calendar, progress, recurrence polish)  |
| #126     | Phase 2 — AI persona breadth + confirm-card                       |
| #127     | Phase 3 — Abyss                                                   |
| #128     | Phase 4 — Values / About-me                                       |
| #129     | Phase 5 — Care expansion (library, garden, breathing, reflection) |
| #130     | Phase 6 — mechanics + motion QA                                   |
| #121–123 | Waves 2–4 — spine/projects, AI spine, Daily Wins                  |
| #131     | Design tokens doc publish (DT-9…DT-20)                            |

---

## Document set

- **Start here:** this file
- **Tracker:** `kash-3.0-build-breakdown.md`
- **Backlog:** `kash-3.0-remaining-build.md`
- **Product spec:** `kash-3.0-plan.md`
- **Frozen v1 brief (historical):** `planning-start.md`
