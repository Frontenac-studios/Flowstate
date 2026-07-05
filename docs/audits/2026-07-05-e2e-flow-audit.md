# Flowstate / Kash — E2E User-Flow Audit

Section-by-section audit of every user action (buttons, inputs, composers, drag/drop,
keyboard shortcuts, nav, dialogs). Combined method: live browser E2E on the running dev
server (every route loaded + interacted with) **plus** deep code tracing of each action to
its handler. **No code was changed.**

Severity legend: 🔴 **Broken** (does nothing / errors / data-loss shaped) · 🟠 **Inconsistent**
(works but diverges from app patterns) · 🟡 **Missing** (expected state/feedback absent) · ⚪ **Polish**

Live status: every route renders except `/health` (500). No console errors on Today/Plan/
This-Week/Backlog/Projects/Care/Settings.

---

## 0. Cross-cutting themes — fix once, benefits everywhere

These recur across many sections. Fixing them centrally clears dozens of the per-section items below.

- 🟠 **Autocomplete parity is the headline gap you flagged — and it's systemic.** Inline
  task-property tab-complete (project / tag / priority / due) lives in essentially **two** places
  (`QuickInput` via `composer-assist.ts`, and `NewItemRow` via a _separate_ `project-composer-assist.ts`).
  **Every other task-property input is plain text with no completion:** inline title edit
  (`TaskRow.tsx:496`), occurrence edit (`OccurrenceMenu.tsx:177`), week/backlog capture
  (`AbyssComposer.tsx:102`), Bingo goal add (`BingoQuickAdd.tsx:52`), month intentions
  (`MonthIntentionsEditor.tsx:84`), quarter theme (`QuarterThemePicker.tsx:81`), task-detail
  category (`TaskDetail.tsx:168`) & tags (`TaskTagsEditor.tsx`), the morning "Pull from a project"
  search (`MorningHandoffModal.tsx:331`), and a raw-UUID "Link existing task ID…" field
  (`BingoGoalPanel.tsx:373`). Also the two autocomplete engines can **drift** — the recent
  "project slug in any semicolon segment" fix landed only in the plan engine, so Plan and Project
  pages ghost differently for the same typing.
- 🟡 **Silent write failures are pervasive.** A large majority of mutations across Plan, Projects,
  Abyss, Care, Settings, chat and nudges have `onSuccess` but **no `onError`** and no optimistic UI.
  Failed drags/pins/deletes/saves look like dead buttons. This directly violates CLAUDE.md's
  error-handling posture. (Individually listed per section below.)
- 🟡 **Missing query loading/error states.** Most `useQuery` calls destructure `data = []` with no
  `isError` branch, so a failed fetch renders as a genuinely-empty surface (empty week / month / year /
  backlog / project board / projects list). A brand-new user and a broken fetch look identical.
- 🔴 **`className` template-concat missing-space bug (2 instances, app-wide scan).** Kills the intended
  animation silently: `gap-2${locking…}` → `gap-2bingo-lock-grid` (`BingoGrid.tsx:34`), and
  `p-2.5${isSinking…}` → `p-2.5abyss-park-sink` (`AbyssComposer.tsx:97`).
- 🟡 **No per-route error boundaries.** Only a top-level `global-error.tsx` exists — no `error.tsx`,
  `not-found.tsx`, or `loading.tsx`. So any server-component throw (see `/health`) becomes a blank
  white 500, and bad dynamic ids fall to the bare Next.js 404 with no app chrome.

---

## 1. Global chrome & navigation

- 🔴 **Essential-nudge actions swallow failures.** `goal_step_add` / `balance_add` run
  `createTask`/`promoteAbyss` in `void(async…)()` with `catch {}` then always `dismiss()`
  (`useEssentialNudges.ts:198-215`). If the mutation throws, the chip vanishes as if it worked —
  data-loss shaped. No toast, no retry.
- 🟠 **`/today/focus` drops all global chrome.** It renders `FocusLayout`, not `AppShell` — so no
  nav rail, no `⌘K` palette, no `⌃I` inbox, no nudges. Shortcuts users learned elsewhere silently die;
  only escape is one "Back to plan" link (`today/focus/page.tsx`, `FocusLayout.tsx:18`).
- 🟡 **Abyss quick-capture (`⌘⇧A`) has no discoverable trigger** — no button, no `kbd` hint, no
  command-palette entry (`AppShellOverlays.tsx:115`, `CommandPalette.tsx:38-78`). A whole capture
  surface is reachable only if you already know the chord.
- 🟠 **Essential-nudge dismissals are session-only** (`useEssentialNudges.ts:66`, a `useState<Set>`),
  so dismissed nudges reappear on reload — while EoW review dismiss persists to storage. Inconsistent.
- 🟡 **`DesktopSyncBanner.tsx` is never mounted** (dead component; nav footer indicator covers sync).
- 🟠 **Stale config / docs:** `LeftNavRail.tsx:50` still matches `/abyss` (now a redirect to `/backlog`);
  `ProactiveNudgesRunner.tsx:6` docstring claims it mounts on `/today/focus` but actually mounts on
  `/care` (and Focus has no shell, so nudges can never show there).
- ⚪ Command palette offers "Go to Today" while already on `/today` (harmless no-op). No central
  keyboard-shortcut cheatsheet exists. Palette itself is solid (Esc + backdrop close, focus trap,
  keyword search, empty state all verified in code).

_Verified working: all nav links resolve; active highlighting works; inbox 1-4 + arrows wire to real
mutations; `⌘K`, `⌃I`, `⌘/` triggers work; "Decide next task" dispatches correctly on Today/Plan._

---

## 2. Today (list / calendar / review, ritual, focus, EOD)

- 🔴 **Morning "Pull from a project" is dead during onboarding.** `OnboardingModal` mounts
  `MorningHandoffModal` with `projects={[]}` and `onPullProjectTask={() => undefined}`
  (`OnboardingModal.tsx:122,136`) — first-run users see a search affordance that can never return
  anything or do anything.
- 🟠 **"Pull from a project" search lacks the composer's project autocomplete** — plain
  `<input type="search">` with substring filter, no tab-accept/ghost/`#project` syntax
  (`MorningHandoffModal.tsx:331`) vs `QuickInput.tsx:97/366`. Two project-pickers on the same surface
  behave completely differently.
- 🟡 **`⌘D` "Decide next task" silently no-ops on an empty/all-done day** — `triggerRdmPick` returns
  with no feedback if there's nothing to pick (`DayPlanCanvas.tsx:255`), while the timeline chip still
  advertises "⌘D drops the next block here" (`TimelinePane.tsx:826`).
- 🟡 **`⌘1/2/3` pin-to-slot no-ops with no hint when no row is selected** (`DayPlanCanvas.tsx:493`).
- 🟡 **Focus "Park"/"Done" have no in-flight disable and no error handling** — `endSession`/`complete`
  are awaited with no try/catch; a rejected completion flashes "✓ done" but strands unsaved state
  (`FocusCanvas.tsx:175-223`).
- 🟠 **Task-row inline edit is title-only, plain `Input`** (`TaskRow.tsx:496`) — a property you could
  type at capture (`; !!; #project; due`) can't be edited inline afterward.
- 🟡 **No empty-state for Calendar/Timeline view** when the day has zero tasks/blocks — Calendar shows
  a blank grid with no guidance (`TimelinePane.tsx:874`).
- 🟠 **Submit-key conventions diverge across Today text inputs:** composer = `⌘↵`, manual-win = Enter,
  title edit = Enter, EOD reflection = button-only — none documented on the control.
- ⚪ Inbox triage (1-4) and EOD leftover triage buttons have no pending guard → rapid keys double-fire
  (`InboxPanel.tsx:166`, `EodLeftoverTriage.tsx:86`). View switcher (List/Calendar/Review) state isn't
  persisted — resets to List every visit (`DayPlanCanvas.tsx:96`). `Top3ReplacePicker` positions off a
  one-time `getBoundingClientRect`, detaches on scroll (`Top3ReplacePicker.tsx:39`).

---

## 3. Plan (Week / Month / Quarter / Year / Goals + Bingo)

- 🔴 **`BingoGrid.tsx:34` className concat bug** (see cross-cutting) — lock-in animation never fires.
- 🔴 **`MonthColumn.tsx:41` month-header "zoom to month" button is dead** for non-QuarterView callers
  (`onZoomMonth` undefined) — renders as a hover-underline affordance that does nothing.
- 🔴 **Bingo "Link existing task ID…" requires a hand-typed internal UUID** (`BingoGoalPanel.tsx:371`),
  no picker/search; `linkTask`/`createTask` have no `onError` and the field clears optimistically, so a
  bad id silently no-ops looking successful.
- 🟡 **TaskRow delete & skip-occurrence fail silently** (`TaskRow.tsx:243,264`).
- 🟡 **Drag-to-schedule / pin / reschedule have zero optimistic UI** across `WeekCanvas.tsx:233-285`
  and `DayPlanCanvas.tsx:329-363` — the card only moves after the round-trip; on a slow network the
  drag looks dead. None of these six+ core mutations have `onError`.
- 🟠 **Week board rows have no double-click-to-open** (`WeekColumn.tsx:112`) though Today rows do —
  inconsistent row behavior. Pin hint says "Swipe right to pin" but the affordance is a click
  (`DayPrioritiesSlots.tsx:99`); swipe is trackpad-only, misleading on desktop.
- 🟡 **AI "suggest" flows give no feedback on empty results** (`BingoGoalPanel.tsx:256`,
  `ReservedDayGhosts.tsx:87`, `QuarterSpreadGhosts.tsx:81`) — button flips back from "Suggesting…"
  with nothing rendered. Ghost apply-loops (`CheckInGhosts`, `BalancePassGhosts`, `WeekDraftGhosts`)
  abort mid-loop on one rejection, leaving a partial apply looking successful.
- 🟡 **`BingoGoalPanel.tsx:129` swallows a detail-query error into permanent "Loading goal…"**;
  `BingoCard.tsx:304` a query error falls through to "Start your card" CTA, inviting a duplicate card.
- 🟡 **Modals `CheckInModal` / `MorningHandoffModal` / `OnboardingModal` lack focus trap, scroll-lock,
  and Escape-to-dismiss** (contrast `KeyboardShortcutsModal.tsx:44`).
- ⚪ Reserved-day `<input type="date">` has no month min/max bound (`ReservedDaysPanel.tsx:128`);
  `QuarterThemePicker` double-fires persist on chip-toggle + blur; `MonthCalendarView` drops 3rd+ marker
  with no "+N"; `KeyboardShortcutsModal` documents `⌘Enter` twice with conflicting meanings.

---

## 4. This Week

- 🔴 **Lens Group/Filter/Tag chips do nothing on This Week.** `LensControlBar` renders and toggles
  `aria-pressed`, but `WeekCanvas` maps tasks straight to columns and never consults `state.filters` /
  `state.group` / `tagFilter` (`ThisWeekSurface.tsx:63`, `WeekCanvas.tsx:500`). Dead controls.
- 🔴 **"Later" tasks can be seen but not dragged back into the week** — droppables exist only for
  inbox and day columns (`WeekCanvas.tsx:365`), and `WeekLaterBacklog` rows expose only complete/delete.
  Only escape is edit.
- 🟡 No week-level over-commit warning (per-day only, `WeekCanvas.tsx:208`); "Draft my week" has no
  empty-inbox guard.
- ⚪ `AddProtectedBlockButton` is hover-gated on desktop (invisible until hover); its category select
  can't set a label/time that the chip then displays (`AddProtectedBlockButton.tsx:55`).

---

## 5. Backlog / Abyss (`/abyss` → redirects to `/backlog`)

- 🔴 **`AbyssComposer.tsx:97` className concat bug** (see cross-cutting) — park-sink animation dead.
- 🔴 **Monthly "Stargazing review" shows only cluster labels, no items**, then "Done stargazing" fires
  `recordResurface.mutate` per member in an unbounded fire-and-forget loop with no pending/error state
  (`AbyssMonthlyReview.tsx:39-49`). Closing via ✕ doesn't record the month, so it reappears next visit.
- 🟠 **Backlog capture has none of the composer grammar** — plain title `<input>`, no
  `#project`/`!priority`/`@tag`/due parse, no tab-complete (`AbyssComposer.tsx:102`). Also can't
  free-type a tag at capture (only accept auto-suggested chips), though the post-capture tag _editor_
  has a full autocomplete input (`AbyssTagEditor.tsx:115`).
- 🟡 **Row-level "Today" promote & trash fail silently** (`AbyssList.tsx` Row: `deleteMutation`,
  `promoteToday` have no `onError`), unlike `AbyssPromoteMenu` which shows an error line. `abyss.create`
  also has no `onError`. `AbyssEmergingCard.apply()` swallows partial `setTags` failures.
- 🟡 **No query-error state on the main list** (`AbyssRoot.tsx:32`) — a failed load shows "The deep is
  empty," misrepresenting an error as an empty backlog.
- ⚪ Embedding/tag-suggest failures are swallowed by design — combined with the above, suggestions can
  silently never work with zero signal. Filters hidden in themes/sky views but the search query still
  applies.

---

## 6. Projects (list / detail / imports)

- 🔴 **Slip/replan apply leaves task data stale** — invalidates phases but **not** `tasks.listByProject`
  (`ProjectSlipReplanCard.tsx:43`); task-derived dates stay stale, and the card self-dismisses so it
  can't reappear even if the slip persists. No `onError` either.
- 🟡 **No error surface if the workspace phase/task queries fail** (`ProjectWorkspace.tsx:66,88`) — the
  board renders permanently empty with a live composer. `ProjectsIndex.tsx:27` likewise shows "Start
  your first project" on a failed projects fetch.
- 🟡 **No delete/archive action anywhere in the Projects UI** — a `projects.delete` mutation exists
  (`routers/projects.ts:588`) but `ProjectMenu.tsx:63` exposes only "Import history" / "Save as
  template." Projects can't be removed or manually closed.
- 🟡 **Task detail has no due-date / schedule editor** — you can set `due` at capture but there's no UI
  to view/change it afterward (`TaskDetail.tsx`; `tasks.update` has no dueDate field either).
- 🟠 **New project doesn't navigate you into it** — `NewProjectForm` calls `onCreated(project.id)` but
  the index drops the id (`ProjectsIndex.tsx:97`), leaving you on the list instead of the new workspace.
- 🟠 **`ConfirmDialog` fires the destructive action on Enter** (auto-focused confirm button,
  `ConfirmDialog.tsx:47,61`) — pressing Enter right after opening a phase/task delete dialog deletes
  with no typed-confirmation guard.
- 🟡 Slip/replan, template-suggest, and similarity-complete **chips** swallow mutation errors
  (`ProjectTemplateSuggestChip.tsx:18`, `ProjectSimilarityCompleteChip.tsx:43`), while the template
  _dialog_ path does show errors — inconsistent.
- ⚪ Dead components `CategoryFilter.tsx` and `MillerGhostColumn.tsx`; Gantt drag-reschedule has no
  pending/error feedback (`GanttBar.tsx:87`); per-category empty invitation can't create into that
  category.

_Verified solid: 404 for bad/missing project id is handled correctly at the app layer
(`[id]/page.tsx:30`), delete confirmations exist with accurate copy, reorder avoids flicker._
(Note: my live test of a bad **but well-formed** UUID showed the bare Next.js 404 — app-styled
not-found within the shell would be more consistent; see cross-cutting error-boundary item.)

---

## 7. Care

- 🔴 **`PracticeMenu` renders "Mark lifts me" 5× identically** (copy-paste), before Edit/Remove
  (`PracticeMenu.tsx:126-161`). The ⋯ menu is visibly broken.
- 🟠 **Reflection "Save" is permanently disabled if the prompt query fails/empties** —
  `disabled={!promptText}` and `promptText` derives solely from the saved reflection or the prompt query
  (`CareReflection.tsx:110,55`); a query error means you can write but never save, with no error shown.
- 🟡 Adopt / create-reserved-day / restore mutations have `onSuccess` only, no error UI
  (`SuggestedSection.tsx:25`, `RestorativeTimeCard.tsx:20`, `AbyssArchivedList.tsx:13`).
- ⚪ Orphaned/dead components: `CareWins.tsx`, `CareStats.tsx`, `CareTravel.tsx`, `CareComingSoon.tsx`
  are unimported; `care-tabs.tsx` still exports "coming soon" copy for tabs that now render real content.

---

## 8. Health `/health` 🔴 **BROKEN — hard 500, blank white page**

- 🔴 **Returns HTTP 500 and renders a blank page.** Observed live: the server-component `Promise.all`
  of `healthChecks.list` + `getLatest` throws (`health/page.tsx:27`) — in this run the DB connection
  pool was exhausted (`PostgresError 53300: remaining connection slots are reserved for roles with the
SUPERUSER attribute`). Because there's **no try/catch and no `error.tsx`**, the whole route white-
  screens instead of degrading. The page _has_ empty-states in code but never reaches them on a DB error.
- 🟡 **Unauthenticated + unlinked.** `/health` is not in `PROTECTED_PREFIXES` (public) and its tRPC
  procedures use `baseProcedure` (no auth), while every sibling gates on the session. It's also absent
  from nav and the command palette — a public route that can 500. Decide: internal ops page (then gate
  it / move it behind auth or a flag) vs. user-facing (then link it + add error handling).
- ⚠️ The connection-pool exhaustion itself is worth a look — if it recurs under normal load it points at
  a pooling/connection-lifecycle issue, not just this page. (The rest of the app recovered immediately.)

---

## 9. Settings

- 🔴 **AI-suggestion Accept/Dismiss fails silently** — `accept`/`dismiss` have only `onSuccess`
  (`SectionSuggestions.tsx:28`); the `accept` procedure throws at the values cap
  (`about-me.ts:279`) but the user just sees the ghost not disappear. Looks like a dead button.
- 🔴 **Prose "Work"/"Life" editor gets stuck on "Saving…" on failure** — status is set before mutate
  and only cleared in `onSuccess`, no `onError` (`ProseSection.tsx:45`). A failed save shows "Saving…"
  forever and silently loses the typed text.
- 🟠 **Assistance toggles clobber each other on rapid clicks** — each `save()` builds its patch from the
  stale `data` snapshot, so toggling two before a refetch reverts the first
  (`AssistanceSettingsSection.tsx:62`).
- 🟠 **Mixed save models with no cue** — most controls auto-save on change/blur, but Default-week,
  Constraints, and Values use explicit Add/Save buttons; and only ProseSection shows a "Saved"
  affordance, so success is invisible everywhere else.
- 🟡 Working-hours draft isn't reconciled on save failure (control keeps showing the unsaved value,
  `SettingsForm.tsx:88`). No client-side Zod on the login/settings inputs (CLAUDE.md mandates Zod).
  Account tab is a stub (Sign out only) — flag if profile/password/danger-zone were expected.
- ⚪ Constraint time range not validated (`end > start`) unlike siblings; category reorder has no
  optimistic move; Constraints has no loading state → false-empty flash on first paint.

---

## 10. Login / Auth

- ✅ Sign-in is correctly wired (`signInWithPassword`), surfaces `error.message` via `role="alert"`,
  disables the button while loading, redirects to `next`. **Correctly offers NO public sign-up / reset /
  magic-link** (per the no-public-signup rule) — verified absent.
- 🟡 No client-side Zod validation (relies on HTML `type=email`/`required`); auth errors shown raw
  ("Invalid login credentials"); no `autoFocus` on email; sign-out swallows a thrown error but still
  bounces to `/login` (acceptable).
- Note: in dev, `isAuthBypassed()` is true (`NODE_ENV==='development'`), so the login gate is skipped —
  expected/documented, but means the login flow can't be exercised end-to-end via the local dev server.

---

## 11. Ask Claude (chat) & daily-wins

- 🔴 **Stop is a no-op in the first moment after Send** — `abortRef` is only set inside `runStream`, but
  Send first awaits `appendUserMutation.mutateAsync` (`useChatPanel.ts:203`); a Stop during that window
  does nothing and the request proceeds.
- 🟡 **Proposal Confirm/Dismiss have no try/catch, no success/error feedback** — a failed
  `applyProposedAction` throws unhandled; the card stays "pending" with no message, or vanishes on
  refresh with no confirmation (`useChatPanel.ts:270-288`).
- 🟠 **"What should I work on?" (`work_on`) suggestion has no catch** — a failure throws with no
  `streamError`/toast, unlike the normal send path (`useChatSuggestions.ts:74`).
- 🟡 **No streaming indicator before the first token** — `streamingText` is `""` so `MessageList`
  renders nothing while the composer is disabled → frozen empty panel (`useChatPanel.ts:200`,
  `MessageList.tsx:203`). No retry affordance on stream error (`ChatRail.tsx:106`).
- 🟡 **Composer autocomplete depth (re: your task-property concern):** it's a **ghost-text + Tab-accept**
  model with **top-1** suggestion only — there is **no arrow-key nav, no clickable list, no Enter-to-
  accept, no Escape-to-dismiss, no "no match" hint** (`composer-assist.ts:133`, `QuickInput.tsx:366`).
  With two similar project names you can only ever Tab the top fuzzy match. An empty project segment
  ghosts `projects[0]` you never typed, undismissable except by typing.
- ⚪ Daily-wins: manual-win `Input` has no `maxLength` (long labels fail server-side into a generic
  error, `DailyWinsTracker.tsx:147`); Keep/Remove/Move have no optimistic UI; `triggerSettle` timeout
  isn't cleaned on unmount. `ConfirmActionCard` "Confirm" disables at 0 checked with no hint why.

---

## Suggested fix ordering

1. **`/health` 500 + add route error boundaries** (`error.tsx`) — a white-screen is the worst UX here,
   and boundaries also fix the bare-404 chrome loss. Decide health's auth/nav story.
2. **The 2 `className` concat bugs** — one-character fixes, restore intended animations.
3. **`PracticeMenu` 5× duplicate button** — obvious visible breakage.
4. **Dead controls:** This-Week lens chips, `MonthColumn` zoom button, morning "Pull from a project"
   in onboarding, Bingo raw-UUID link field.
5. **Silent-failure sweep:** add `onError` + user feedback to the high-traffic mutations (Plan drag/pin/
   delete, chat proposal apply, nudge actions, Settings prose/accept, Abyss row actions). Consider a
   shared toast helper so this stops recurring.
6. **Autocomplete parity decision:** either extend `composer-assist` to the inline-edit / quick-add /
   backlog / task-detail inputs, or consciously scope it — and unify the two engines so they can't drift.
7. Query error/empty-state pass; modal focus-trap/Escape pass; the polish items.
