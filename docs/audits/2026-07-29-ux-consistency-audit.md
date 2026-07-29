# UX Consistency Audit — 2026-07-29

Scan for functionality that should behave the same across parallel surfaces (Plan,
Week/This-Week, Today, Projects/Miller, Loose, Care, Focus, Chat, Abyss) but has
drifted. Findings only — no code changed during the audit.

Canonical task surface = `src/components/kash/plan/TaskRow.tsx` (shared by Plan, Week,
Today). Everything else is measured against it.

Severity: 🔴 high (behaviour/data bug or genuinely confusing) · 🟠 medium · 🟡 low.

Status legend: `todo` · `planning` · `in-progress` · `done` · `wontfix`.

---

## Theme 1 — "Complete a task" differs on every surface 🔴 · status: planning

| Surface           | Affordance                     | Optimistic flip          | Where completed go     | Reopen        | Undo                     |
| ----------------- | ------------------------------ | ------------------------ | ---------------------- | ------------- | ------------------------ |
| Plan / Today      | Checkbox                       | yes                      | "Completed · n" tail   | via tail      | keyboard ⌘Z only         |
| Week              | Checkbox                       | yes                      | **vanishes (no tail)** | **no**        | keyboard ⌘Z only         |
| Projects / Miller | **swipe / kebab, no checkbox** | **no (lags to refetch)** | stays struck in place  | inline toggle | **none**                 |
| Loose tasks       | **no completion control**      | —                        | —                      | —             | —                        |
| Focus             | "Done" button + ⌘↵             | —                        | auto-advances          | no            | no                       |
| Morning Handoff   | checkbox                       | —                        | —                      | —             | **visible toast + Undo** |

Specifics:

- No optimistic update in Miller — `MillerColumnsView.tsx:315`, `useProjectMutations.ts:60`;
  canonical optimistic path `TaskRow.tsx:468`.
- Week completes but renders no `CompletedSection` — `WeekCanvas.tsx:719,746`; contrast
  `DayPlanCanvas.tsx:869`.
- Undo uneven — visible toast+Undo `MorningHandoffRunner.tsx:216`; keyboard-only stack
  `useSessionUndo.ts:297`; none in Miller/Focus.
- `TaskDetail` (Miller) has no complete control at all.
- Loose tasks can't be completed/reopened — `LooseTaskRow.tsx:79-127`.
- ⚠️ **Likely real bug**: `FocusCanvas.handleDone` calls `completeMutation({id: task.id})`
  unconditionally (`FocusCanvas.tsx:238`), but recurring occurrences carry a synthetic
  non-UUID id and `tasks.complete` input is `z.string().uuid()` (`tasks.ts:909`).
  `TaskRow` branches to `recurrence.completeOccurrence` (`TaskRow.tsx:466`); Focus does
  not. Completing a focused recurring occurrence should fail validation. **Verify first.**

## Theme 2 — Today / This-Week silently swallow query errors 🔴 · status: planning

- Today (`DayPlanCanvas.tsx:271`) and This-Week (`ThisWeekSurface.tsx:31-38`) never check
  `isError` → a failed fetch renders as an empty board, indistinguishable from zero tasks.
- The same WeekCanvas under the Plan tab does it right (`WeekPlanView.tsx:60` renders
  `QueryErrorNotice`) — so `/plan` handles the error and `/this-week` doesn't.
- Care (`CareTasks.tsx`, `CareGardenHome.tsx`) also only handle `isLoading`.
- Shared component to reuse: `src/components/kash/ui/QueryErrorNotice.tsx`.
- Mutation-error toasts are already consistent (`useToast({variant:"error"})`).

## Theme 3 — Row click + swipe-rail reachability 🟠 · status: planning

- Single click does something different everywhere; no surface opens detail on one click.
  Plan/Week: nothing (`BucketSection.tsx:107`, `WeekColumn.tsx:147`). Today:
  select, double-click → Focus (`DayPlanCanvas.tsx:649`). Miller: select/expand
  (`MillerTaskRow.tsx:114`).
- Swipe rail is trackpad-wheel-only and keyboard-unreachable (`useTrackpadSwipeReveal.ts:80`,
  rail buttons `tabIndex={open?0:-1}`). Delete lives only on Plan's rail, Complete only on
  Miller's — so on a non-trackpad device you can't delete a Plan task or complete a Miller
  task from the row. Care uses a kebab (`PracticeRow.tsx:96`) — a competing pattern.

## Theme 4 — Four composers disagree on keyboard + validation 🟠 · status: planning

- Inverted Enter: Plan/Projects → Enter=newline, ⌘Enter=submit; Chat → Enter=send,
  ⌘Enter=newline (`ChatComposer.tsx:55`); Abyss → Enter=submit.
- Duplicated, drifted error renderers: `ComposerLineErrors` (Plan) vs
  `ProjectComposerLineErrors` (Projects). Plan uses off-palette `red-50/red-200`
  (CLAUDE.md wants tokens; Projects uses `text-critical`), labels `Line N:` vs truncated
  title, and only Plan offers one-click "Did you mean…?" fixes.
- Plan parser drops `field` on `invalid_property` → generic message where Projects is
  specific (`parse-quick-input.ts:11` vs `parse-project-task-input.ts:18`).
- `useComposerDraft` only in Plan/Projects; Chat/Abyss lose drafts. Duplicate warnings
  missing from Abyss. Abyss caps title at 200 vs shared `getTaskTitleError` 500.

## Theme 5 — Empty / loading / completed-section styling drift 🟡 · status: todo

- Loading: skeletons in Projects/Loose/Abyss/route-level, plain "Loading…" text in Today
  (`TodayList.tsx:99`) and Care; Backlog uses a third style.
- Empty: friendly `ColoredEmptyInvitation` in Today/Projects/Abyss, bare dashed text in
  Loose (`LooseTasksIndex.tsx:105`), Care, Week inbox. Split is sharpest inside Projects
  (gallery friendly, Loose bare).
- Completed section: collapsible in Plan/Today + Projects-index, permanently expanded in
  Miller column (`MillerColumn.tsx:154`); settled styling is line-through vs group
  `opacity-70` vs neither.
- `AbyssRoot` hand-rolls its own error notice though `QueryErrorNotice` was extracted from it.

## Theme 6 — Shared primitives bypassed 🟡 · status: todo

- Settings hand-roll raw `<input type="checkbox">` (`AssistanceSettingsSection.tsx:29`,
  `NotificationSettingsSection.tsx:25`, `CalendarSyncSection.tsx:70,320`,
  `DefaultWeekSection.tsx:245`) → OS-blue, wrong size/focus vs shared `Checkbox`.
- Tag chips two ways: `TaskTagChips` (truncate + `+N`) vs `TaskTagsEditor` (no cap).
- Date formatting has no shared formatter beyond `TaskRow`; some pass user locale, some
  hard-code `"en-US"` (`MorningTriageChat.tsx:63`, `WeekDraftPanel.tsx:119`). `DAY_MONTH`
  copy-pasted in 3 week files.
- Buttons: shared `Button` bypassed by ~57 files; "primary" has 3 looks. Hard-coded
  palette escape `Top3SlipChip.tsx:36` (amber).
- Loose tasks drop the priority indicator despite receiving `priority` (`LooseTaskRow.tsx:21`).

---

## Fix plan

Working set: Themes 1, 2, 3, 4. Themes 5 and 6 deferred (lower risk, mostly cosmetic).

### Decisions (locked 2026-07-29)

- **D1 Completion affordance — remove checkboxes entirely.** Completion becomes a
  gesture + shortcut, uniform on every task surface (incl. Loose, which gains completion
  for the first time): two-finger **swipe right = complete / un-complete** (threshold +
  spring-back), and **`Cmd+Shift+D`** toggles complete on the selected task.
- **D2 Completed tasks — pinned to column bottom AND collapsible.** Week columns get a
  collapsible "Completed · n" group pinned to the bottom; Miller's currently-always-open
  pinned group becomes collapsible to match; Plan/Today keep their collapsible bottom tail.
- **D3 Undo — visible toast + Undo on every completion** (Plan/Week/Today/Miller/Focus),
  matching Morning Handoff; keyboard ⌘Z stays underneath.
- **D4 Composer Enter — Enter submits, Shift+Enter = newline, in all four composers.**
  (Paste-multiline still batches: paste inserts newlines directly, not Enter keypresses.)
- **D5 Selection — click selects (highlight), double-click opens** detail/Focus, arrow
  keys move selection, Escape clears. One model on every surface (Today's model generalised).
  This is the target of `Cmd+Shift+D`.
- **D6 Rail reach — directional swipe + right-click menu.** Two-finger **swipe left =
  reveal Edit / Delete** rail (Delete → "Skip this occurrence" on recurring). Touch = one-
  finger swipe. **Plain mouse = right-click context menu** (Complete/Edit/Move/Delete;
  "Mark not done" when completed) — one shared `TaskContextMenu` reused on every row.

### Input-coverage matrix (checkboxes gone)

- Trackpad / touch: swipe right = complete · swipe left = edit/delete
- Plain mouse: click-select → `⌘⇧D` · right-click → context menu · double-click → detail
- Keyboard: arrows select → `⌘⇧D` · Enter → detail

### Phased delivery (one PR per phase, per repo convention)

**PR 1 — Quick correctness wins** (independent, low risk, ship first)

- Fix Focus recurring-occurrence completion: branch on `isRecurringOccurrence` →
  `recurrence.completeOccurrence`, mirroring `TaskRow.tsx:469` (`FocusCanvas.tsx:238`).
  Reproduce first (roll a recurring occurrence into Focus, hit Done → expect the uuid
  validation failure today).
- Theme 2: add `isError` + `QueryErrorNotice` to Today (`DayPlanCanvas`/`TodayList`),
  `ThisWeekSurface`, `CareTasks`, `CareGardenHome`. Reuse the existing shared component.

**PR 2 — Completion backbone** (no visible affordance change yet)

- Extract a shared `useTaskCompletion` hook: complete/uncomplete + occurrence branching +
  optimistic flip + returns an undo handle. Every surface calls this one path.
- Shared completion toast with Undo (D3), wired into the _existing_ call sites first
  (Plan/Week/Today/Miller/Focus) so undo goes visible everywhere while checkboxes still
  exist. Incremental, low blast radius.

**PR 3 — Consistent selection model (D5)**

- `selectedTaskId` across Plan/Week/Miller (Today already has it): click selects,
  double-click opens, arrows move, Escape clears; one shared selected-row highlight.
- Global `Cmd+Shift+D` completes/uncompletes the selected task via the shared hook.

**PR 4 — Directional swipe + right-click menu + remove checkboxes (D1/D6)** — largest;
may split into 4a (gesture + menu infra) / 4b (checkbox removal + Loose/Miller adoption)

- Extend `useTrackpadSwipeReveal` → directional: right past threshold = complete (spring
  back if short), left = reveal Edit/Delete rail; add pointer/touch support.
- Shared `TaskContextMenu` on right-click (`onContextMenu`) for every task row.
- Remove `Checkbox` from `TaskRow`; drive completed styling off `completedAt`. Add
  swipe + menu (and thus completion) to `MillerTaskRow` and `LooseTaskRow`.
- Note: leave Care `PracticeRow` (different data model) as a follow-up decision.

**PR 5 — Completed-section unification (D2)**

- Week columns: collapsible "Completed · n" group pinned to bottom (`WeekColumn`).
- Miller column: make the pinned completed group collapsible (`MillerColumn.tsx:154`).
- Optimistic completion in Miller via the shared hook (removes the refetch lag).

**PR 6 — Composer keyboard + error merge (Theme 4)**

- Enter=submit / Shift+Enter=newline in `ComposerTextarea` (Plan/Projects); confirm
  Chat/Abyss; update placeholders/hints; verify paste-multiline still batches.
- Merge `ComposerLineErrors` + `ProjectComposerLineErrors` into one component on the
  `text-critical` token; carry `field` on `invalid_property` into the Plan parser; bring
  one-click "Did you mean…?" to both.
- Optional follow-ups: draft persistence + duplicate warnings for Chat/Abyss; align Abyss
  title cap to the shared 500.

Deferred: Themes 5 (empty/loading styling) and 6 (shared-primitive drift — settings
checkboxes, tag chips, date formatter, Button adoption).
