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
- Selecting a **phase** opens its contents in the next column. Depth is **arbitrary** — phases nest
  as deeply as you like (directories inside directories, no limit); each level opens one more
  column. _(Corrected Jul 7 2026: supersedes the original "two directory levels max" cap.)_
- **MC-2 · Widths:** **equal columns.**

## 3. Detail behavior (ID)

- **Task (leaf) — inline expansion (ID-1, updated Jul 16 2026):** single click **selects/focuses** the
  row only. **Swipe right → Edit** (or **Shift+Enter** / **E**) expands the row in place for
  inline-editable detail (ID-2) — title, category, due, priority, time-estimate, path, blocked-by,
  notes. Edit again toggles closed; **⎋** collapses. (No separate preview column; the docked panel
  was retired Jun 26.)
- **Phase (directory) — phase-detail (ID-3, updated Jul 16 2026):** single click / **Enter** / **→**
  **drills** into the phase (opens contents in the next column) — does **not** open detail.
  **Swipe right → Edit** (or **Shift+Enter** / **E**) expands an inline phase-detail panel in place
  (progress / rename / dates). Edit again toggles closed; **⎋** collapses; drilling into a
  **different** phase clears open detail. Depth is click-driven — empty viewport slots show solid
  outline ghost columns (no auto-pad of nested phases).

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
- **PR-7 · Setup wizard backlog (Jul 2026 — shipped [#200](https://github.com/Frontenac-studios/Flowstate/pull/200)–[#202](https://github.com/Frontenac-studios/Flowstate/pull/202)):**
  - Seeded tasks (wizard, template apply, bulk import) land in **Later backlog** via `resolveProjectBacklogCreateFields` (`scheduledDate: null`, `bucketOverride: "later"`); phase `startDate` → `suggestedScheduledDate`.
  - **`projects.commitSetup`** — atomic phase/milestone/task seeding (replaces piecemeal creates from the wizard).
  - **Wizard UX ([#201](https://github.com/Frontenac-studios/Flowstate/pull/201)):** skip auto-open for template projects; blank projects start at Phases; edit mode duplicate-task warning on Tasks step.
  - **Miller suggested-date chip ([#202](https://github.com/Frontenac-studios/Flowstate/pull/202)):** backlog tasks with a suggestion show Accept on Miller rows (parity with Week inbox).

## 6. Resolved Jun 27 (was open)

- **PROJ-A · Completed-task treatment:** **mirrors Today** — category-fill check, then sinks to a
  per-column **"Completed · n"** group (collapsible). (See `kash-3.0-animation-sweep.md`.)
- **PROJ-B · Views & lenses:** Miller / Gantt / Calendar = a **segmented switch** (content cross-fades);
  **priority + category are clean-by-default filter lenses** (VF-style), off until toggled.
- **PROJ-C · Phase detail (ID-3, updated Jul 16 2026):** click / Enter / → **drills** only. Swipe →
  **Edit** (or Shift+Enter / E) expands inline phase-detail; Edit toggles closed; Escape collapses;
  drilling another phase clears detail. _(Supersedes Jul 7 "click opens detail + drill" wording.)_
