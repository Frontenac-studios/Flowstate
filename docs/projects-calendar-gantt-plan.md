# Task 6 — Calendar Gantt Board (implementation plan)

Handoff plan for the **last remaining UI task** in the per-project planning
workspace. Tasks 3–5 (index, workspace shell, Miller columns) are **built and
merged on this branch**; this doc specifies Task 6 only.

Source of truth for product decisions: [`docs/projects-miller-calendar-plan.md`](./projects-miller-calendar-plan.md).
Repo conventions: [`CLAUDE.md`](../CLAUDE.md) (strict TS, Zod on all input,
Server Components by default, one default export per file, Conventional Commits,
never `--no-verify`).

---

## Goal

Replace the placeholder `CalendarBoardView` with a Gantt-style board for **one
project**: phase date-range bars laid out on an adaptive time axis.

From the locked decisions:

- **One project at a time**; **adaptive zoom** to the project's full span
  (earliest start → latest end across all dated phases).
- **Leaf phases** (no child phases) with `startDate`/`endDate` render as
  **draggable (shift) + resizable (re-duration)** bars → persist via `phases.update`.
- **Parent phases**: **locked** summary bars spanning the min/max of descendants
  (computed client-side, **not stored**); visually distinct (thinner / lighter).
- Phases without dates: **not drawn** — surface them in an **"undated" tray** so
  the user can give them dates.
- **Category color theming** on bars.
- **Today marker** + zoom/scroll controls.

---

## Current state (what already exists — reuse, don't rebuild)

- `src/components/kash/projects/CalendarBoardView.tsx` — placeholder scaffold.
  Currently receives only `{ tree }`. **It will need `projectId`** for mutations
  (see wiring note below).
- `src/components/kash/projects/ProjectWorkspace.tsx` — owns `viewMode`,
  `selectedPath`, and builds the tree. Renders `<CalendarBoardView tree={tree} />`
  when `viewMode === "calendar"`. **Add `projectId={initialProject.id}`** here.
- `src/lib/projects/phase-tree.ts` (all pure, unit-tested):
  - `buildPhaseTree(phases, tasks)` → `{ rootPhases, looseTasks }`, nested `PhaseTreeNode`.
  - `derivePhaseRange(node)` → `{ start: string | null; end: string | null }` —
    **exactly the parent-derivation logic this task needs.** Leaf returns its own
    dates; parent spans min-start / max-end of descendants.
  - `partitionByCompletion(items)` (used by Miller; not needed here).
- `src/components/kash/projects/useProjectMutations.ts` — hook returning
  per-project mutations with list invalidation. **Use `m.updatePhase`** for
  drag/resize. (Already wired to invalidate `phases.listByProject` +
  `tasks.listByProject`.)
- `src/components/kash/projects/ConfirmDialog.tsx` — reusable modal (not likely
  needed here, but available).
- `src/components/kash/projects/CategoryBadge.tsx` + `src/lib/projects/categories.ts`
  — `categoryColor(category)` / `PROJECT_CATEGORY_META`. Body & Mind = `#5ebd3e`.
- Date utils `src/lib/dates/local-day.ts`: `startOfLocalDay`, `toISODateString`,
  `parseISODateString`, `addDays`, `formatHeaderDate`. Dates on phases are ISO
  `YYYY-MM-DD` **strings** (compare lexicographically).

### API contract (already merged)

`phases.update` (tRPC mutation) input:

```ts
{ id: string (uuid),
  name?: string,
  description?: string | null,
  startDate?: string | null,  // /^\d{4}-\d{2}-\d{2}$/
  endDate?:   string | null }
```

- Server **validates `endDate >= startDate`**; otherwise throws
  `TRPCError({ code: "BAD_REQUEST" })`. Keep client-side clamping so we never
  send an inverted range (and handle the error defensively).
- `phases.listByProject` returns rows with `startDate`, `endDate`,
  `parentPhaseId`, `completedAt`, `sortOrder`, etc. (the workspace already feeds
  these into the tree).

> ⚠️ **dnd-kit note:** only `@dnd-kit/core` + `@dnd-kit/utilities` are installed
> (no `@dnd-kit/sortable`). dnd-kit has **no resize primitive**. Recommended:
> implement bar **drag + resize with native pointer events** (`onPointerDown` →
> `setPointerCapture` → `pointermove`/`pointerup`), converting pixel deltas to
> whole-day deltas via the scale. This is simpler and more precise for a timeline
> than bending dnd-kit to fit.

---

## Proposed component / file breakdown

All new components under `src/components/kash/projects/`, one default export each.

1. **`src/lib/projects/gantt-scale.ts`** (pure, **add unit tests** in
   `gantt-scale.test.ts`) — the math, kept out of React:
   - `computeProjectSpan(tree)` → `{ start: string; end: string } | null` using
     `derivePhaseRange` over root phases (overall min/max). `null` ⇒ nothing dated.
   - `dayIndex(iso, originIso)` → integer days from origin (uses `parseISODateString`).
   - `totalDays(span)` → inclusive day count.
   - `offsetToDate(dayOffset, originIso)` → ISO string (uses `addDays`+`toISODateString`).
   - `pxToDays(px, pxPerDay)` / `daysToPx` — with rounding for snap-to-day.
   - `buildTicks(span, granularity)` → array of `{ iso, label, x }` for the axis
     header at day / week / month granularity.
2. **`GanttFlatRow` type + flattener** — flatten the tree depth-first into ordered
   rows `{ node, depth, isLeaf }` so hierarchy shows as indentation. Can live in
   `gantt-scale.ts` (pure + tested) or inline in the view; prefer the lib + test.
3. **`CalendarBoardView.tsx`** (replace scaffold) — orchestrator:
   - Take `{ tree, projectId }`.
   - Compute span; if `null`, render only the **undated tray** + an empty hint.
   - Hold `zoom` state (granularity + pxPerDay); fit-to-width on mount via a
     measured container ref, with explicit zoom in/out + "fit" controls.
   - Horizontal scroll container; sticky **axis header** (`GanttAxis`); **today
     marker** absolutely positioned at `dayIndex(todayIso)` (today = local day).
   - Map flat rows → `GanttRow`.
   - Pointer-based drag/resize handlers that compute new `{startDate,endDate}` and
     call `m.updatePhase.mutate(...)` on pointer-up (optimistic local offset during
     drag for smoothness; the list invalidation reconciles).
   - **Undated tray**: leaf phases with missing start/end; clicking one seeds
     default dates (e.g. today → today+6) via `updatePhase`, moving it onto the board.
4. **`GanttAxis.tsx`** — the tick header (labels + gridlines) from `buildTicks`.
5. **`GanttRow.tsx`** — one row: indented phase label (left gutter) + the track.
   Renders `GanttBar`. Parent rows show the **derived** bar (locked); leaf rows
   show the editable bar.
6. **`GanttBar.tsx`** — the bar itself:
   - Position/width from the scale.
   - **Leaf**: draggable body (shift both dates) + left/right **resize handles**
     (change one edge). Pointer handlers; clamp so `end >= start`; snap to whole days.
   - **Parent**: rendered thinner/lighter, **no handles, not draggable** (locked).
   - Category color theming (see below). Completed phases visually muted
     (reuse the dimming convention from Miller).

### Wiring change required

`ProjectWorkspace.tsx`:

```tsx
<CalendarBoardView tree={tree} projectId={initialProject.id} />
```

and update `CalendarBoardView` props to `{ tree, projectId }`.

---

## Layout & scale math

- **Origin** = span.start. `x(iso) = dayIndex(iso, origin) * pxPerDay`.
  Bar width = `(dayIndex(end) - dayIndex(start) + 1) * pxPerDay` (inclusive).
- **Adaptive fit**: on mount and on container resize, `pxPerDay = containerWidth /
totalDays(span)`, clamped to a sane min/max. Zoom controls multiply/divide
  `pxPerDay`; granularity (day/week/month ticks) derived from `pxPerDay` thresholds.
- **Drag**: `pointermove` accumulates dx → `deltaDays = pxToDays(dx, pxPerDay)`;
  preview `start' = start + deltaDays`, `end' = end + deltaDays`; commit on up.
- **Resize left/right**: move only that edge; enforce `end >= start` (min 1 day).
- Snap all commits to whole days.

---

## Category color theming

This board is **one project**, so the project has a single category. Use
`categoryColor(project.category)` as the base bar color. Two viable looks
(pick one in Open Decisions):

- **A (recommended):** all bars the category color; parents lighter/translucent,
  leaves solid; completed muted.
- **B:** vary tint by depth so nesting reads at a glance.

> Note: `CalendarBoardView` currently only has the tree, not the category. Either
> pass `category` (or the whole `project`) down from `ProjectWorkspace`, or read
> it where convenient. Passing `category` is cleanest.

---

## Edge cases

- **No dated phases** → board empty; show undated tray + hint ("Give a phase
  dates to see it here").
- **Single-day phase** (start === end) → width = 1 day; ensure handles still grabbable.
- **Parent with mixed dated/undated children** → derived range covers only dated
  descendants (already how `derivePhaseRange` behaves).
- **Inverted drag** (resize past the opposite edge) → clamp to min 1 day; never
  send inverted range to the server.
- **Completed phases** → still drawn, visually muted; keep editable? (Open decision.)
- **Reduced motion / reduced transparency** → respect existing media-query CSS;
  avoid motion-only affordances.
- **Today outside span** → still draw the marker only if within the visible range;
  otherwise omit (or extend span to include today — open decision).

---

## Open decisions (resolve before/at start)

Recommended defaults in **bold**; confirm with the user.

1. **Zoom granularity control:** explicit Day / Week / Month buttons **+** a
   fit-to-width default? → **Yes: auto-fit on load, with Day/Week/Month + zoom
   in/out controls.**
2. **Drag/resize snapping:** **snap to whole days** (vs free pixel). → **Whole days.**
3. **Undated phases:** **tray below the board**; click to seed today→+6 and place
   it. (vs hidden entirely). → **Tray.**
4. **Category theming:** **A** (single category color; parents lighter, leaves
   solid) vs B (tint by depth). → **A.**
5. **Editing completed phases on the board:** allow drag/resize, or lock them
   like parents? → **Allow (muted but editable).**
6. **Today vs span:** if today is outside the project span, **just omit the
   marker** (don't auto-extend). → **Omit when out of range.**
7. **Bar label:** show phase name on/beside the bar, or only in the left gutter? →
   **Left gutter label; name on bar only if it fits.**

---

## Verification & checks

- Keep `npm run typecheck`, `npm run lint`, `npm run test:run` **green**.
- Add unit tests for `gantt-scale.ts` (span, dayIndex/offset round-trip, ticks,
  flattener). The repo convention is co-located `*.test.ts` with vitest
  (`describe`/`it`/`expect`).
- **Browser verification has been deferred** for all project views because the
  preview's headless browser isn't signed in and `/projects/*` is auth-protected
  (middleware redirect). Either sign into the preview (`preview_start` → the
  printed URL) to drive live checks, or verify on a signed-in dev server. The
  assistant must **not** enter the user's password.
- Pre-commit runs lint/format/typecheck via husky; do not bypass.

---

## After Task 6

This completes UI tasks 3–6. Suggested follow-ups (not in scope here): empty/loading
polish, optimistic updates for Miller mutations to reduce refetch flicker, and a
real signed-in verification pass across all four deliverables.
