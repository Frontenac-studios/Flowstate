# Kash 3.0 — Projects Miller UX

> Walk-through of the Projects Miller-columns page (§9). Decided Jun 27 2026. Partial — adding +
> views/lenses and completed-task treatment still open (see §5). Companion: `kash-3.0-plan.md` §9.

---

## 1. Landing (A + C)

- The **card gallery is home** — project cards with % progress (built: `ProjectsIndex` / `ProjectCard`).
- It **remembers the last project** so reopening Projects can **resume** it, with the gallery one tap away.
- Therefore **Projects is NOT a Miller column** — you enter a project from the gallery; column 1 is that
  project's contents.

## 2. Column model (MC-1) — true recursive Miller

- Each column lists the **contents of the item selected in the column to its left** — **phases
  (directories, marked ▸) and tasks (leaves) intermixed**, not pre-split into "Phases" then "Tasks."
- Selecting a **phase** opens its contents in the next column. Depth is **fixed: project → phase →
  subphase → task** (two directory levels max), not arbitrary.
- **MC-2 · Widths:** **equal columns.**

## 3. Detail behavior (ID)

- **Task (leaf) — inline expansion (ID-1):** selecting a task **expands the row in place** to reveal its
  detail; **inline-editable** (ID-2) — title, category, due, priority, time-estimate, path, blocked-by,
  notes. `⎋` collapses. (No separate preview column; the docked panel was retired Jun 26.)
- **Phase (directory) — phase-detail (ID-3, proposed reconciliation, _pending final confirm_):** clicking
  a phase opens its **contents in the next column, headed by a phase-detail panel** (progress / rename /
  dates); the drill continues from those contents. _(The confirm question wasn't answered — revisit.)_

## 4. Settled elsewhere

- Priority lens (VF-4c) filters visible tasks; phases stay. Category coloring per the palette.
- Miller / Gantt / Calendar view switch exists (built).

## 5. Creation flows (Jun 27)

- **PR-1 · New project:** **Blank + Template** (AI-suggested structure deferred). Blank = name +
  required category, from the gallery's ＋ New. Template = reuse a saved structure (see PR-5).
- **PR-2 · Phase vs task = the existing composer syntax** (no new marker). A task line is
  `title ; due ; priority ; parentDir`, where **parentDir is the phase path** — `//` nests
  (`Build // Backend`) and `+` creates (`+ Backend`). A **`;;;` prefix = a phase-only line**
  (creates phases, no task). Matches the current build (`parse-project-task-input`).
- **PR-3 · Task composer (as built):** multi-line paste (one line per item, up to the line cap),
  `;`-properties, parse preview + duplicate warnings before commit.
- **PR-4 · Bulk import = paste only** (no CSV, no AI cleanup) → mapped to tasks/phases, with a
  reviewable, undo-able import-history page.
- **PR-5 · Templates:** manual **"Save as template"** from the project ⋯ menu; captures
  phases/subphases + task lists + **durations learned** from past similar projects (§9). Applied via PR-1.
- **PR-6 · Project lifecycle (⋯ menu):** **rename · change category** (re-colors its tasks) ·
  **archive** (hide, keep history, restorable) · **delete** (crimson, confirm-first).

## 6. Resolved Jun 27 (was open)

- **PROJ-A · Completed-task treatment:** **mirrors Today** — category-fill check, then sinks to a
  per-column **"Completed · n"** group (collapsible). (See `kash-3.0-animation-sweep.md`.)
- **PROJ-B · Views & lenses:** Miller / Gantt / Calendar = a **segmented switch** (content cross-fades);
  **priority + category are clean-by-default filter lenses** (VF-style), off until toggled.
- **PROJ-C · Phase detail (ID-3, confirmed):** clicking a phase opens its **contents column headed by
  the phase-detail** (progress / rename / dates); the drill continues from those contents. Pure cascade.
