# Kash 3.0 — Living Product Plan

> **Status:** Working skeleton. This is a _living_ document, not a scoping brief.
> **Companion doc:** `planning-start.md` is the frozen v1 brief — keep it for the _reasoning_ behind the daily loop (RDM, Focus, triage), but this file supersedes it as the source of truth for where Kash is going.
> **Build tracker:** `kash-3.0-build-breakdown.md` maps spec maturity — recurring decision dimensions per feature, and which areas are concept-complete vs. need focused breakdown. Use it to check completeness before building.

---

## 0. How to use this document

This plan is built to be **expanded section by section**. Each feature area below follows the same template so you (or an AI building agent) can open one section, deepen it, and hand it off as a self-contained build guide without reading the whole thing:

- **Purpose** — the job this area does in one or two sentences.
- **Current state** — `Built` / `Partial` / `None`, with a short honest note on what exists in code today.
- **Vision** — the feature list, grouped. This is the part you flesh out over time.
- **Open questions** — decisions not yet made. These bubble up to §13 (Open Questions Backlog).

**Convention:** When you expand a section, add a `### Detail` subsection beneath it rather than inflating the summary. Keep the top of each section skimmable.

---

## 1. Product vision

Kash is a **whole-life planning app** that helps one person (you) balance every sector of life, not just work. It uses a daily **Random Decision Maker** to remove the paralysis of choosing _what to work on_, so the day becomes "finish this one visible thing" instead of "rank twelve things." It actively defends time for the parts of life that planners usually ignore — relationships, self-care, rest, inspiration — and uses AI to learn your patterns, scope your future, and gently keep you balanced.

**The one-line test:** _Did Kash help me do both what I had to do and what I wanted to do this week, across all five categories of my life?_

### Design principles

1. **Balance is the product.** Every view should make life-category balance visible. Imbalance should be felt, not buried.
2. **The app decides so you don't have to.** RDM, AI arrangement, and auto-scheduling exist to reduce decision load (ADHD-first design).
3. **Self-care is not a feature, it's a constraint.** The app should make it _hard_ to neglect body & mind, relationships, and rest — Finch-style encouragement, not guilt.
4. **AI is a companion, never a gatekeeper.** It narrates, suggests, rebalances, and remembers — but never blocks action. All AI decisions are reversible.
5. **Keyboard-first, low-chrome, calm.** Minimal UI; nothing decorative competes with the task at hand.
6. **One coherent navigation model.** A user should always know where they are and how to get anywhere in one move. (This is currently broken — see §3.)

---

## 2. Cross-cutting model: Life Categories (MECE)

> **Status: RESOLVED (Jun 2026).** Model locked via the categories design session. Spec + migration below; only labels, balance-weighting, and backfill method remain open.

This is the spine of Kash 3.0. **Every task, project, focus block, and planning unit carries exactly one life category.** Categories are how the app reasons about balance.

The five categories (names editable; concepts fixed). **A `project_category` Postgres enum already encodes these** (`professional`, `personal_projects`, `relationships`, `health_wellness`, `adulting`) — 3.0's job is to _promote this existing vocabulary from projects-only to an app-wide dimension_, not invent it.

1. **Professional** (`professional`) — paid/client work, career.
2. **Personal Projects** (`personal_projects`) — self-directed creative/ambitious work.
3. **Relationships** (`relationships`) — partner, family, friends, community, social.
4. **Adulting** (`adulting`) — appointments, oil changes, taxes, cleaning, errands, admin.
5. **Body & Mind** (`health_wellness`) — fitness, mental health, inspiration, rest, self-love.

### How categories thread through the whole app

- **Color + identity:** each category has a stable color/icon used everywhere (task borders, project badges, week-view bars, charts).
- **Filtering:** any list/board/calendar can filter or group by category.
- **Balance signals:** Today and Week views visualize _load per category_. Planning Mode tracks balance over month/quarter/year.
- **AI rebalancing:** the AI watches category distribution and nudges when one is starved (e.g., "Relationships has had zero blocks in 9 days").
- **Values link:** categories connect to your Top 5 Values (§11) so prioritization isn't just urgency-driven.

### Current state

`Partial` — the `project_category` enum (all 5 categories) lives on the **projects** table only, surfaced via `CategoryBadge` / `CategoryFilter` in the Projects UI. **Tasks have no category column** (confirmed in `src/db/schema/tasks.ts`), there's no category color system, and no balance visualization anywhere. **Promoting category from projects-only to a first-class, app-wide dimension on tasks is the single biggest structural change in 3.0.**

### Detail — resolved category model

**Decisions locked:**

- **Set:** Fixed **5** categories. Users can **rename and recolor** each, but **cannot add or remove** — every balance view and AI nudge always reasons over a known set of five.
- **Strictness:** **Strict MECE** — every task and every project carries **exactly one** category.
- **Source:** Tasks **inherit their project's category by default, with override allowed** (a Relationships coffee can live inside a Professional project). **Standalone tasks must choose a category** — nothing is ever uncategorized. Projects already require a category.
- **Balance metric (v1):** **task count per category**, weighted by the existing Top-3 (large) vs everything-else (small) model so deep work outweighs errands. Designed to upgrade to time-based balance later without reworking views.

**Default labels → enum mapping** (labels are user-editable):

| Display label     | Enum value          |
| ----------------- | ------------------- |
| Professional      | `professional`      |
| Personal Projects | `personal_projects` |
| Relationships     | `relationships`     |
| Adulting          | `adulting`          |
| Body & Mind       | `health_wellness`   |

**Data-model changes:**

- Add `category` (`project_category` enum) to the **tasks** table, `NOT NULL`.
- Backfill: project tasks inherit the project's category; loose tasks get a one-time assignment pass.
- Store user label + color overrides (extend `app_settings`, or a small `category_settings` table). RLS scoped to `auth.uid()`.
- **Category colors are deferred to the Design Tokens phase** — but the category→color map is a _token_, defined once and reused everywhere (task left-borders, week bars, planning heatmaps, charts).

**Remaining open questions:**

- Confirm final default labels, or rename now (esp. "Adulting", "Body & Mind").
- Balance weighting: pure count, or the Top-3 weighting noted above (leaning: weighting).
- Backfill: triage existing loose tasks via a bulk AI pass, or manually?

---

## 3. Current-state baseline (honest snapshot)

So the plan is grounded, here is what is actually built today:

| Area                                | State                      | Notes                                                                                                                                                         |
| ----------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Today / daily loop (`/plan`)        | **Built**                  | Composer + parser, Top 3, buckets, triage strip, RDM, Focus mode + timer, EoD review, nudges, Monday entry flow. Most mature area.                            |
| This Week (`/this-week`)            | **Built**                  | Week canvas, 7-day columns, week inbox, AI week draft.                                                                                                        |
| Projects (`/projects`)              | **Built**                  | Phases, Miller columns, Gantt/calendar board, task detail, time entries, bulk import, category badges.                                                        |
| AI / Claude                         | **Built**                  | Chat rail + focus chat, RDM narration, nudge gen, week-draft gen, EoD review gen, server chat-tools.                                                          |
| Settings                            | **Built (thin)**           | Bucket mode toggle, AI config, sign out.                                                                                                                      |
| Global navigation                   | **Built but inconsistent** | Left rail (4 items) + header + bottom dock + command palette — three nav surfaces added at different times.                                                   |
| Data model                          | **Built**                  | tasks, projects, phases, focus-blocks, task-time-entries, day-reviews, nudge-events, chat-messages, app-settings, chat-custom-suggestions, task-bulk-imports. |
| Desktop                             | **Built**                  | Tauri macOS app, offline SQLite + Supabase sync.                                                                                                              |
| **Life categories (global)**        | **None**                   | Only a faint badge inside Projects.                                                                                                                           |
| **Planning Mode (month/qtr/year)**  | **None**                   | App only thinks in days + weeks.                                                                                                                              |
| **The Abyss**                       | **None**                   | Inbox/triage is the nearest cousin.                                                                                                                           |
| **Self-care / wellbeing**           | **None**                   | No walks, breathing, reflection, values, or gamification.                                                                                                     |
| **Values + editable AI memory doc** | **None**                   | Chat memory exists; no user-facing values or editable context summary.                                                                                        |

**Takeaway:** the _daily execution engine_ is strong. The _whole-life, self-care, long-horizon, and balance_ layers — the heart of the 3.0 vision — barely exist yet.

---

# Feature Areas

---

## 4. Global Navigation & Information Architecture

> **Status: RESOLVED (Jun 2026).** Decisions locked via the nav design session. Spec below is build-ready; remaining items are minor (route naming, keybindings, mobile parity).

**Purpose:** One coherent map of the app so you always know where you are and reach anything in one move. Fixing your "inconsistent global navigation" complaint.

**Current state:** `Built but inconsistent` — navigation is spread across `LeftNavRail` (Today / This Week / Projects / Settings), a `KashHeader`, a `BottomDock` (Chat ↔ Inbox drawer), and a `CommandPalette`. They were added incrementally and don't share one model. The root cause: _navigation_ (go somewhere), _actions_ (Decide, Chat), and _triage_ (Inbox) all got crammed into the same surfaces, so a click's outcome isn't predictable.

**The resolved model — a three-column app shell:**

```
┌────┬──────────────────────────┬──────────────┐
│ ▤  │                          │   Claude     │
│nav │        content           │   chat rail  │
│rail│   (Today / Week / …)     │ (toggleable) │
└────┴──────────────────────────┴──────────────┘
```

Navigation lives on the **left rail** only. Claude moves to a **persistent right rail** (matching the original v1 brief's intent). The **bottom dock is retired.** Inbox/triage becomes a **contextual panel** inside planning surfaces, not a global place.

### Detail — resolved navigation spec

**1. Left nav rail (destinations only)**

- **Behavior:** slim icon rail that **expands on hover/click to reveal labels** (collapsible labels). Icon + label is the legible default once expanded.
- **Grouped, all visible** (nothing hidden behind overflow — keeps Care & Abyss prominent, which is on-brand):

  | Group              | Destinations | Route (current → proposed)           |
  | ------------------ | ------------ | ------------------------------------ |
  | **Do now**         | Today        | `/plan` (Today's daily loop)         |
  |                    | Week         | `/this-week`                         |
  |                    | Projects     | `/projects`                          |
  | _(divider)_        |              |                                      |
  | **Reflect & plan** | Plan         | `/planning` _(new — see route note)_ |
  |                    | Abyss        | `/abyss` _(new)_                     |
  |                    | Care         | `/care` _(new)_                      |
  | **Pinned bottom**  | Settings     | `/settings`                          |

- **Route note:** "Today" currently owns `/plan`, which collides with the long-horizon "Plan" name. Cheapest fix: keep Today at `/plan`, put Planning Mode at `/planning`. (Alternative: rename Today → `/today` and give Plan the cleaner `/plan`.) Pick one before building.

**2. Right chat rail (Claude)**

- Persistent, **toggleable** AI companion available on every destination. Replaces the bottom-dock chat.
- Focus mode still gets its own focused chat; this rail is the global thread.

**3. Contextual Inbox / triage**

- **Not global, not a dock.** Renders as an in-content panel within **Today, Week, and Plan** — the three surfaces where you decide what to do with loose tasks (today / tomorrow / later / drop).
- Distinct from **The Abyss** (a real destination for long-horizon backburner + idea capture).

**4. Sub-view navigation — in-page switcher everywhere**

One reusable pattern: a segmented control at the top of a section's content. No second nav column.

- **Today:** List · Day calendar · Review
- **Plan:** Week · Month · Quarter · Year · Bingo
- **Care:** Walks · Breathing · Reflections _(TBD)_
- **Projects** keeps its **in-content Miller columns** for the project→phase tree (its hierarchy is handled inside the content, not the rail).

**5. Global actions (never rail items)**

- **Decide / RDM** → `⌘D` from anywhere → enters Focus.
- **Command palette** → `⌘K` → reach any destination or action.
- Keyboard-first, with small header affordances. Kept visually distinct from destinations so a click's outcome is always predictable.

**6. Header = context only**

Date, the current section's in-page switcher (when relevant), and global-action affordances (Decide, Chat toggle). The header is _not_ a navigation surface.

### Migration checklist (current code → resolved model)

1. Add destinations **Plan, Abyss, Care** (routes + rail items).
2. Add **grouping**, group labels, and **collapsible-label** behavior to `LeftNavRail`.
3. Move **Chat** out of `BottomDock` into a right-side `ChatRail` (reuse `ChatProvider`).
4. Convert **Inbox** from the bottom dock into a contextual triage panel mounted in Today/Week/Plan.
5. **Retire `BottomDock`.**
6. Build one **segmented in-page switcher** component; apply to Today, Plan, Care.
7. Resolve the **`/plan` route collision** (Today vs Planning Mode).

**Remaining open questions:**

- Route naming: Today keeps `/plan` (Plan → `/planning`), or Today → `/today` (Plan → `/plan`)?
- Right chat rail default: open or collapsed? remembered per session?
- Chat-toggle keybinding: keep current `⌃J`, or align to the `⌘`-family?
- Mobile / Tauri desktop parity: identical rail, or collapse to a bottom tab bar on narrow widths?
- Care's final sub-view list.

---

## 5. Design System & Visual Language (UI/UX)

**Purpose:** Fix "not the best styling" and "task visualization not good." Establish a calm, legible, consistent visual language — and make category balance _visible at a glance_.

**Current state:** `Partial` — there's a Tailwind config with `kash-*` tokens, a `glass-panel` aesthetic, and Geist fonts. But no documented design system, and task/visualization quality is inconsistent across views.

**Vision:**

- **Design tokens, documented.** Codify color, type scale, spacing, radius, elevation. Each life category gets a token-defined color + icon used everywhere.
- **Task card system.** One canonical task component with consistent treatment of: category (left border color), project chip, priority, due date, recurrence, dependency, time-tracked badge. Reused across Today, Week, Projects, Abyss.
- **Visualization upgrades** (your specific pain point):
  - Today: a real day-calendar/timeline with focus blocks rendered as blocks.
  - Week: per-day, per-category load bars so imbalance is obvious.
  - Projects: cleaner Gantt + Miller readability.
  - Planning: month/quarter/year heatmaps of category balance + the annual bingo card.
- **Empty/loading/error states** designed, not afterthoughts.
- **Motion language** — gentle, grounding (ties into breathing/self-care tone), never frantic.
- **Accessibility pass** — contrast, focus rings, keyboard reachability (run the `accessibility-review` skill before handoff).

**Open questions:**

- Keep the glassmorphism direction, or move to a flatter/calmer aesthetic?
- Light/dark/both? Any time-of-day adaptive theming (calmer at night)?
- Reference apps for the _feel_ you want (Finch for warmth; what for structure)?

---

## 6. Today (Daily Loop)

> **Status: RESOLVED (Jun 2026).** Core UX decided via the Today design session (day timeline, Top-3 deadline, DND, self-care). Spec below.

**Purpose:** The core "finish one visible thing" engine. What needs doing today, surfaced one decision at a time.

**Current state:** `Built` — strongest area. Composer/parser, Top 3, buckets, triage strip, RDM → Focus + timer, EoD review, nudges.

**Vision (additions to what exists):**

- **Top 3 discipline:** always completed by 5pm; reminders auto-set; spaced out with simpler tasks between them; each Top 3 auto-gets a 45-min focus block (completable faster).
- **Day calendar view:** see the day as a timeline, with focus blocks placed on it.
- **Focus time blocks:** 45-min deep-dive blocks that auto-enable Do Not Disturb / notification blocking; optional time-tracking on the task.
- **Missed-task handling:** end-of-day flow to reschedule today's incomplete tasks to later in the week or drop them into the Abyss.
- **Review your day:** celebrate wins, replay everything done, reflect, then triage leftovers. (EoD review exists — extend it toward celebration + self-compassion, Finch-style.)
- **Category-aware Today:** show today's load per category; warn if the whole day is one category.
- **Self-care interleaving:** Today proactively inserts walk/breathing prompts (§10) between work blocks.

### Detail — resolved Today UX

**Three views (in-page switcher per §4): List · Calendar · Review.** List is the default (today's existing layout: composer, Top 3, buckets, triage).

**1. Day Calendar view — "living record now, opt-in auto-draft later":**

- The timeline is **not** pre-planned. It fills in as the day happens: external calendar events render as blocks; starting a focus session (via Decide ⌘D or a task's focus action) **drops a 45-min block onto the timeline at the current time** and starts the timer.
- Completed blocks stay visible with their actual duration ("✓ 38m") — the day becomes a colored record of what you did.
- **Category color** on each block's left edge; a day **balance bar** at the bottom shows category load at a glance.
- Self-care prompts (walks/breathing) appear as gentle dashed rows in the gaps between blocks (see §4 below).
- **Roadmap (later, opt-in):** a confirm-first "draft my day" button that auto-lays-out blocks (Planner mode). Deferred until real time-tracking data exists to make placement accurate — Option A _generates the fuel_ auto-scheduling needs. Build A first.
- _Rejected:_ manual time-blocking (re-introduces morning-arranging friction RDM removes) and day-one auto-scheduling (inaccurate without time data, surprises break trust).

**2. Top-3 discipline — soft escalating nudges:**

- Target: Top 3 done by 5pm. Each Top-3 auto-gets a 45-min focus block; spaced with simpler tasks between them.
- Enforcement is **soft and escalating**, never blocking: afternoon chip → chat note → Focus-coach mention as 5pm nears. Urgency without guilt (ADHD-friendly, self-compassion preserved).
- Completed Top-3 stays visible (crossed out) as proof of progress; multi-day slips get flagged by the Reflection guide (§11).

**3. Focus blocks — auto-DND:**

- Starting a focus block/timer **auto-enables Do Not Disturb**: real OS-level DND on the Tauri desktop app, in-app quieting on web (see §15 for the per-platform delivery layer).
- 45-min default, completable early. Optional time-tracking on the task (feeds EoD chart + §9 scoping + the §2 time-based balance upgrade).

**4. Self-care interleaving — gentle auto-suggestions:**

- Between focus blocks, Today auto-surfaces a **non-blocking** walk/breathing prompt (a chip or Care-guide note). Auto per the low-stakes autonomy tier (§11); never forced, easy to dismiss.

**5. Missed-task handling & Review:**

- **Review view / EoD:** celebrate wins, replay what got done, reflect (extend the existing EoD review toward Finch-style self-compassion), then triage leftovers.
- Incomplete tasks → reschedule later in the week or drop into the Abyss (§10). No silent auto-rollover; morning triage (§4 contextual inbox) is the catch-all.

**6. Category-aware Today:** the balance bar warns (gently) if the whole day is one category — the first place "balance is the product" becomes visible.

**Remaining open questions:**

- Default Calendar window (e.g. 7am–9pm) and whether it auto-scrolls to "now."
- Does the balance bar weight by Top-3 (large/small) here too, matching §2?
- EoD Review trigger time — keep 6pm, or make it configurable?

---

## 7. Week View

> **Status: RESOLVED (Jun 2026).** Protected blocks, balance visualization, and over-commit behavior decided. Reuses Today's patterns (switcher, category colors, contextual inbox).

**Purpose:** Plan and balance the week — what's happening each day, and whether the week is balanced across categories.

**Current state:** `Built` — week canvas, 7-day columns, inbox rail, AI week draft.

**Vision (additions):**

- **1–3 priorities per day**, set ahead of time (a per-day Top-N, mirroring Top 3).
- **Category borders on every task** so a glance reveals the category mix.
- **Per-day, per-category load visualization** — bars or stacks showing how much of each category each day holds.
- **Protected blocks:** explicitly block time for Relationships / Personal Projects / Body & Mind, and have the week defend them.
- **AI week arrangement** that respects category balance and protected blocks (extend existing week-draft).

### Detail — resolved Week UX

**1. Protected blocks — placeholder + soft constraint:**

- Blocking time for a category (e.g. "Thu eve — Relationships") creates a **visible placeholder block on that day** — a promise to yourself you can later fill with a real task.
- It is **also a soft constraint** the Planner respects when arranging the week (won't pile work over it; treats it as spoken-for).
- **No fixed clock time required** — "sometime Thursday" is valid; can be made time-specific if you want. _Rejected:_ rigid timed calendar events; invisible constraint-only blocks.

**2. Balance visualization — category-colored task borders:**

- Every task in the 7-day grid carries its **category color** as a border/accent; the week's mix is read by scanning the colors. Lightweight (no aggregate bars in the columns).
- _Note vs Today:_ Today shows an aggregate balance bar; Week conveys mix through colored borders. (Open question: optionally add a small per-column category tally later.)

**3. Per-day priorities:** up to **3 priorities per day**, set ahead of time — mirrors the Top-3 mechanic at week scale.

**4. Over-commit — soft warning:**

- A **gentle, non-blocking flag** when a single day exceeds a load threshold (by task count/weight). Catches over-planning early without policing. Threshold tunable.

**5. AI week arrangement:** extends the existing week-draft to respect **category balance + protected blocks** (Planner mode; high-stakes → confirm-first per §11).

**Remaining open questions:**

- Per-column category tally in addition to colored borders, or borders alone?
- Over-commit threshold: fixed default, or learned from your typical week?
- Do protected blocks recur (every week) or get set fresh each week?

---

## 8. Planning Mode (Month / Quarter / Year)

> **Status: RESOLVED (Jun 2026).** Bingo card, cadence, and the intentions→execution "balance pass" decided. Year-visualization form still open (needs a mockup).

**Purpose:** The long-horizon layer the app completely lacks today. Plan by weeks, months, quarters; set annual goals; keep "what I _wanted_ to do" alive alongside "what I _must_ do."

**Current state:** `None`.

**Vision:**

- **Horizon zoom:** view and plan the year by weeks, by months, or by quarters — one zoomable planning surface.
- **Monthly/quarterly self-care planning:** block 1–2 days per month for outside time / personal goals; set the month's intentions per category.
- **Annual goals as a "bingo card":** a visual grid of yearly goals you map out and adjust through the year, tracking both obligations and desires.
- **Balance over time:** heatmap of category attention across the year; spot the neglected category early.
- **AI as planning partner:** helps draft the month/quarter, rolls big goals down into weeks, and revisits/adjusts as reality shifts.
- **Tie-in to Values (§11):** annual goals reference your Top 5 Values so the year reflects what matters, not just what's urgent.

### Detail — resolved Planning Mode

**Horizon zoom (per §4 in-page switcher): Week · Month · Quarter · Year · Bingo.** One "Plan" rail item.

**1. Annual bingo card — free-form, category-tagged:**

- Add any goals; **each carries exactly one life category** (§2 MECE).
- The card **visualizes category balance** — surfaces if the year skews one category or is missing Body & Mind.
- Tracks both obligations and desires; mark progress / completion through the year (the bingo metaphor).
- _Rejected:_ fixed N-per-category (too rigid); uncategorized free-form (loses the balance signal).

**2. Cadence — nested monthly + quarterly:**

- **Quarterly themes** set direction; **monthly intentions** make them concrete and adjustable.
- Monthly self-care planning: reserve **1–2 "outside / personal" days per month** → become _suggested_ protected blocks (§7), not hard events.

**3. Intentions → execution — a soft "balance pass" that closes planning:**

- Balance is a **closing step** in the Today, Week, and Plan-by-week flows. After you've planned, the app runs a gentle balance check and **softly auto-suggests tasks / protected blocks** to fill category gaps and honor the month/quarter intentions.
- Soft and optional — accept or dismiss (low-stakes autonomy tier, §11). **Never pre-fills or forces.**
- This is the mechanism that keeps long-horizon intentions alive in daily/weekly execution without rigid scheduling.

**4. Balance over time:** a year **heatmap** of category attention to spot a neglected category early. (Form — see open question.)

**5. AI planning partner:** drafts the month/quarter, rolls big goals down into weeks, revisits/adjusts; references **Top 5 Values** (§13) so the year reflects what matters, not just what's urgent.

**Remaining open questions:**

- Year-visualization form: vertical months-scroll (expand to weeks) vs a 52-week grid vs quarter cards — resolve with a mockup.
- Bingo card shape: a true 5×5 grid, or an open list? Does completing a "line" carry a reward (ties to §12 gamification)?
- Does the balance pass suggest from the existing backlog/Abyss, generate new tasks, or both?

---

## 9. Projects

> **Status: RESOLVED (Jun 2026).** New capabilities (similarity, templating, nesting) decided. Core (phases, Miller, Gantt/calendar, time entries) already built.

**Purpose:** Plan and execute multi-step work with phases, visualized over time, with AI that learns how long things actually take.

**Current state:** `Built` — phases, Miller columns, Gantt/calendar board, task detail, time entries, bulk import, category badges. Surprisingly mature.

**Vision (additions / refinements):**

- **Phases + subphases**, viewable as Miller columns _or_ as a calendar showing phase date ranges, _or_ as a multi-project calendar for cross-project visualization.
- **Click-and-drag tasks** between phases (and across the calendar).
- **Time-spent tracking per project task** (exists via time entries — surface it better).
- **AI scoping & templating** (the big new capability):
  - Learn how long similar phases/tasks have taken historically.
  - Template out phases + tasks for a new project from similar past projects.
  - Re-plan an entire project's dates from real time-tracking data when something slips.
- **Project category** drives task categories (see §2 open questions).

### Detail — resolved Projects additions

**1. Structure — fixed depth: project → phase → subphase → task.**

- Bounded hierarchy that maps cleanly to Miller columns and the calendar; easy to visualize and timeline. _Rejected:_ arbitrary recursive nesting (invites over-nesting, hard to plan dates for).
- **Drag tasks** between phases/subphases and across the calendar.
- Views (built): Miller columns · calendar of phase date ranges · multi-project calendar.

**2. Category (settled by §2):** every project carries exactly one category; its tasks inherit it with override allowed. A project is single-category, but its task mix can span categories.

**3. Similarity — you tag + AI infers:**

- You can mark a project "like this past one"; the AI _also_ infers similarity from structure/names/category. Your judgment plus pattern-matching.

**4. Templating — structure + tasks + learned durations:**

- A template captures phases/subphases, their task lists, **and typical durations learned from past similar projects** — so creating a new project auto-drafts a realistic timeline.
- Leans on the time-tracking spine (§14, now on any task) and feeds the AI-scoping dream.

**5. Re-planning (settled by §11):** when a project slips, the Planner **proposes** a date re-plan from real time data; you confirm (high-stakes → confirm-first). Never silently reshuffles.

**Remaining open questions:**

- Templating: auto-save a finished project as a template, or explicit "save as template"?
- How much history before duration estimates are trustworthy (min sample size)?
- Multi-project calendar: color by category, by project, or toggle?

---

## 10. The Abyss

> **Status: RESOLVED (Jun 2026).** Capture/Drop behavior, resurfacing, and pattern structure decided.

**Purpose:** A real home for everything you _want_ to do but had to deprioritize — ideas, recurring "I should…" items, backburner tasks (personal and project-related). Not a graveyard; a tended garden the AI watches for patterns.

**Current state:** `None` — the Inbox/triage strip is the closest existing concept but is short-horizon, not the Abyss.

**Vision:**

- **Capture when inspired:** fast, frictionless add (from anywhere, like quick-input) so ideas don't evaporate.
- **Holds both** personal ideas and project backburner items, each categorized.
- **Interact & surface:** browse, search, and let the AI _resurface_ items ("you've parked 'learn watercolor' 4 times — want to schedule it?").
- **Pattern tracking:** detect things that keep coming back, cluster by theme/category, reveal what you keep deferring.
- **Promotion path:** one move to pull an Abyss item into Today / Week / a Project / an annual goal.

### Detail — resolved Abyss

**1. Two ways in:**

- **Capture when inspired** — fast, frictionless add from anywhere (quick-input style) so ideas don't evaporate.
- **Drop → Abyss** — the triage "Drop" action (§6) slides a task into the Abyss instead of deleting it. A **separate explicit Delete** exists for true trash. Nothing good is lost to a busy day.

**2. Organization — category-tagged + AI theme clusters:**

- Each item carries a life category — **optional at capture** so inspiration stays frictionless, filled in later (or by AI suggestion).
- The AI **clusters recurring themes** and counts how often an item resurfaces — this is what makes "see patterns over time" real (e.g. "you've parked 'learn watercolor' 4 times").

**3. Resurfacing — periodic review (calm by design):**

- Items come back through a **light periodic Abyss review ritual**, not proactive interruptions. You chose the calmer model — the Abyss doesn't nag.
- **Reconciliation with §8:** the planning **balance pass** may _reference_ Abyss themes when softly suggesting tasks, but the Abyss's dedicated resurfacing is the review, not in-the-moment pop-ups. (Keeps §8 and §10 consistent: no surprise nudges from the Abyss.)

**4. Promotion path:** one move to pull an Abyss item into Today / Week / a Project / an annual goal (§8 bingo card).

**Remaining open questions:**

- Abyss review cadence: weekly, monthly, or user-set?
- Does Drop ever auto-expire from the Abyss (e.g., archive after a year untouched), or stay forever?
- Capture entry point: a global shortcut (like ⌘D for Decide), the right chat rail, or both?

---

## 11. AI Companion

> **Status: RESOLVED (Jun 2026).** Architecture locked: tiered autonomy, specialized modes sharing one brain, single editable About-me doc. Spec below. This also resolves the memory architecture for §13.

**Purpose:** The connective intelligence. Arranges, rebalances, remembers, scopes, and protects self-care across the whole app.

**Current state:** `Built (daily-scoped)` — chat rail, focus chat, RDM narration, nudges, week-draft, EoD review, server chat-tools. Today's AI reasons mostly about _today/this week_.

**Vision (expand scope):**

- **Arrange & rearrange:** plan your week; re-plan a whole project from past time data; rebalance toward neglected categories.
- **Learn patterns:** log task/phase durations, learn your estimation bias, template future work.
- **Remember & resurface:** pull things you threw into "Later"/the Abyss back into view when timely.
- **Protect self-care:** ensure each day/week has Relationships and Body & Mind time; raise it when missing.
- **Values-aware prioritization:** weigh suggestions against your Top 5 Values, not just deadlines.
- **Editable, transparent memory:** the context the AI holds about you is summarized in a user-facing, _editable_ document (see §12). No black-box memory.

### Detail — resolved AI architecture

**Autonomy — tiered:**

- **Auto (no confirm)** for low-stakes, reversible moves: offer a walk/breathing prompt, surface an Abyss item, suggest the day's ordering, _draft_ a week (without applying it).
- **Confirm first** for high-stakes: reshuffling a project's dates, rearranging a committed week, dropping/merging tasks, updating the About-me doc.
- Everything is reversible (undo). The AI never blocks an action.

**Assistant model — specialized modes, one shared brain:**

Three context-tuned voices, but **one shared memory** (the About-me doc) and **one autonomy policy** — one relationship, different hats:

- **Planner** — arrangement, scoping, rebalancing across Today / Week / Plan / Projects. Strategic, concise.
- **Focus coach** — lives in Focus mode: narrates the RDM pick, keeps you on the single task, gentle encouragement.
- **Reflection & care guide** — EoD / weekly / monthly reviews, celebration, self-compassion, and self-care nudges (walks, breathing). The warm, Finch-like voice.
- Mode is mostly **implicit** — set by the surface you're on; the right voice appears where it belongs.

**Memory — single editable "About me" doc:**

- One human-readable profile the AI reads on every interaction and _proposes_ updates to (you confirm — high-stakes per the autonomy policy).
- Holds: **Top 5 Values** (§13), working hours/constraints, learned patterns (estimation bias, neglected categories), preferences.
- Fully user-editable and transparent. **This is the §13 context doc** — §11 and §13 share it.
- Implementation: a structured-but-readable document stored per user; `chat_messages` still hold conversation history, but the durable "what Claude knows about you" lives in this doc, not opaque memory. RLS `auth.uid()`; especially sensitive.

**Per-surface roles** (carried/expanded from current build): Today narrates picks + flags stalled Top-3; Week/Plan draft & rebalance; Projects scope/template from time data (§9); Abyss resurfaces patterns; Reviews reflect & celebrate.

**Remaining open questions:**

- Confirm the 3 mode names (Planner / Focus coach / Reflection & care guide).
- Do modes get distinct visual identity (color/avatar), or just a tonal shift?
- About-me doc: AI auto-drafts updates for approval, or only edits when asked?
- (From §13) Values ranked 1–5 or flat? Do context edits reshape past suggestions or only future?

---

## 12. Self-Care & Wellbeing (Finch-style)

> **Status: RESOLVED (Jun 2026).** Metaphor (garden, stats-first), reward basis, and reminder channels decided. Care is a top-level destination (§4) AND woven into Today (§6).

**Purpose:** Make it hard to neglect yourself. Gamify mental health gently; ground you through the day; protect rest and reflection.

**Current state:** `None`.

**Vision:**

- **Walk reminders:** prompt 2–3× daily to go outside for a 10–20 min walk; schedule around work.
- **Breathing exercises:** guided breathing with calming, grounding visualizations, available any time and offered proactively during stressful stretches.
- **Gentle gamification (Finch-inspired):** light rewards for self-care, reflection, and balance — encouragement, never guilt or streak-shaming.
- **Reflection rituals:** daily (EoD celebration), weekly, monthly — prompts that reinforce wins and self-compassion.
- **Travel planning around work:** help plan trips/outside-time that fit the work calendar.
- **Care hub:** a home (`/care`?) for walks, breathing, reflections, and self-care streak/garden — or woven into Today. (See §4 open question.)

### Detail — resolved Care

**1. Gamification metaphor — a generative garden, built stats-first:**

- The reward is a **presentation skin over one shared dataset** (self-care events + balance over time).
- **Phase 1:** ship **gentle stats** — quiet visualizations of self-care and category balance. Cheap, reuses existing data-viz, immediately useful.
- **Phase 2:** grow into a **generative garden** that flourishes from your data — procedural/algorithmic art (affordable, scales, degrades gracefully, on-brand with the calm aesthetic). Pairs with the Reflection & care AI voice (§11).
- _Rejected:_ hand-drawn companion (highest art cost) as the starting point; streaks/points (guilt/streak-shaming risk).
- **Encouragement only** — the garden never wilts or punishes a skipped day. Design principle #3.

**2. What nourishes it — self-care acts + life balance:**

- Walks, breathing sessions, reflections **and** a balanced week (category balance, §2) both feed the garden. Celebrates a _balanced life_, not raw output — never rewards overwork.

**3. Reminder channels — both:**

- Real **OS notifications on the Tauri desktop**, **in-app prompts on web** (shared §15 delivery layer; consistent with auto-DND, §6).
- Walk reminders 2–3×/day around work; breathing offered proactively during stressful stretches and any time on demand. All gentle, dismissible (low-stakes autonomy, §11).

**4. Care hub contents (`/care`):** walks, breathing exercises, reflection rituals (daily EoD celebration / weekly / monthly), the garden + stats, and travel-planning-around-work. Self-care prompts also surface inline in Today.

**Remaining open questions:**

- Breathing visualization style → defer to the Design Tokens + animation passes (§5, final phase).
- Garden art direction and "growth" rules → its own design spike when Phase 2 begins.
- Reflection ritual cadence/prompts: reuse §11 Reflection guide, or scripted templates?

---

## 13. Account, Values & Personal Context

> **Status: PARTIALLY RESOLVED (Jun 2026).** The memory architecture — a single editable "About me" doc — was decided in §11 and is shared with the AI companion. Remaining here: values ranking and retroactivity (micro decisions).

**Purpose:** The editable "who I am" layer that powers values-based prioritization and transparent AI memory.

**Current state:** `None` (chat memory exists internally; nothing user-facing or editable).

**Vision:**

- **Top 5 Values:** editable, stored in your account, referenced by the AI when prioritizing and by Planning Mode when setting goals.
- **Editable AI context doc:** a single readable page summarizing everything the AI "knows" about you — fully editable, so memory is transparent and in your control.
- **Saved personal info:** preferences, working hours, recurring constraints, the things the AI should always account for.

**Open questions:**

- Are values ranked (1–5) or a flat set?
- Should editing the context doc retroactively reshape past AI suggestions, or only future ones?

---

## 14. Task & Data Model (foundations)

> **Status: RESOLVED (Jun 2026).** Architectural decisions (recurrence, dependencies, time-tracking) locked. Spec + schema changes below.

**Purpose:** The properties and relationships every other feature depends on.

**Current state:** `Built (core)` — tasks with parser-driven properties (date, project, priority), Top 3, buckets; projects + phases; time entries. **Missing globally:** category, recurrence, dependencies.

### Detail — resolved task & data model

**Task properties (full set):**

- `title`
- **`category`** — exactly one, `NOT NULL` (§2)
- `project_id` / `phase_id` — optional
- scheduled date + relative bucket (Today / Tomorrow / This Week / Later) — existing model retained
- `priority` — 0–3 (`!` / `!!` / `!!!`), existing; distinct from Top-3 (day-level) and per-day 1–3 priorities (week-level)
- `tags` — freeform, many-per-task, optional; _distinct from category_
- recurrence, dependencies, time entries — see below
- `completed_at`, timestamps

**Recurrence — rule + generated occurrences:**

- New `task_recurrence` rule: `start_date`, `frequency` (RRULE-style: daily / weekly / monthly / custom interval), end as `end_date` _or_ count _or_ never.
- Occurrences generated on the fly for the visible window — no row bloat.
- A `task_occurrence_overrides` table records per-date completion / skip / reschedule (exceptions).
- "Edit this occurrence" vs "edit all future" handled by splitting the rule at a date.

**Dependencies — within a project only:**

- New `task_dependencies` table: `blocker_task_id`, `blocked_task_id` — both must be in the same project.
- Cycle prevention enforced at write time.
- UI: "blocked by / blocks" on task detail and in Miller/Gantt; a blocked task is visually marked and **excluded from RDM/Today until unblocked** (see open question).

**Time tracking — any task, optional:**

- Generalize `task_time_entries` (today project-task-scoped) to **any** task.
- Sources: Focus-mode timer + manual entries.
- Feeds: EoD time chart, AI project-scoping (§9), and the eventual time-based balance upgrade (§2).

**Schema changes summary** (Drizzle, one table per file; RLS `auth.uid()`; `db:generate` then review):

- `tasks.category` (enum, `NOT NULL`) — §2
- `task_recurrence` (new)
- `task_occurrence_overrides` (new)
- `task_dependencies` (new)
- generalize `task_time_entries` scope

**Remaining open questions:**

- Should a blocked task be fully hidden from RDM/Today until unblocked, or just flagged and de-weighted?
- Tags: build in v1, or defer until after category lands?
- Recurrence end: support all three (date / count / never), or just date + never for v1?

---

# Cross-Cutting Concerns

---

## 15. System-wide mechanics

> **Status: MOSTLY RESOLVED (Jun 2026) by reference** — the feature sessions settled most of this. One real platform limitation remains open (web background reminders).

- **Notifications & DND** — settled by §6/§12: focus blocks **auto-enable DND**; reminders go **OS-level on Tauri desktop, in-app on web**. Build one shared delivery abstraction with a desktop adapter (real OS DND + notifications) and a web adapter (in-app + best-effort Web Notifications). **Open:** web reminders when the app is _closed_ are unreliable — decide a fallback (email digest? desktop-only? accept the gap).
- **Time-tracking as the data spine** — settled by §14: optional on **any** task; feeds §9 scoping, EoD charts, the §2 time-based balance upgrade. Keep capture frictionless (Focus timer + manual).
- **Gamification engine** — settled by §12: one shared dataset (self-care events + balance), rendered **stats-first, then generative garden**. Surfaced lightly in Today and in Care. Encouragement-only (no punitive states).
- **Offline + sync** — existing Tauri SQLite + Supabase sync. All new tables (category on tasks, recurrence, dependencies, abyss, planning/goals, values/About-me, self-care events) must respect the sync model.
- **RLS & privacy** — every new table scoped to `auth.uid()` per repo conventions; the §13 About-me doc is especially sensitive (transparent, user-editable, never logged).

---

## 16. Suggested build sequencing

This is a _vision_ doc, so treat sequencing as a sketch, not a commitment. A sensible order that front-loads the structural foundations:

1. **Life Categories as a global dimension** (§2) — unblocks balance everywhere. Highest leverage.
2. **Navigation + Design System cleanup** (§4, §5) — fixes your top complaints; everything after lands cleaner.
3. **Task model gaps** (§14) — recurrence, dependencies, category on tasks.
4. **The Abyss** (§10) — relatively contained, high daily value.
5. **Self-Care + Values + Context doc** (§12, §13) — the emotional core of 3.0.
6. **Planning Mode** (§8) — the long-horizon layer; biggest net-new surface.
7. **AI scope expansion** (§11) — rides on top of categories, time data, and planning being in place.

---

## 17. Open Questions Backlog

Decisions to resolve as sections get expanded (collected from above):

- **Categories:** ✅ RESOLVED (§2) — fixed 5, rename/recolor only, strict MECE, inherit-with-override, task-count balance. _Remaining:_ final labels, balance weighting, backfill method.
- **Navigation:** ✅ RESOLVED (§4) — three-column shell, grouped left rail, right chat rail, contextual inbox, in-page switchers. _Remaining:_ `/plan` route naming, right-rail default state, chat keybinding, mobile/Tauri parity.
- **Design:** glass vs. flat? light/dark? reference apps for feel?
- **Today:** ✅ RESOLVED (§6) — living-record timeline (+auto-draft later), soft Top-3 nudges, auto-DND, gentle self-care prompts.
- **Week:** ✅ RESOLVED (§7) — placeholder+constraint protected blocks, colored task borders, soft over-commit warning.
- **Planning:** ✅ RESOLVED (§8) — category-tagged bingo card, monthly+quarterly cadence, soft balance-pass closing step. _Remaining:_ year-viz form.
- **Projects:** ✅ RESOLVED (§9) — fixed nesting, tag+AI similarity, templates with learned durations, confirm-first re-plan.
- **Abyss:** ✅ RESOLVED (§10) — Drop→Abyss (+ explicit Delete), category-tagged + AI theme clusters, periodic-review resurfacing.
- **AI:** ✅ RESOLVED (§11) — tiered autonomy, specialized modes (Planner / Focus coach / Reflection & care guide) sharing one brain, single editable About-me doc. _Remaining:_ mode visual identity, About-me auto-draft behavior.
- **Self-care:** ✅ RESOLVED (§12) — generative garden (stats-first), nourished by self-care + balance, both-channel reminders.
- **Values:** ranked or flat? retroactive context edits?
- **Data:** ✅ RESOLVED (§14) — recurrence rule + generated occurrences, project-scoped dependencies, optional time-tracking on any task. _Remaining:_ blocked-task RDM behavior, tags timing, recurrence-end options.

---

_End of skeleton. Expand any section by adding a `### Detail` subsection beneath it._
