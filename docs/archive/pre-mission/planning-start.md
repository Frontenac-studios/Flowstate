# New Project Brief — Daily Planning App (working name TBD)

You are bootstrapping a brand-new web app that replaces the iOS "RandomDecisionMaker" / "Flowstate" prototype. This brief is self-contained — you do not need to read the existing Swift codebase. Use it as the source of truth for v1 scope and design decisions.

---

## 1. Tech stack (fixed)

- **Frontend**: TypeScript + React (Next.js App Router), HTML, CSS, **Tailwind**.
- **Backend / DB / Auth**: **Supabase** (Postgres + Auth + RLS + Realtime).
- **Hosting**: **Vercel**.
- **AI**: Claude API (Anthropic SDK) with persistent chat memory; designed to later swap in / extend via Claude MCP for personal-context plugins (calendar, notes).
- Keyboard-first UX throughout.

---

## 2. Product vision

A single-user planning app for someone who:

- Captures tasks via a fast, parser-driven quick-input.
- Plans a day in the morning (default flow) and optionally plans a week on Mondays.
- Uses a **Random Decision Maker (RDM)** to pick the next task, weighted toward a manually-pinned **Top 3** for the day.
- Works one task at a time in a **Focus mode** with an AI chat companion and a timer.
- Defers project-level planning (Miller columns, tree, calendar) to a later phase — **not in v1**.

Do **not** build a kanban board anywhere. The week view uses 7 day-columns with drag, but is not styled or framed as a kanban.

---

## 3. Information architecture (Option A — single Plan canvas)

One primary screen `/plan` that morphs by mode:

- **Day mode** (default landing every day except Monday).
- **Week mode** (Monday only — toggle in header enabled; other days it's disabled). User can skip weekly planning in favor of daily.
- **Focus mode** as a route overlay: `/plan/focus` (or modal route). Blurs the canvas; centers task + Claude chat; timer pinned bottom-right.

Side rail: persistent Claude chat panel, toggleable.

Projects route: `/projects/:id` — scaffold the route but leave empty for v1. Eventual contents: Miller columns, object tree (folders containing tasks and sub-folders), and a project calendar board. **Do not implement project internals in v1.**

Header layout:
`[App name] · [Date, e.g. "Tue May 26"] · [Day | Week] toggle · [Chat ☐] · [Settings]`

---

## 4. Day mode — layout (top to bottom)

1. **Task composer** — multiline textarea, autofocused on page load. One task per non-empty line. Placeholder: `add tasks — one per line. ⌘↵ to add.` **Enter** inserts a new line; **⌘Enter** (Ctrl+Enter) submits all lines.
2. **Triage strip** — only renders if yesterday left unfinished tasks. Horizontal row of pill-cards; header text: _"N from yesterday — decide as you plan."_ Each pill has 4 inline action buttons: `[Today] [Tomorrow] [Later] [Drop]`.
3. **Top 3 region** — three numbered slots `① ② ③`. Empty slot = dashed outline reading `pin a task`. Drag target.
4. **Today list** — ordered list of tasks scheduled for today (carryovers + things pre-scheduled). Each row: drag handle · checkbox · title · `#project` chip · `!` priority dots · `⋯` menu. **Top 3 tasks live in Today**; the Top 3 slots above are pointers to them, not duplicates. Top-3 rows render with a `★` icon and a colored left border.
5. **Tomorrow / This Week / Later** — collapsed sections (chevron + count). Click to expand inline. Drag a task onto a collapsed header to move it there.

Empty-page state: quick-input + one-liner _"Capture something, or ask Claude what's on deck."_

### Default time buckets

`Today / Tomorrow / This Week / Later`.

Provide a user setting to switch to **named-day columns** (`Today / Tomorrow / Mon / Tue / Wed / ...`). Default is the relative buckets above.

---

## 5. Task composer parser

One parser pass **per non-empty line** (blank lines ignored). Inline tokens recognized on each line:

- **Date keywords**: `today`, `tomorrow`, `mon`/`tue`/.../`sun`, `fri` etc., or `YYYY-MM-DD` ISO dates → sets task's scheduled date / target bucket. Preview chips show weekday abbreviations for dates in the current ISO week, otherwise the ISO string.
- **`#project`** — files task under matching project; missing project shows inline error with opt-in create + fuzzy suggestions (no auto-create).
- **Priority bangs**: `!`, `!!`, `!!!` → priority 1/2/3.

Semicolon mode (optional): if a line contains `;`, parse it as:

- Split on `;`, trim each segment, drop empties.
- **Segment 0 is always the title**.
- **Segments 1..n are properties**; each property segment must be exactly one of:
  - a date keyword (`today`, `tomorrow`, `mon`/`tue`/.../`sun`, `later`) or valid `YYYY-MM-DD`
  - `#project` slug
  - priority bangs (`!`, `!!`, `!!!`)
- Any property segment that matches none of the above shows an inline error and **blocks submit for that line** (same behavior as an invalid/missing `#project`).

Tokens are stripped from the saved title. Parser runs client-side; show parsed values inline before submit (chips for a single line; compact per-line preview when 2+ lines).

**Composer assist (semicolon mode)**: a property bar above the input shows `title · due · project · priority`, highlighting the active slot. Ghost-text suggests the default for the current segment (`today`, `#project`, `!`). **Tab** accepts the suggestion when one is shown; otherwise Tab moves to the triage strip when present.

**Bulk submit**: ⌘Enter creates all valid lines; lines with invalid `#project` or invalid semicolon properties remain in the composer with per-line errors.

**Parse feedback after submit**: target section expands ~1.5s with a highlight pulse, then re-collapses (pulse-and-collapse). If task lands in Today, just appears in the list.

**Refocus shortcut**: `/` from anywhere on `/plan` refocuses the task composer.

**No duration parsing** in v1.

---

## 6. Top 3 mechanic

- Manually pinned during morning planning (`⌘1` / `⌘2` / `⌘3` while a Today row is selected, or drag into slots).
- Top 3 carries higher weight in the RDM.
- The "size" model: **Top 3 = implicitly large; everything else = small.** No explicit size or duration field on tasks. RDM uses this to interleave large/small picks.
- Completed Top 3 stays visible (crossed-out, still in slot) for the rest of the day — visible proof of progress.
- **Escalation**: if a Top 3 is uncompleted across multiple days, Claude flags it daily in narration / nudges. No automatic priority bump, no force-decide blocker.

---

## 7. Random Decision Maker (RDM)

- Invoked by `⌘D` from anywhere on `/plan` (or a Decide button).
- Picks from **Today** with Top 3 weighted higher, interleaving small picks between large (Top 3) picks where possible.
- Picking a task immediately enters **Focus mode** on that task.
- After completion, auto-rolls the RDM for the next pick (transitions focus to the new task).

---

## 8. Focus mode

Route overlay `/plan/focus`:

- Heavy backdrop-blur (~12px) on the underlying plan canvas.
- **Center card**: task title (large), `#project` + priority below, `[Done]` and `[Park]` buttons.
- Below card: **Claude one-line narration** of why this task was picked, typed in with an animation (e.g. _"Going with **ship onboarding fix** — it's Top 3 and you mentioned it in standup yesterday."_).
- Below that: **chat input** with persistent thread for the focus session.
- **Bottom-right timer**: starts at `00:00`, ticks up. Single button toggles pause/play (shows pause icon when running, play icon when paused).
- **Timer resets on each surface.** Park = abandon timer; next time the task is picked, timer starts fresh.
- `Esc` exits focus → back to plan canvas; timer pauses.
- `⌘Return` = Done. Card flashes "✓ done in Xm" for ~1s, then auto-rolls RDM to next pick.

---

## 9. Claude AI integration

- **Context on day 1**: full — task state, completion history (rolling log of completed tasks + times), and **persistent chat memory across sessions**. Requires a `chat_messages` table from the start.
- **Designed for Claude MCP extension** later (calendar, notes, other personal context plugins).
- **Roles**:
  - Narrate RDM picks (one-liner).
  - Persistent chat sidebar (ask "what should I drop?", "reshuffle today", etc.) — knows your task state.
  - Proactive nudges: if a Top 3 hasn't surfaced/moved by ~2pm, Claude raises it.
  - End-of-day reflective review (see §11).
- **Nudge delivery rules**:
  - Chat open → appears as a new message in the thread.
  - Chat closed → dot indicator on the chat toggle.
  - **Focus mode + chat closed → silent badge only.** Never toast over focus.

---

## 10. Triage strip behavior

- Renders only when yesterday's Today list has unfinished tasks.
- **Manual + keyboard-driven**:
  - `Tab` from quick-input jumps into the strip.
  - Arrow keys navigate between pills.
  - `1` / `2` / `3` / `4` confirms `Today` / `Tomorrow` / `Later` / `Drop` for the focused pill.
- **No AI pre-suggestion** for the strip — it's a reflective moment, no anchoring.
- Strip collapses as it empties.
- Triage is part of planning today (interleaved with capture / Top-3 pinning), **not a precursor**.

---

## 11. End-of-day review

- Triggered at 6pm if `/plan` is open; otherwise surfaced as a banner the next time you open the app after 6pm.
- **Modal overlay** with:
  - Top 3 status (✓ / – / ✓).
  - Other completions count.
  - Small time-on-task chart.
  - Claude's summary paragraph + one reflective question (e.g. _"② slipped two days now — keep, split, or drop?"_).
- **Reflective only — no triage actions in the modal.** Morning triage is the only triage moment. Leftovers flow into tomorrow's triage strip automatically.

---

## 12. Week mode (Monday only)

- Toggle in header is enabled only on Mondays; user may skip in favor of going straight to Day mode.
- Same `/plan` canvas; quick-input stays at top.
- Layout: **7 day-columns** Mon–Sun. Today highlighted. Scrollable by week (arrows / shortcuts).
- Drag tasks from a side inbox rail (or from any column) into days.
- **Claude's role on Monday**:
  - **Reviews last week** — summarizes what got done, what slipped.
  - **Proposes a draft week** from the inbox + carryovers + priorities; user adjusts.

---

## 13. Day rollover

- At local midnight, unfinished Today tasks remain marked as Today (overdue / sticky).
- The next morning, those + any prior leftovers populate the **triage strip** for in-flow triage.
- If the user did EoD review the prior night, that's already reflected; if not, the strip is the catch-all.

---

## 14. Data model sketch (Supabase / Postgres)

Build with RLS scoped to `auth.uid()`. Tables:

- **`projects`**
  - `id uuid pk`, `user_id uuid`, `name text`, `slug text` (matches `#tag`), `created_at`.
- **`tasks`**
  - `id uuid pk`, `user_id uuid`, `project_id uuid null`, `title text`, `priority int` (0–3), `bucket text` (`today` / `tomorrow` / `this_week` / `later`) **or** `scheduled_date date null` — pick one model; relative buckets recompute daily. Recommend storing `scheduled_date` as truth and deriving the bucket label client-side, with a separate `bucket_override text null` for "Later" (no date).
  - `is_top_3 bool`, `top_3_order int null` (1/2/3), `top_3_pinned_at timestamptz null`.
  - `completed_at timestamptz null`, `created_at`, `updated_at`.
- **`task_time_entries`** (optional v1, useful for time-on-task chart)
  - `id`, `task_id`, `started_at`, `ended_at`, `reason text` (`done` / `park` / `esc`).
- **`chat_messages`**
  - `id`, `user_id`, `thread_id` (e.g. per focus session or one global thread — TBD), `role` (`user` / `assistant` / `system`), `content jsonb`, `task_id null` (if focus-scoped), `created_at`.
- **`day_reviews`**
  - `id`, `user_id`, `date date`, `summary text`, `top_3_status jsonb`, `created_at`.
- **`app_settings`**
  - `user_id pk`, `bucket_mode text` (`relative` / `named_days`), other prefs.

RLS: every table → `user_id = auth.uid()` for select/insert/update/delete.

---

## 15. Route map

- `/` → redirects to `/plan` (auth-gated).
- `/login` → Supabase auth.
- `/plan` → Day mode (or Week mode on Mondays if toggled).
- `/plan/focus` → Focus mode overlay (intercepting modal route preferred so background stays mounted).
- `/projects/:id` → empty scaffold for v1.
- `/settings` → bucket mode toggle, AI key/config, sign out.

---

## 16. Keybindings (v1)

- `/` — focus quick-input from anywhere on `/plan`.
- `Tab` — jump from quick-input into triage strip (when present).
- `1` / `2` / `3` / `4` — triage pill actions.
- `⌘1` / `⌘2` / `⌘3` — pin selected Today row to Top 3 slot 1/2/3.
- `⌘D` — invoke RDM → enter Focus mode.
- `⌘Return` — mark current focus task Done.
- `Esc` — exit Focus mode.
- `⌘K` (suggested) — toggle Claude chat side rail.

---

## 17. Out of scope for v1 (explicitly)

- Kanban boards (any flavor).
- Project internals: Miller columns, object tree, project calendar board. (Route stub only.)
- Duration / time estimates on tasks.
- T-shirt sizing on tasks.
- Auto-rollover of unfinished Today at midnight (we use morning triage instead).
- Multi-user / collaboration.
- Mobile-first layouts (desktop-first; mobile-responsive is nice-to-have).

---

## 18. Build order (suggested)

1. Next.js + Tailwind + Supabase + Auth scaffold. Empty `/plan`.
2. Schema + RLS migrations. Generated TS types.
3. Quick-input + parser + task CRUD. Today list rendering.
4. Tomorrow / This Week / Later sections + drag-between.
5. Top 3 slots + pinning + visual treatment.
6. Triage strip + keyboard nav.
7. RDM logic + Focus mode overlay + timer.
8. Claude integration: narration + chat sidebar + persistent memory (`chat_messages`).
9. Proactive nudges (2pm Top-3 stall) + silent-badge rules in focus.
10. End-of-day review modal.
11. Week mode (Monday): 7-day columns + Claude weekly proposal.
12. Settings: bucket mode toggle.

Ship items 1–7 as an internal milestone before wiring Claude — the planner must stand on its own without AI.

---

## 19. Design principles

- Keyboard-first; mouse is a fallback.
- Minimal UI; no decorative chrome.
- One canvas, no tab-hopping for the core daily loop.
- AI is a companion, not a gatekeeper — it never blocks user action.
- Decisions are reversible (drag back, un-pin, undo Drop within a session).
