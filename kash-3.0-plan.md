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
- ✅ **Balance weighting — LOCKED (Jun 25): Top-3 weighting** (Top-3 = large, others = small). Locked via the §6 Today balance-bar decision; Today and Categories share one metric. Upgrades to time-based later without reworking views.
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

Navigation lives on the **left rail** only. Claude moves to a **right-side chat rail** that is **collapsed by default** — summoned by a soft-gray "Ask Claude" chip (top-right, `⌘/`) and opening as a **push panel** (no permanent right strip). The **bottom dock is retired.** Inbox/triage becomes a **contextual panel** inside planning surfaces, not a global place.

### Detail — resolved navigation spec

**1. Left nav rail (destinations only)**

- **Behavior:** slim icon rail that **expands on hover/click to reveal labels** (collapsible labels). Icon + label is the legible default once expanded.
- **Grouped, all visible** (nothing hidden behind overflow — keeps Care & Abyss prominent, which is on-brand):

  | Group              | Destinations | Route (current → proposed)      |
  | ------------------ | ------------ | ------------------------------- |
  | **Do now**         | Today        | `/today` _(moved from `/plan`)_ |
  |                    | Week         | `/this-week`                    |
  |                    | Projects     | `/projects`                     |
  | _(divider)_        |              |                                 |
  | **Reflect & plan** | Plan         | `/plan` _(new)_                 |
  |                    | Abyss        | `/abyss` _(new)_                |
  |                    | Care         | `/care` _(new)_                 |
  | **Pinned bottom**  | Settings     | `/settings`                     |

- **Route note (resolved Jun 25):** Today moves to **`/today`** and Planning Mode takes the clean **`/plan`**. Add a redirect from legacy `/plan` → `/today` and update internal links.

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

**Resolved (Jun 25) — all nav open questions closed:**

- **Bingo placement:** a **sub-view of Plan** (5th tab in the horizon switcher: Week·Month·Quarter·Year·Bingo). _Not_ a separate rail item. Rail = 6 destinations + Settings.
- **Route naming:** **Today → `/today`, Plan → `/plan`** (the cleaner scheme). Needs a redirect from the legacy `/plan`→Today + internal-link updates.
- **Right chat rail:** **collapsed by default.** Opened from a **soft-gray "Ask Claude" chip** at the top-right of each page (no persistent right strip). Opens as a **push panel** (content shrinks; nothing covered). Keybinding **`⌘/`** (joins ⌘D/⌘K; avoids the ⌘J "downloads" collision in the web build).
- **Mobile / Tauri parity:** desktop keeps the rail as designed; on narrow/phone widths it collapses to a **hamburger drawer** (full grouped list slides in). Bottom-tab-bar and collapsed-icon-rail rejected.
- **Rail icons (Lucide line set):** Today = **sun** · Week = **calendar-days** · Projects = **folder** · Plan = **compass** · Abyss = **sparkles** · Care = **sprout** · Settings = **sliders**. (Replaces the old emoji glyphs.)
- **Settings layout:** **top tab bar** (not a left section-nav); active tab = inset-white pill.
- **Care's sub-views:** resolved in the redesign — Garden · Tasks · Breathing · Reflection · Stats · Travel.

Active/selected-state treatments (from the B&W redesign): nav-rail active = **soft gray pill** · segmented controls & Settings tabs = **inset white pill** · Week "today" = gray week + white today column. See `kash-3.0-visual-redesign.md`.

---

## 5. Design System & Visual Language (UI/UX)

**Purpose:** Fix "not the best styling" and "task visualization not good." Establish a calm, legible, consistent visual language — and make category balance _visible at a glance_.

**Current state:** `Direction resolved, rollout pending` — the legacy `glass-panel` aesthetic is **retired.** The visual language is now a documented **black-and-white** system (Jun 24–25): pure-white surfaces, near-black ink `#16181d`, hairline borders, **black accent + outline buttons**, color reserved for category meaning (3px left stripe). Canonical specs: `kash-3.0-design-tokens.md` (tokens), `kash-3.0-visual-redesign.md` (per-page wireframes + active-states), `design-brief.md` / `design-system-starter.md` (Claude Design kit). Tokens still need the gray→B&W swap in code.

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

**Resolved (Jun 24–25):**

- **Aesthetic:** flat **black-and-white** (glassmorphism rejected). Pure-white canvas, near-black ink, hairline borders, no blur/shadow (one documented shadow exception: the inset-white segmented pill).
- **Theming:** **light-first** for v1; tokens structured so dark drops in later. Deliberate exceptions: the **Abyss is dark/immersive**, the **Care garden is lush/illustrative**.
- **Active/selected states:** nav-rail = soft gray pill · segmented controls & Settings tabs = inset white pill · Week "today" = gray week + white today column.
- **Reference feel:** **Pinterest** (clean B&W structure) + **Finch** (warmth).
- _Still open (minor, finish anytime):_ checkbox-checked, Top-3 star, link styling, focus-ring treatments; the final motion/animation pass.

---

## 6. Today (Daily Loop)

> **Status: RESOLVED (Jun 2026; open questions closed Jun 25, 2026).** Core UX decided via the Today design session (day timeline, Top-3 deadline, DND, self-care). Spec below.

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
- Completed blocks stay visible with their actual duration ("✓ 38m") — the day becomes a colored record of what you did. Tasks completed **without** a timer appear as a thin **completion marker** (a category-colored tick at completion time) — no fabricated duration, so the future time-based balance stays clean. _(Resolved Jun 25.)_
- **Category color** on each block's left edge; a day **balance bar** at the bottom shows category load at a glance.
- **Default window & scroll _(Resolved Jun 25)_:** **adaptive fit** — the visible window auto-sizes to the day's actual content (earliest event → latest block, + padding) and **auto-scrolls to "now"** on open (with a "jump to now" control). Before any blocks exist (empty / early morning) it shows a **rolling next-6h forward window** from now; the **full day stays scrollable** both directions — the 6h is the parked position, not a clamp. _Rejected:_ fixed 7am–9pm / 6am–midnight frames (waste space, clip odd hours) and now-anchored compression (loses whole-day overview).
- Self-care prompts (walks/breathing) appear as gentle dashed rows in the gaps between blocks (see §4 below).
- **Roadmap (later, opt-in):** a confirm-first "draft my day" button that auto-lays-out blocks (Planner mode). Deferred until real time-tracking data exists to make placement accurate — Option A _generates the fuel_ auto-scheduling needs. Build A first.
- _Rejected:_ manual time-blocking (re-introduces morning-arranging friction RDM removes) and day-one auto-scheduling (inaccurate without time data, surprises break trust).

**2. Top-3 discipline — soft escalating nudges:**

- Target: Top 3 done by the **Top-3 deadline**, which derives from a single configurable **wind-down time** (default 6pm) as wind-down − 1h — so 5pm by default. _(Resolved Jun 25: one wind-down anchor drives both the Top-3 deadline and the EoD nudge; calmest UI, always coherent.)_ Each Top-3 auto-gets a 45-min focus block; spaced with simpler tasks between them.
- Enforcement is **soft and escalating**, never blocking: afternoon chip → chat note → Focus-coach mention as 5pm nears. Urgency without guilt (ADHD-friendly, self-compassion preserved).
- Completed Top-3 stays visible (crossed out) as proof of progress; multi-day slips get flagged by the Reflection guide (§11).

**3. Focus blocks — auto-DND:**

- Starting a focus block/timer **auto-enables Do Not Disturb**: real OS-level DND on the Tauri desktop app, in-app quieting on web (see §15 for the per-platform delivery layer).
- 45-min default, completable early. Optional time-tracking on the task (feeds EoD chart + §9 scoping + the §2 time-based balance upgrade).

**4. Self-care interleaving — gentle auto-suggestions:**

- Between focus blocks, Today auto-surfaces a **non-blocking** walk/breathing prompt (a chip or Care-guide note). Auto per the low-stakes autonomy tier (§11); never forced, easy to dismiss.

**5. Missed-task handling & Review:**

- **Review view / EoD:** celebrate wins, replay what got done, reflect (extend the existing EoD review toward Finch-style self-compassion), then triage leftovers. **Trigger _(Resolved Jun 25)_:** Review is **always one tap away** in the view switcher; at the **wind-down time** (default 6pm) a **gentle, dismissible nudge chip** appears — it never auto-opens or seizes the screen (matches the soft, escalating, never-blocking ethos). Smart/adaptive timing for the nudge (fire when the day actually winds down) can layer on later.
- Incomplete tasks → reschedule later in the week or drop into the Abyss (§10). No silent auto-rollover; morning triage (§4 contextual inbox) is the catch-all.

**6. Category-aware Today:** the day **balance bar** warns (gently) if the whole day is one category — the first place "balance is the product" becomes visible. _(Resolved Jun 25)_ It counts the **whole planned day** (all of today's tasks, not just completed) so the lopsided-day warning can fire in the morning while you can still rebalance. Load is **Top-3-weighted** (Top-3 = large, others = small), matching §2; the same bar component is built to **swap its input to real focus-minutes** later once time-tracking is trusted (the §2 time-based upgrade).

**Resolved (Jun 25, 2026):**

- **Calendar window:** adaptive fit + auto-scroll to "now"; rolling next-6h forward default on empty/early days; full day always scrollable.
- **Balance bar:** Top-3-weighted now → time-based later; counts the whole planned day (planned population).
- **EoD / Top-3 timing:** a single configurable **wind-down time** (default 6pm) drives both — EoD nudge fires at wind-down (soft, dismissible, never auto-opens), Top-3 deadline = wind-down − 1h.
- **Untimed completions:** shown on the Calendar as thin category-colored completion markers (no fabricated duration).
- _Deferred to §10/§11 (Care):_ self-care prompt cadence — walk/breathing frequency and walk-vs-breathing selection logic.

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

**6. End-of-week review** _(added Jun 16)_: a weekly reflection surfacing **time spent per category**, **time spent per project**, and **% progress toward completion** (per project/phase). Reuses the reflection pattern (daily EoD §6, monthly/quarterly §8, Care rituals §12) at week scale; the Reflection & care AI voice (§11) narrates wins. **Depends on the data spine:** time-per-category needs category (§2) + generalized time-tracking (§14 Phase 2); % progress needs a project-completion metric (completed vs total task weight per project/phase — define in §9).

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

### Phase 1 — Purpose & identity (resolved Jun 16)

- **Metaphor: a cosmic void / starfield.** Items are points of light; the AI theme-clusters render as **constellations** (recurring ideas group visually), and a higher resurface count **brightens** a star. The metaphor and §10's pattern-tracking reinforce each other.
- **Emotional intent flexes by moment:** reassuring when you drop something in, a little delightful when something resurfaces, understated while browsing.
- **Scope:** actionable backburner **+ ideas + inspiration / reference** (quotes, links, images) — not only to-dos.
- **Item model:** a few **soft types** — _idea / task / reference_ (lightly distinguished; can render as different stars). **Two capture modes:** a _quick line_ (title only) or a _full item_ (type + note + links/images). Category stays optional at capture.
- **Permanence: auto-archive after long inactivity** — old untouched items leave the main sky into a **retrievable archive**, keeping the field uncluttered. The system never hard-deletes (only your explicit Delete does).
- _(Confirmed from §10: Drop→Abyss + explicit Delete · category-tag · AI theme clusters + resurface counts · periodic-review resurfacing · one-move promotion.)_

### Phase 2 — UX flows (resolved Jun 16)

- **Capture — both entry points.** A **global shortcut** (⌘⇧A, TBD) pops a **quick-capture overlay** over anything you're doing, opening in **quick mode** (title only) with a toggle to **full** (type + note + links/images); **and** the **right chat rail** ("park this…"), where Claude auto-tags type/category. Capture never interrupts flow.
- **Review ritual — monthly, curated.** A **monthly** "stargazing" review that **leads with your brightest constellations** — strongest theme-clusters and most-parked ideas first ("here's what keeps calling you"). Calm, not a nag. _(The Abyss is also a rail destination you can open and browse anytime; the monthly review is the guided layer on top.)_
- **Promotion — one tap, item stays.** Tap an item → pick a target (Today / Week / a Project / a §8 annual goal). The promoted item **stays in the Abyss marked "active,"** preserving its resurface history; if you don't finish it, it **quietly returns to the field**. Explicit per-item **Delete** remains the only true removal.

### Phase 3 — UI & layout (resolved Jun 16)

- **Layout: Hybrid — Sky + List**, switchable via an in-page switcher. **Sky** = browse + the monthly review; **List** = scan + act.
- **Sky:** stars stay **neutral / cosmic white** (no category color); **type = star style** (idea = glow · task = ring · reference = glint); **resurface count = brightness**; AI theme-clusters render as **constellations** (connected stars + a small label & count); pan / zoom; tap a star → the item (promote / edit); age **dims** a star toward archive.
- **List:** **switchable grouping** — by pattern ("keeps calling you" → recent), by category, or flat + sortable. Rows show type · title · a category dot · resurface count.
- **Filters / controls (both views):** **search, category, type, age/recency**. Filtering **highlights** matching stars in the Sky.
- **Empty state:** a calm empty sky + a gentle first-capture prompt (default; refine in copy).

### Phase 4 — Animations (resolved Jun 16)

- **Character: calm baseline + delightful punctuation.** Resting state is **subtle & calm** (gentle twinkle, slow parallax drift); the signature _moments_ get **lively, delightful** motion. Always respects `prefers-reduced-motion` (drops to minimal/instant).
- **Signature moments — all four animated:**
  - **Capture (hero)** — the item **visibly travels into the sky** and settles as a star (the "I let it go" release). It's the most-used gesture.
  - **Resurface** — a constellation/star **brightens and pulses** as it comes up in the monthly review.
  - **Promote** — the star **rises out** of the sky toward its destination.
  - **Archive** — an old, untouched star **drifts away and fades** into deep space.

### Phase 5 — Icon & identity (resolved Jun 16)

- **Name: "the Abyss"** (kept — reads fine as a dark cosmic void; no churn).
- **Rail icon: a constellation** — a few connected stars (on-theme: literally the pattern-clusters). Needs a small-size (20px) legible form.
- **Visual mood: a distinct dark, immersive space.** You "descend" into a dark cosmic room — a deliberate shift from the app's calm light surfaces. **Both the Sky and the List are dark-themed.** The Abyss gets its own dark surface tokens (defined in the Design Tokens phase).

### Phases 6–8 — Engineering (resolved Jun 16; detailed in `kash-3.0-abyss-build-spec.md`)

- **Data model: its own `abyss_items` entity** (not a flavor of task). Different lifecycle + most items aren't tasks; promoting a _task_-type item spawns/links a real task while the Abyss item stays with its history.
- **AI: reuse the category-inference embeddings** for semantic theme clustering (constellations); resurface-count tracking; the **monthly review is owned by the Reflection & care guide** voice (brightest constellations first).
- **Integration & build** drafted in the build-spec doc — Drop/triage wiring (§6), capture entry points, promotion targets, sync/RLS, the §15 monthly-review reminder, dark theming, and the build sub-phase order.

**Minor open (settle during build):** archive threshold, _idea/task/reference_ taxonomy confirm, the constellation icon's exact 20px form, Abyss dark surface tokens (Design Tokens phase).

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

### Persona layer (resolved Jun 16) — refines the "specialized modes" above

The persona-definition session **tempered the three-modes framing**: they are **implicit registers of one Kash**, not distinct characters.

- **Persona model: one Kash, subtle tonal shifts** — always the same voice, slightly warmer at reflection / crisper when planning. Not a cast of characters.
- **Tone: neutral, efficient, professional** — restrained personality; the reflection register is _slightly_ warmer but still understated (matches "encouragement, not guilt" without being chatty).
- **Three registers (by context, not user-switched):**
  - **Planning** (default) — chat rail + arranging: everyday chat, week, Plan, projects, the balance-pass. Crisp, operational.
  - **Focus** — the focus session only: RDM narration + quiet check-ins. Minimal, non-distracting.
  - **Reflection** — reviews + self-care: daily EoD, weekly/monthly reviews, 3 Daily Wins, the Abyss monthly review. Slightly warmer.
- **Presence: not shown** — no avatars, no labels, no surfaced "mode." Register is chosen automatically by surface; the shift is implicit. (Maps cleanly onto the existing `system-prompts.ts` functional modes.)
- **Subsections 2 (mode model) & 3 (presence/identity) are therefore settled** by these choices — no manual switching, no per-persona identity to build.

### Proactivity & autonomy (resolved Jun 16)

- **Proactivity: minimal & essential.** Kash answers when asked; unprompted, only a few essentials — a stalled Top-3 flag, the gentle self-care / walk prompts, and the monthly Abyss/Planning review. Quiet by default.
- **Autonomy: conservative.** The only fully-auto tier is **surfacing / suggesting** (no data change). **Anything that changes state is confirmed** — reschedules, week/project rearrangement, category edits, About-me edits. (Calibrates §11's tiered autonomy to its cautious end; the auto tier is narrow.)
- **Transparency: confirms only.** Because Kash confirms almost everything, there's little silent auto-action — no separate activity log needed. The confirm step _is_ the transparency.

### About-me doc (partially resolved Jun 16)

- **Structure: hybrid** — fixed sections (Values, Working hours & constraints, Preferences) + a **free-form notes area** for the rest.
- **Update mechanism: DEFERRED** — being defined elsewhere (§13 / a separate effort); **circle back.** (Leaning, per conservative autonomy: Kash proposes, you approve — not locked.)
- **Editing UX: a dedicated editable page** as the baseline (read/edit the whole doc); chat-add optional. _(No strong preference stated — default, revisit.)_

### Tool / action catalog (resolved Jun 16; detailed in `kash-3.0-ai-persona-build-spec.md`)

- **Capable agent, confirm-gated.** Kash can perform **any** action you can — create / edit / reschedule / complete / **delete** tasks, set Top-3, draft & arrange the week, rebalance, scope/replan projects, capture & promote Abyss items, set protected blocks / priorities, edit the About-me doc.
- **No hard limits** — even destructive actions are allowed, because **every state-changing action is confirmed** (the confirm-card pattern). **Reads & suggestions are auto;** writes surface a confirmable proposal.

**Remaining open (persona layer):**

- **About-me update mechanism** — circle back (defined elsewhere).
- **Architecture + integration** detail → `kash-3.0-ai-persona-build-spec.md` (subsections 7–8).
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

**5. The 3 Daily Wins** _(added Jun 16)_ — a daily wellbeing structure inspired by "a physical, a mental, a spiritual win." Decisions you made:

- **Structure: a cross-cutting lens**, not a category. A _win-axis_ (physical / mental / spiritual) sits orthogonal to the 5 life categories — **any task in any category can also count as a win** (a fulfilling work task can be your mental win).
- **Auto-detected** from activity (completed tasks via title inference — reusing the Phase 1 category-inference seam — plus existing signals: walk reminders → physical, breathing → spiritual, daily reflection → spiritual).
- **Naming deferred** — the physical/mental/spiritual concept is locked; exact labels (and whether "spiritual" is reframed) settled in the design/copy pass.
- **Encouragement: both** a gentle daily prompt _and_ garden nourishment (hitting wins feeds §12's garden). Encouragement-only, never punitive.

**Resolved (Jun 16, Rounds 1–2):**

- **Data model:** facets **computed live** from activity; **only manual edits stored as overrides** (which win over the computed value). No per-task facet field by default — mirrors the recurrence exceptions pattern. History/trends recompute from the activity log + overrides.
- **Editable:** fully — correct a wrong guess _and_ add a missed win.
- **Surface:** **both** — a compact 3-slot tracker glance in Today + a fuller view (history/trends) in Care.
- **Daily reset:** local midnight (matches the app's day rollover / morning triage).
- **Daily review:** celebrate what you got, then **gently** note an open facet ("2 of 3 — spiritual was quiet today"). No guilt.
- **In-day prompt:** a couple of gentle touchpoints if a facet's still open, via the §15 notification layer (like other Care prompts).
- **Garden:** each win nourishes a little; all 3 in a day = a small bonus.

**Still to draft (spec detail, not forks — I'll draft for your review):**

- Detection taxonomy — which signals map to physical / mental / spiritual. Seed: walks / workouts / rest → physical; reading / writing / creating / learning → mental; breathing / reflection / gratitude → spiritual; other tasks via title inference (Phase 1 seam). Cross-cutting, so non-Body-&-Mind tasks contribute.
- Exact touchpoint times for the in-day prompt.
- Win attribution display (show what counted, tap to correct) — follows from "fully editable."

### Care — Phase 1: Purpose & capabilities (resolved Jun 22)

- **Primary mode: both** — a deliberate destination (a place to reflect, tend things, check in) _and_ an ambient layer woven into Today. Not a light backstop.
- **Guidance: adaptive, Finch-modeled** — light structure you can always ignore or freeform. The model is **Finch's self-care tasks**: a **library of small self-care practices** you can **adopt (suggested) or create your own**, do, and build gentle habits around.
- **Connection: hybrid — aware, never a scoreboard.** Care reflects your balance (the garden feeds on it; soft "Body & Mind has been quiet") but is designed so self-care never feels like a metric to optimize.
- **Capabilities (the Care hub holds):**
  - **Self-care tasks** — the Finch-style library (adopt or create).
  - **The garden + stats** — grows from self-care + balance (stats-first, garden-later).
  - **3 Daily Wins** — physical / mental / spiritual (cross-cutting, auto-detected — see above).
  - **Breathing** — guided, grounding visual.
  - **Reflection rituals** — daily / weekly / monthly (Reflection register, §11).
  - **Walks** — gentle reminders.
  - **"What lifts me"** _(new)_ — Care learns which **tasks actually make you feel better** (when done, or done regularly) and nudges you to repeat them. A wellbeing-pattern layer over your task completions.
  - **Travel-planning** — **kept in Care**, framed as planning restorative outside-time around work.

### Care — Phase 2: Garden growth model (resolved Jun 22)

- **Uniform garden** — any self-care act grows **one shared garden** (not category-mapped). The garden stays gentle; it never shows a neglected life-area as bare. _(Category-balance honesty lives in the **stats**, not the garden — this cleanly splits "hybrid, never a scoreboard": garden = warm/uniform/encouraging · stats = the honest mirror.)_
- **Seasonal cycle** — a fresh garden each season/month; a natural rhythm and clean slate, low long-term "keep-it-up" pressure.
- **Neglect → gently dormant, then revives** — softly dims when you've been away, brightens the moment you return. **Never dies, never punishes.**
- **Nourishment:** each self-care act feeds it a little; all 3 Daily Wins in a day = a small bonus (§12).

### Care — Phase 3: Garden art (resolved Jun 22)

- **Detailed · illustrative** (petals/leaves, real character) — a deliberate lush world, like the Abyss is a deliberate dark one. _Detailed generative-asset work = a design spike that ships after the stats substrate._

### Care — Phase 4: Breathing (resolved Jun 22)

- **Visualization: a pulsing orb** — soft, abstract, calm; scales with the breath.
- **Pattern: a few presets** (Box 4-4-4-4 · 4-7-8 relax · simple in-out), **defaulting to Box 4-4-4-4.**
- **Offered: on-demand + a gentle offer during stressful stretches** — never forced. (Stress signals defined in the data/integration phase.)
- A completed session counts as a self-care act (feeds the garden; a mental/spiritual win).

### Care — Phase 5: Reflection rituals (resolved Jun 22)

- **Prompt style: hybrid** — a small consistent frame (a win · a drain · a forward note) that the AI **Reflection register** (§11) personalizes to your actual day.
- **Input: both** — a gentle prompt to start + a free-text open space.
- **Mood: captured, but kept SEPARATE from tasks** — a light one-tap mood after reflecting, for your own trends; **not paired to tasks** (keeps self-care from feeling like optimization).
- **Cadences:** daily (EoD celebration), weekly, monthly — the warm/celebratory layer of the existing reviews (§6 / §7.6 / §8), owned by the Reflection register.
- **Consequence:** because mood isn't tied to tasks, **"what lifts me" can't auto-learn from mood↔task pairing** — it needs an explicit / regularity-based signal (see below).

### Care — "What lifts me" (resolved Jun 22)

- **Learns from both** — Care auto-notices self-care you do **regularly** ("you do this often") AND lets you **explicitly heart** activities; you curate the list. (Your framing: things that help "when you do them, or do them regularly.")
- **Surfacing: a list in Care + gentle, occasional nudges** ("it's been a week since a morning walk"). Present, never naggy (minimal proactivity, §11).
- Relies on **regularity + explicit marks** (not mood-inference, since mood is task-separate).

### Care — Phase 6: Stats (resolved Jun 22)

- **Shows: self-care frequency · daily-wins hit rate · mood trend.** **Not life-balance** — category balance lives in the planning/review surfaces (§7.6 weekly review, Today/Week bars), _not_ Care. Care stats are wellbeing-specific (Care = your _practice_ tracker, not a balance dashboard).
- **Tone: gentle-informative with light motivating touches** — soft language, a wins hit-rate, "steady" framing; **no streaks-to-break, goals-to-miss, or red.** Honest without judgment.
- **Placement: a stats area in Care + the numbers feed the §7.6 weekly review.**

### Care — Phases 7–8: Engineering (resolved Jun 22; detailed in `kash-3.0-care-build-spec.md`)

- **Data model:** a **`care_activities`** entity (the Finch library + the "lifts me" flag; doing one spawns a Body & Mind task), `care_events` (logged self-care), `reflections` (prompt + body + **mood, kept off tasks**), minimal computed `garden_state`. Wins computed (§12).
- **Breathing stress signal:** **activity + mood** (long focus block / heavy day, factoring a recent low mood) → a gentle, dismissible offer.
- **Build order: stats-first** — data model → library + what-lifts-me → reflection → **stats** → breathing → walks/Today prompts → **the garden last** (the illustrative design spike).

_Care is now planned end-to-end (Phases 1–8). `/care` CareView scaffold awaits the build._

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

**Backend foundations every new table inherits** (from the Jun 24 optimization pass — full spec in `kash-3.0-backend-optimization-spec.md`): each new **synced** table ships with a `(user_id, updated_at)` composite index (sync + RLS hot path) and respects the optimized sync model from day one — **batched push** (one upsert per table per flush), **keyset-paginated pull** (`(updated_at, id)`, never a full-table re-pull), and **outbox prune** (`sync_mutations` stores changed columns only, acked rows pruned). This is a standing cross-phase requirement, not a retrofit — see data-spine §5/§7.

**Remaining open questions:**

- ✅ Blocked task: **hidden until unblocked**, and the blocking task gets a **boosted RDM weight** to surface sooner (decided Jun 16, see data-spine doc).
- ✅ Recurrence: **RRULE via rrule.js**, end = **on date / after N / never** (decided Jun 16).
- Tags: build in v1, or defer until after category lands? _(still open)_
- **Cleanup — retire the `#project` token** _(added Jun 16)_: remove every `#project-name` hashtag-token instance from the parser (`parse-quick-input.ts`, `composer-assist.ts`, `fuzzy-project.ts`, `parse-project-task-input.ts`, `project-composer-assist.ts` + tests), the composer UI (`ComposerPropertyBar`, `ParsePreviewChips`, `QuickInput`, placeholders/help text), and docs. Project assignment moves to the **semicolon property mode + autocomplete**, consistent with category capture (Phase 1D). **Confirm the replacement before deleting** so project tagging isn't broken. Naturally rides along with the Phase-1 composer work (same files).

---

# Cross-Cutting Concerns

---

## 15. System-wide mechanics

> **Status: RESOLVED (Jun 22 2026).** The web-closed-reminder fork, notification controls, and the gamification question are now decided.

- **Notifications & DND** — focus blocks **auto-enable DND**; reminders go **OS-level on Tauri desktop, in-app on web**, via one shared delivery abstraction (desktop adapter = real OS DND + notifications · web adapter = in-app + best-effort Web Notifications). **Web-closed fallback: the desktop app.** Web reminders fire only while the tab's open; for reliable always-on reminders, point web users to the **Tauri desktop app** (no PWA push / email fallback for v1 — keeps it simple and honest).
- **Notification controls — simple:** a **global on/off** + the focus-block DND. No per-type toggles for v1 (calm, minimal settings).
- **Time-tracking as the data spine** — settled by §14: optional on **any** task; feeds §9 scoping, EoD charts, the §2 time-based balance upgrade. Keep capture frictionless (Focus timer + manual).
- **Gamification** — **Care's garden + stats** (§12) are the only _persistent_ layer, **plus light ephemeral celebration moments app-wide** (a vanishing flourish when all 3 Top tasks land, or after a good focus block) — **nothing scored or stored**, no points/badges/streaks. Encouragement without a tally.
- **Offline + sync** — existing Tauri SQLite + Supabase sync. All new tables (category on tasks, recurrence, dependencies, abyss, planning/goals, values/About-me, self-care events) must respect the sync model. **Optimized model (Jun 24 pass — `kash-3.0-backend-optimization-spec.md`):** batched push + keyset-paginated pull (the unbounded full-table re-pull cliff is killed), outbox prune, and a `(user_id, updated_at)` index per synced table. Desktop surfaces sync state as a **status dot + expandable detail panel** (synced/syncing/offline · last-synced · pending count · manual sync · conflicts), collapsed by default to stay calm. Runs as a **parallel track** (fix-as-you-touch), with the sync push/pull + indexing core riding the Phase 3 dependencies data-layer PR.
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

**Parallel track — Backend & latency optimization** (`kash-3.0-backend-optimization-spec.md`, decided Jun 24): not a numbered step — runs _alongside_ the above, fixed as each feature phase touches the relevant code. The high-leverage core (sync batching + bounded pull that kills the full-table re-pull cliff + the `(user_id, updated_at)` indexing pass) should ride the **Phase 3 dependencies data-layer PR**, which already touches sync + adds a synced table. UX-touching items land with the surface they serve (create-shimmer with the composer/Design Tokens, chat windowing with the §11 rail, the desktop sync panel with the shell). Each OPT item re-audits the codebase at build time, since code drifts under the plan.

---

## 17. Open Questions Backlog

Decisions to resolve as sections get expanded (collected from above):

- **Categories:** ✅ RESOLVED (§2) — fixed 5, rename/recolor only, strict MECE, inherit-with-override, task-count balance. _Remaining:_ final labels, balance weighting, backfill method.
- **Navigation:** ✅ FULLY RESOLVED (§4, Jun 25) — three-column shell, grouped left rail (new Lucide icons), contextual inbox, in-page switchers. Routes Today `/today` + Plan `/plan`; Bingo = Plan sub-view; chat collapsed → "Ask Claude" chip + `⌘/` + push panel; mobile = hamburger drawer; Settings = top tab bar. _Nothing outstanding._
- **Design:** ✅ RESOLVED (§5, Jun 24–25) — flat **black-and-white** (glass rejected), light-first (Abyss dark + garden lush exceptions), Pinterest+Finch feel. _Remaining:_ minor accent states (checkbox/star/link/focus-ring) + animation pass.
- **Today:** ✅ RESOLVED (§6) — living-record timeline (+auto-draft later), soft Top-3 nudges, auto-DND, gentle self-care prompts.
- **Week:** ✅ RESOLVED (§7) — placeholder+constraint protected blocks, colored task borders, soft over-commit warning.
- **Planning:** ✅ RESOLVED (§8) — category-tagged bingo card, monthly+quarterly cadence, soft balance-pass closing step. _Remaining:_ year-viz form.
- **Projects:** ✅ RESOLVED (§9) — fixed nesting, tag+AI similarity, templates with learned durations, confirm-first re-plan.
- **Abyss:** ✅ RESOLVED (§10) — Drop→Abyss (+ explicit Delete), category-tagged + AI theme clusters, periodic-review resurfacing.
- **AI:** ✅ RESOLVED (§11) — tiered autonomy, specialized modes (Planner / Focus coach / Reflection & care guide) sharing one brain, single editable About-me doc. _Remaining:_ mode visual identity, About-me auto-draft behavior.
- **Self-care:** ✅ RESOLVED (§12) — generative garden (stats-first), nourished by self-care + balance, both-channel reminders.
- **Values:** ranked or flat? retroactive context edits?
- **Data:** ✅ RESOLVED (§14) — recurrence rule + generated occurrences, project-scoped dependencies, optional time-tracking on any task. _Remaining:_ blocked-task RDM behavior, tags timing, recurrence-end options.
- **Backend optimization:** ✅ RESOLVED (`kash-3.0-backend-optimization-spec.md`, Jun 24) — parallel-track pass; sync batching + bounded pull (cliff killed), indexing standing-req, outbox prune, timestamp-seam normalization; UX calls D1 create-shimmer / D2 sync panel / D3 chat windowing. _Remaining:_ D1 shimmer motion + duration (Design Tokens / animation pass), D2 panel placement (settings vs shell status bar — §4 Nav), OPT-1 coalescing semantics for delete-after-update on the same offline row (confirm at re-audit).

---

_End of skeleton. Expand any section by adding a `### Detail` subsection beneath it._
