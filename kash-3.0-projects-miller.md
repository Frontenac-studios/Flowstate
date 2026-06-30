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
- Selecting a **phase** opens its contents in the next column; depth is whatever the tree is (recursive).
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

## 5. Still open (next session)

- **Completed-task treatment** in Projects — align with Today's new motion (category-fill → slide to a
  Completed section) or keep grey/struck in place. _(Deferred in the walk-through.)_
- **Adding + views/lenses** — the `＋ add` row / ghost-column behavior, and the view-switch + filter UX.
- **ID-3 final confirm** — lock the phase detail-vs-cascade reconciliation above.
