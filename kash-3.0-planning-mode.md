# Kash 3.0 — Planning Mode Spec

> The implementation spec for §8 (Planning Mode) of `kash-3.0-plan.md`. Decisions made in the
> Planning Mode session (Jun 22 2026), run page-by-page through a four-part lens:
> **(a) purpose · (b) mechanism · (c) visualization · (d) decomposition** (how goals break down into
> doable tasks and surface in day-to-day use). Companions: `kash-3.0-plan.md` (§8), `kash-3.0-build-breakdown.md` (§8).

---

## 0. Guardrails (locked before this session — do not reopen)

- A **"Plan"** rail item with a **zoom switcher: Week ↔ Month ↔ Quarter ↔ Year ↔ Bingo** (NAV-1, Jun 25).
  **Bingo is the 5th Plan sub-tab**, not a separate rail item.
  _(Jun 22 NAV-6 rail placement superseded Jun 25 — see `kash-3.0-plan.md` §4.)_
- Bingo/annual goals are **category-tagged** (each goal exactly one of the 5 categories).
  _(Revised Jun 22 gap-pass: the Bingo is now a literal **5×5 card** — fixed 25-cell total but
  **free category mix** per cell, so no per-category quota. See §7.)_
- Cadence is **nested**: quarterly themes set direction, monthly intentions make them concrete.
- The **balance pass** is a soft, optional closing step that suggests — **never forces**.
- The **AI** drafts horizons, rolls goals down into weeks, and references **core values (3–7, flat)** (§13).

## 1. The decomposition spine (the through-line)

A goal flows down one link per page, with progress rolling back up:

```
Annual goal → Quarter theme → Month intention → Week plan → Day (Today) tasks
        ↑__________ progress rolls back up: task done → milestone → goal % ___________|
```

Every page owns one link. Two structural consequences emerged and apply app-wide:

- **The Check-in (PM-7)** is the engine that advances this spine over time (assign horizons,
  decompose, re-assess) — incrementally, in small bites.
- **Goals promote to Projects when they grow (PM1-10, rev. §7/GP4-4)** — a goal starts as a
  lightweight panel; once it has enough milestones/tasks it's promoted to a Project (or attached as a
  phase of one), reusing Projects/Miller/Gantt (§9). Not every goal is a Project up front.

---

## 2. Decision log

| #      | Decision                     | Choice                                                                                                                                                      |
| ------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PM-A   | Year-view form               | Quarter cards; **clicking a quarter zooms into the Quarter view** (holds the week scroll, NAV-2); heatmap **merged in** — **shipped / ratified Jul 1 2026** |
| PM1-1  | Goal: obligation vs desire   | Soft **optional** flag                                                                                                                                      |
| PM1-2  | Goal: value link             | **Optional** link to a core value (§13, 3–7 flat set)                                                                                                       |
| PM1-3  | Goal: progress model         | **Hybrid** — milestones, each auto-completed by linked tasks                                                                                                |
| PM1-4  | Goal: target horizon         | Starts **"this year"**; horizons assigned later at Check-ins                                                                                                |
| PM1-5  | Goal: progress reach         | Everywhere, but **Year view hides it by default** (drill-in); goal + Check-in show it directly                                                              |
| PM1-6  | Annual-goals page shape      | ~~List~~ → **superseded (§7):** 5×5 Bingo **card** primary, **list on toggle**                                                                              |
| PM1-7  | Balance viz on goals page    | Balance **bar + gap nudge**                                                                                                                                 |
| PM1-8  | Reward                       | ~~Balance bingo~~ → **superseded (§7):** classic **line bingo** (row/col/diag, free center)                                                                 |
| PM1-9  | Decomposition trigger        | **Both** — manual on the goal + AI in the Check-in (incremental)                                                                                            |
| PM1-10 | Goal ↔ Project               | ~~Always a Project~~ → **superseded (§7):** panel-only, **promote to Project when big**                                                                     |
| PM1-11 | Day-to-day goal marker       | **None** — goal-linked tasks look like any task                                                                                                             |
| PM1-12 | Capacity / expectation       | **Both** — soft page nudge + Check-in                                                                                                                       |
| PM2-1  | Year encoding granularity    | **Two-level** — proportional bar on quarter cards, dominant-color dots on week cells                                                                        |
| PM2-2  | Year: planned vs actual      | **Actual only** (driven by completed-task / time data — ties to Phase 2 aggregation)                                                                        |
| PM2-3  | Year interactivity           | **Overview + light placement** (drag a goal onto a quarter to set its horizon)                                                                              |
| PM2-4  | Neglected-category signal    | **Calm callout by default; per-category strips on drill-in**                                                                                                |
| PM3-1  | Quarter theme                | **Phrase + focus categories** (structured — app can nudge on a neglected focus area)                                                                        |
| PM3-2  | Quarter → month distribution | **Manual drag + AI-proposed** spread                                                                                                                        |
| PM3-2b | AI suggestion behavior       | **Ghosted, opt-in** — dashed; nothing changes until you accept/drag                                                                                         |
| PM4-1  | Monthly intentions           | **Per-category lines** (color-coded)                                                                                                                        |
| PM4-2  | Month layout                 | **List default, calendar on toggle**                                                                                                                        |
| PM4-3  | 1–2 reserved self-care days  | **Flexible, AI-suggested** into real dates → become **suggested** protected blocks (§7)                                                                     |
| PM5-1  | Week view structure          | **Same view; planning rail + AI draft on a "Plan mode" toggle**                                                                                             |
| PM5-2  | Week scheduling              | **Drag + AI draft (ghosted)**                                                                                                                               |
| PM5-3  | Week → Today handoff         | **Today's column IS Today** — scheduling sets the date; no re-entry                                                                                         |
| PM6-1  | Balance-pass source          | **Both** — resurface backlog/Abyss **+** generate new                                                                                                       |
| PM6-2  | Balance-pass trigger         | **Auto at end of planning** (always dismissible)                                                                                                            |
| PM6-3  | Balance model                | **Two-tier** — near-zero **floor** flags first, then below-intention **target** gaps                                                                        |
| PM7-1  | Check-in trigger             | **On-demand + gentle cadence** (set/snooze)                                                                                                                 |
| PM7-3  | Check-in autonomy            | **Propose, apply on confirm** (ghosted/opt-in)                                                                                                              |
| PM7-4  | Check-in default scope       | **Ask each time** — small-bite framing                                                                                                                      |

---

## 3. Pages

### PM-1 · Annual Goals (the Bingo page)

- **Purpose:** top of the funnel — keep _desires_ alive beside _obligations_ across all 5 categories.
- **Goal anatomy:** title · 1 category (drives balance) · optional obligation/desire flag · optional
  core-value link · hybrid progress (milestones → linked tasks) · target horizon (starts "this year").
- **Layout:** a **list** of category-colored rows; a **balance bar + gap nudge** on top
  ("Body & Mind looks light").
- **Reward:** completing one goal in _every_ category = a gentle **balance bingo** (feeds §12 garden).
- **Decomposition:** break down manually or via the Check-in; every goal is backed by a **Project**
  (milestones ≈ phases) or attached as a phase of an existing one; linked tasks schedule into weeks and
  appear in Today like any task (**no special marker**). A soft **capacity nudge** (page + Check-in)
  flags when active goals outstrip a realistic week.

### PM-2 · Year view

- **Purpose:** the only whole-year glance — spot a neglected category early; navigate into quarters.
- **Form:** **quarter cards** (theme + balance bar), each expands to a **per-week scroll**; the balance
  **heatmap is merged in** (no separate heatmap surface).
- **Encoding:** **two-level** — proportional balance bar on roomy quarter cards; dominant-color dots on
  tiny week cells. Shows **actual** attention (from completed-task/time data).
- **Interactivity:** overview + **light placement** (drag a goal onto a quarter to set its horizon).
- **Gap signal:** calm single callout by default; full **per-category strips on drill-in** (progressive
  disclosure). Goal progress is likewise hidden until you drill into a goal/quarter.

### PM-3 · Quarter view

- **Purpose:** set direction (the quarterly **theme**) and distribute the quarter's goals across months.
- **Theme:** a phrase **+ 1–2 focus categories** (structured) so the app can nudge if a focus area goes
  light and bias balance suggestions toward it.
- **Distribution:** **manual drag + AI-proposed** spread across the 3 months; AI suggestions are
  **ghosted/opt-in** (dashed; nothing moves until accepted). Unassigned goals wait in a tray.

### PM-4 · Month view

- **Purpose:** make the quarter concrete via monthly **intentions**; reserve the 1–2 self-care days.
- **Intentions:** **per-category lines** (color-coded), tied to the quarter's focus categories.
- **Layout:** **list by default, calendar on toggle** (calendar only when you need to place dates;
  avoids duplicating Week/Today).
- **Reserved days:** reserved **flexibly** ("sometime this month"); the **AI suggests specific dates**
  from free time; they become **suggested** protected blocks in the Week (§7), never hard events.

### PM-5 · Week view (planning → execution bridge)

- **Purpose:** where planning becomes doing; the handoff into Today.
- **Structure:** the **existing §7 Week view**, with a planning **rail + AI draft** that appear only in a
  **"Plan mode" toggle** (calm daily use; planning tools on demand).
- **Scheduling:** pull intended work (goal milestones + month intentions) onto days via **drag**, or
  accept a **ghosted AI week draft**.
- **Handoff:** **today's column _is_ Today** — scheduling a task sets its date; Today simply shows
  today's dated tasks. One source, no re-entry.

---

## 4. Cross-cutting mechanisms

### PM-6 · Balance pass

- Soft, **dismissible** closing step that runs **automatically at the end of planning** (day/week/horizon).
- **Two-tier model:** (1) **floor** — flag any category at near-zero attention, regardless of targets;
  (2) **target gap** — flag categories below a stated month/quarter intention or per-category target.
  Floor flags rank above target gaps; "empty + a stated focus" is the loudest.
- **Suggests from both** the existing backlog/Abyss (resurface) **and** newly generated ideas, as
  ghosted add-suggestions you accept or dismiss.

### PM-7 · Check-in

- An on-demand **+ gentle-cadence** reflective planning conversation (set/snooze the cadence).
- Reviews progress, surfaces capacity/balance, proposes a **small** next slice of planning, and updates
  goals/projects/tasks — **proposing changes and applying on confirm** (ghosted/opt-in).
- **Asks how deep to go each time**, defaulting to a small bite (ADHD-friendly). This is the engine that
  advances the decomposition spine and assigns horizons over time.
- _Deeper AI behavior (modes, About-me doc, tool catalog) belongs to §11; this spec covers only the
  Check-in's Planning role._

---

## 5. Data-model implications (draftable — derive during build)

New/extended tables implied by the above (RLS-scoped, SQLite-mirrored per the cross-phase rules):

- `goals` — title, `category`, `obligation_desire` (nullable enum), `value_id` (nullable → §13),
  `target_horizon` (year/quarter/month, nullable), backing `project_id`, derived progress.
- `goal_milestones` — `goal_id`, title, order, completion (derived from linked tasks).
- task ↔ goal/milestone link (likely a `milestone_id` nullable FK on `tasks`, mirroring the
  dependency-column approach).
- `quarter_themes` — period, phrase, `focus_categories[]`.
- `month_intentions` — period, `category`, text (one row per category per month).
- `reserved_days` — month, type (outside/personal), resolved date (nullable while flexible) → emit
  suggested protected blocks.

## 6. Build dependencies (not open design)

- **Reward/celebration mechanics + garden growth** → §12 Care (stub `recordBingoReward()` until Care ships).
- **Abyss as a balance-pass source** → §10 (stub empty tray until Abyss ships).
- **Values picker on goals** → §13 (`value_id` nullable until Values PR lands).
- **AI persona (modes, prompts, tool catalog)** → §11 (mock ghost payloads until persona refactor).
- **AA contrast / exact colors** → `kash-3.0-design-tokens.md`.
- **Transition motion** → animation pass (NAV-4); breadcrumb/zoom model is locked.

---

## 7. Gap-pass (Jun 22) — Bingo card + goal-planning flow

> Fills the creation/interaction holes the page-level spec skipped. **Supersedes PM1-6, PM1-8, PM1-10.**

### 7.1 The Bingo card (supersedes PM1-6, PM1-8)

- **Literal 5×5 grid, 25 cells, center is a FREE space → 24 goal cells.**
- Each cell = one goal, tagged with **any category, shown as a per-cell color**; **free mix**
  (fixed 25-cell total, no per-category quota — this is how it honors the old "no fixed-N-per-category").
- **Card is the primary surface; a List toggle** gives a dense manage view over the same goals.
- **Reward = classic line bingo** — any row / column / diagonal of 5 (the free center counts).
  _No separate "balance bingo"; balance is rewarded only incidentally when a line spans categories._

### 7.2 Bingo lifecycle (create-once → finalize → locked)

- **Draft (until you finalize, targeted by Jan 31):** add/edit/recolor cells freely; empty cells prompt
  to be filled. Populate via **AI brain-dump**, **blank-fill**, or **guided setup** (all available).
- **Finalize:** an **AI spelling pass** suggests fixes, then you **submit the final card for the year**.
- **Finalize-to-activate (GP3-1):** the card is **unusable for bingo / earns no rewards until submitted**.
  No auto-lock — it simply stays an inert draft until you commit.
- **Locked (rest of year):** **no content edits.** You may only **mark a goal done**, or
  **archive/backburner** it. Archived cells are **muted/blurred in place** (not greyed), keeping the
  grid shape intact — a bingo line cannot pass through one. A simple, low-text view distinguishes
  done / active / backburnered.

### 7.3 Goal creation (GP1-2)

Three methods, by context: **quick line** (composer-style, category via the `;` segment) for capture ·
**full form** (category, desire, value, target, first milestones) for detail · **AI brain-dump** (prose →
drafted, category-tagged goals you edit) for blank-slate setup and Check-ins.

### 7.4 Goal-planning flow (GP4 — how a goal becomes doable)

Finalizing freezes the goal **statement**, not its **execution** — milestones/tasks/decomposition
continue all year. Tapping a (locked) cell opens:

- **A lightweight goal panel (GP4-1):** statement (locked), category/value/target, hybrid progress,
  the milestone list with per-milestone task counts, and a **link out to the backing Project** (Miller/Gantt).
- **Milestones (GP4-2):** created **manually or via "AI break this down"** (ghosted, opt-in).
- **Tasks under a milestone (GP4-3):** **create new or link existing** Kash tasks (normal category/due/
  priority); they flow into Week/Today when scheduled, and completing them advances the milestone → goal %.
- **Project backing (GP4-4):** goals stay **panel-only until they grow**, then offer to **promote to a
  new Project** (milestones → phases) or **attach as a phase** of an existing one.

### 7.5 Data-model deltas vs §5

- `goals` gains a **bingo cell position** (`card_year`, `cell_index` 0–24, center index reserved/free),
  a **lifecycle status** (`draft` / `final`), and a per-goal **state** (`active` / `done` / `backburnered`).
- Add a `bingo_cards` row per user-year holding finalize state + `finalized_at`.
- `goals.project_id` becomes **nullable** (panel-only goals have none until promoted).
- Goal **statement** is immutable once `card.status = final` (enforce app-layer); status/state changes allowed.

---

## 8. Navigation & transitions (gap-pass)

- **NAV-1 · Switcher = a zoom axis.** Plan is **Week ↔ Month ↔ Quarter ↔ Year ↔ Bingo** as one
  in-page switcher on `/plan` (Jun 25). Bingo is the 5th tab, not a rail item.
- **NAV-6 · ~~Bingo rail item~~ superseded Jun 25** — Bingo lives in the Plan switcher only.
- **NAV-2 · Click a period = zoom in (replace).** Clicking a quarter/month/week opens that period's
  view, scoped to it (supersedes PM-A's inline expand).
- **NAV-3 · Full breadcrumb path.** The selected period carries down (Year › Q3 › Aug › wk34);
  zooming out returns where you were; changing zoom keeps the scoped period. Breadcrumb + zoom control
  both navigate.
- **NAV-4 · Transition motion deferred to the animation pass** — the breadcrumb/zoom model is locked;
  zoom-grow vs cross-fade is decided later.
- **NAV-5 · Default landing = last viewed** (resume where you left off).

## 9. Ghosted-accept pattern (gap-pass, reusable)

The single AI-suggestion interaction, reused by the quarter spread (PM-3), week draft (PM-5), balance
pass (PM-6), milestone breakdown (GP4-2), Check-in (PM-7), and reserved-day confirm (ET-4).

- **GA-1 · Look:** a suggestion is **dashed + faded + a ✦ "suggested" label** — unmistakably provisional.
- **GA-2 · Controls:** **per-item ✓ / ✕ only** (no bulk accept-all/dismiss-all) — every one is a conscious choice.
- **GA-3 · On accept:** ✓ **stages** the item; a final **"Apply"** commits all staged items at once.
- **GA-4 · Leftovers:** un-acted (and staged-but-un-applied) suggestions **persist as pending** for next time.
- **GA-5 · Edit-then-accept:** you can ✎-tweak a ghost (rename/recolor/reschedule) before staging it.
- **Loop:** AI proposes ghosts → ✎-tweak + ✓-stage the keepers (✕ to drop) → **Apply** commits the staged
  set → untouched ones stay pending.

## 10. Entry UIs (gap-pass)

- **ET-1 · Quarter-theme picker:** optional phrase + **any number** of focus-category chips.
- **ET-2 · Month intentions:** **all 5 category slots always shown** (empties as "—") to nudge balance.
- **ET-3 · Year light-placement:** **drag + tap-to-assign** a goal onto a quarter (from an unplaced-goals tray).
- **ET-4 · Reserved-day confirm:** ghosted-accept date with **accept / dismiss / pick-manually** (no reshuffle).
- **ET-5 · Bingo list-mode:** the list toggle off the card, with a **category ↔ status grouping toggle**.

## 11. Onboarding, rollover, capacity & reward (final gap-pass)

### 11.1 Empty / first-run / onboarding

- **ON-1:** first-run Bingo = a welcoming blank card with **three equal create options** (AI brain-dump /
  blank / guided), no default push.
- **ON-2:** empty horizons (week/quarter/month) show **minimal text only** ("nothing planned yet") —
  no AI-draft offer; calmest.
- **ON-3:** mid-year with no card → Plan works fully (goals optional); a **dismissible nudge that
  resurfaces occasionally** (via the Check-in).

### 11.2 Year rollover (Dec→Jan)

- **YR-1:** next year's card opens via a **late-Dec prompt**; **finalize-by-Jan-31 reminders escalate**
  as the date nears.
- **YR-2:** last year's card → **year-in-review summary + browsable archive**.
- **YR-3:** unfinished/backburnered goals **carried forward as opt-in ghosts** on the new card
  (ghosted-accept pattern, §9).

### 11.3 Capacity model (powers the PM1-12 nudge)

- **Available** = a **user-set weekly target, auto-refined from completion/time history** (hybrid).
- **Committed** = **sum of task time-estimates** on the goal's linked tasks → **tasks gain a
  `time_estimate` field** (data-model addition vs §5).
- **Nudge only when clearly over (~130%+)**; surfaced on the page + in the Check-in (PM1-12).

### 11.4 Reward moment

- **RW-1:** **gentle** — the completed line glows + a small in-place toast (no interrupting overlay).
- **RW-2:** a bingo **feeds the §12 garden** (grows a plant) — planning feeds wellbeing.
- **RW-3:** **escalating → blackout finale** — first bingo → double → a blackout (all 24) as the year's finale.

---

> **§8 Planning Mode is now fully specified** across pages (PM-1–PM-7), cross-cutting mechanisms
> (balance pass, Check-in), and all gap-pass UX (Bingo, goal-planning, navigation, ghosted-accept,
> entry UIs, onboarding, rollover, capacity, reward). Remaining items are **build dependencies**, not
> open design: Phase 2 time-tracking aggregation (heatmap + capacity), and the cross-feature hooks to
> §10 Abyss, §11 AI persona, §12 Care, §13 Values.

---

## 12. Foundation build contract (Jun 25 — for PR1+ parallel fan-out)

Implementation contracts for the planning data spine. Parallel PRs branch from this foundation.

### 12.1 Tables & enums

| Table                  | Purpose                                                                                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `bingo_cards`          | One row per user × calendar year; `status` (`draft` \| `final`), `finalized_at`                                                                                |
| `goals`                | Title, category, optional value/project links, bingo `cell_index` (0–24, **12 = FREE**), `state` (`active` \| `done` \| `backburnered`), target horizon fields |
| `goal_milestones`      | Ordered milestones per goal; completion derived from linked tasks                                                                                              |
| `quarter_themes`       | `year`, `quarter` (1–4), `phrase`, `focus_categories` (JSON array of category enums)                                                                           |
| `month_intentions`     | One row per user × year × month × category                                                                                                                     |
| `reserved_days`        | Flexible month slots → `resolved_date` → suggested protected blocks                                                                                            |
| `planning_suggestions` | Persist ghosted AI suggestions (GA-4): `surface`, `payload` JSON, `status`                                                                                     |

**Task extensions:** `milestone_id` (nullable FK → `goal_milestones`), `time_estimate_minutes` (nullable, PM11.3 capacity).

**Enums:** `bingo_card_status`, `goal_state`, `obligation_desire`, `target_horizon`, `reserved_day_type`, `planning_suggestion_surface`, `planning_suggestion_status`.

### 12.2 Sync & RLS

Every table: `user_id`, `updated_at`, index `(user_id, updated_at)`, RLS owner-scoped, registered in `packages/sync/src/tables.ts` + SQLite mirror in `packages/db-local`.

### 12.3 Stub seams (empty OK until integration PR)

- `recordBingoReward()` — no-op until §12 Care
- `fetchAbyssBalanceCandidates()` — returns `[]` until §10 Abyss
- Values picker — `value_id` nullable; disabled until §13 Values
- AI ghosts — `planning_suggestions` + mock payloads until §11 persona refactor

### 12.4 Plan shell (PR1)

- Route: `/plan`
- Switcher: **Week · Month · Quarter · Year · Bingo**
- Breadcrumb: Year › Q3 › Aug › wkN (NAV-3); resume last view (NAV-5, localStorage)
- Shared **`GhostedAccept`** component (§9 GA-1–GA-5)
- Placeholder panels per horizon until parallel PRs land (ON-2 copy)
