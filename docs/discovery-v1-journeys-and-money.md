# Flowstate — Discovery: journeys, the money layer, capture, and planning

_Written 2026-08-23. Authority: [MISSION.md](../MISSION.md) and [v1-scope.md](./v1-scope.md).
This is a discovery record — decisions and a spec, not a build. Where a decision here changes
the plan in `v1-scope.md`, the scope ledger in §5 states the delta; where it needs MISSION.md
to change, §4 is the diff._

Grounded against the code on 2026-08-23. State of the ground truth that shaped everything below:

- **The money layer is greenfield.** No `clients`, `rates`, `invoices`, `directions`,
  `targets`, `intake`, `tickler` in `src/` (grep-confirmed).
- **`projects` still carries the old 5-value category enum** and has no `client_id`, `rate`, or
  `state`. W1 has not started.
- **`task_time_entries` is still task-scoped only** — `task_id NOT NULL`, no `project_id`, no
  `billable`, no rate, no tags. W2 has not started.
- **With Focus parked (#265) there is no way to start a timer at all** until W2 lands. The flow
  the whole product depends on is currently offline.
- The `/invoice` skill is the real invoicing spec: per-client rate, **billing in 20h blocks
  (not monthly)**, oldest-first, carry-forward ledger, 6–12 line items, quarter-hour rounding,
  Markdown paste block + ledger file.

---

## 1. The IA decision everything hangs on

**No standalone "Clients" or "Time" surface.** A client is a noun that appears at three
altitudes — pipeline (Week), delivery (Projects), billing (Money) — so it has no altitude of its
own and gets no rail entry. A client is a **drill-in from Money** (its rate, unpaid total,
carry-forward balance), cross-linked from Projects. Time reporting is a **section of Money**.
The five surfaces stay: **Today · Week · Projects · Money · Quarter.** This resolves the Law 4c
conflict in `v1-scope.md §8c` without a sixth home.
_Reason: an entity that appears everywhere belongs to no single surface; a rail entry just to
hold a list is the clutter the five-surface cap exists to stop._

---

## 2. UX journeys — step-by-step flows

### Journey 1 — Lead → Filter → signed client → onboarded project

1. **Lead arrives** (email / DM / referral) → one capture → lands as a card in a **Leads lane on
   Week** (pipeline lives on Week).
2. **Decision: pursue?** Open the **Filter panel** on the card. In v1 you fill the eight
   Fit/Risk/Strategy answers yourself after the intro call (no public link — `§8c` Q5).
   - Junk leads take a **"decline outright"** escape that skips scoring entirely (logged, zero
     questions). The eight questions are only for leads you're genuinely tempted by.
3. **The app drafts:** a score against your **active Direction + Target** → **pursue / negotiate
   / decline**, one reason per axis, plus _"To say yes you'd have to say no to: [active projects +
   their committed hours]."_
4. **Handback:** you decide; overrides always allowed and logged with a reason.
5. **Signed:** "Mark signed" on the card triggers **client onboarding** — creates the client, the
   project (client, rate, `state=active`), phases from a template, the local folder tree +
   starter contract on disk (Tauri), and a checklist of manual steps as tasks; opens in Finder.
   _(Onboarding automation is moved to v1.1 — see §5. Until then "signed" creates the
   client + project + phases; the folder/contract steps are the manual checklist.)_
6. **Handback:** the project is live on the Projects board; you finish the checklist.

### Journey 2 — Monday morning

1. **Open the app → Today.** A single column, not a dashboard.
2. **What you see, in order:** (a) the **one thing handed to you to start** — the highest-value
   next action, drafted, timer one click away; (b) the Top 3 (shown, _not_ gated — the gate is
   parked); (c) everything else collapsed.
3. **The decision:** _"is this the right first hour?"_ — answerable at a glance from the Budget
   bar and the day's shape.
4. **The steering hop:** on a review Monday you jump to **Week**, pre-answered — what's due in 14
   days across every client, what's gone stale (the Sweep, waiting), any un-scored leads.

_The "one thing to start" selection must weight **target-linked + client-billable + deadline**,
not deadline alone — otherwise it hands you the nearest small thing and you learn to ignore it._

### Journey 3 — A working hour → context switch → end-of-day reconciliation

1. **Start work** (Today or menu-bar): pick a project (task optional), type a description, start —
   under two seconds. Menu-bar timer shows current project + elapsed.
2. **Context switch:** start a different timer → the first stops automatically and names what it
   stopped (_"stopped Hume – API work, 47m"_).
3. **Walk away:** after 10 min idle, on return → _"Away 34 min — keep or trim?"_, **trim
   preselected**, always recoverable.
4. **End of day → close** (< 2 min): lists untracked spans > 15 min — _"2:10–4:00 untracked —
   what was that?"_ → one-click assign to a recent project, or dismiss. Confirm the log.
5. **Handback:** the day's log is true; anything left unreconciled resurfaces in the Friday
   steering rather than blocking the close.

_The timer must accept a bare project + description with no task (a 45-min client call is not a
task), and calendar events should be one-click convertible to a time entry. The forgotten-running
timer and idle false-trims are the two silent corruptors; the long-running-timer notification is
load-bearing, not polish._

### Journey 4 — Month end → an invoice you'd actually send

1. **A client crosses the threshold:** passes 20h of billable, unbilled time → one native
   notification per crossing: _"Great White has passed 20h."_
2. **Decision:** draft now or wait?
3. **The app drafts** (this _is_ the `/invoice` skill, ported): oldest 20h first, billable entries
   grouped into 6–12 client-facing line items each with a plain-English "what was delivered"
   sentence, quarter-hour-rounded hours, rate applied, dollar total, and a billing summary
   (logged / billed / carried-forward).
4. **Handback:** you edit the wording, accept. Accepting stamps `invoiced_at` (unique index —
   can never double-bill). Output is **Markdown + CSV to clipboard**; you paste into your
   invoicing tool and set sent/paid manually. Carry-forward rolls to the client.

_The line-item drafter must be conservative, editable, and stable — if it rewrites your wording
every run or invents specifics, you go back to writing by hand and it saved nothing._

### Journey 5 — The weekly Sweep and the biweekly Ledger

- **Sweep — every Friday, a section of Week.** Stale at three altitudes: tasks untouched > 21d,
  projects with no time logged > 21d, targets with no movement this period. Each takes one ruling:
  **drop / park / keep.** Finite (20 stalest + "N more"), ends in < 5 min on the keyboard, nothing
  auto-drops. Arrives **pre-answered** from the time log and staleness timestamps.
  - _"Keep" must buy a meaningful quiet period (a month, not a week) and the list must visibly
    shrink week over week, or Friday becomes a chore you dismiss wholesale._
- **Ledger — every other Friday, a section of Money.** _"You said 70% business. You spent 41%."_
  Actual logged minutes vs declared tilt, per client / per project. Waits to be opened; no
  interruption.

---

## 3. Decisions taken (each with its reason)

### Area 1 — journeys

| #    | Decision                                                                                                                                      | Reason                                                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1.1  | No standalone Clients or Time surface; client = drill-in from Money, time reporting = a Money section.                                        | An entity at every altitude belongs to no single surface; preserves the five-surface cap. |
| 1.2  | Filter lives as a panel on a Week pipeline card, not its own surface.                                                                         | Pipeline is Week's job; the Filter acts on a lead, it isn't an altitude.                  |
| 1.3  | Filter has a "decline outright" escape that skips the eight questions.                                                                        | Forcing full scoring on junk leads kills the habit by week two.                           |
| 1.4  | "Signed" is the single button that chains onboarding.                                                                                         | The one moment worth one action; everything after is handback.                            |
| 1.5  | Today opens to _doing_; the Monday review is a deliberate hop to Week.                                                                        | Today is the day surface; a review is steering, which is Week.                            |
| 1.6  | "One thing to start" weights target-linked + billable + deadline, not deadline alone.                                                         | Deadline-only optimizes for the nearest small thing — the backlog-guilt failure.          |
| 1.7  | Sweep = a Friday section of Week; Ledger = a biweekly section of Money; both pre-answered.                                                    | Keeps them inside existing surfaces; reviews are drafts you edit, never blank forms.      |
| 1.8  | "Keep" in the Sweep buys a month of quiet, not a week; the list must shrink over time.                                                        | A list that repeats every Friday trains wholesale dismissal.                              |
| 1.9  | **Decided (2026-08-23):** Invoice trigger: threshold-primary (20h/client) + monthly "anything ready?" backstop.                               | Matches how you actually bill; monthly sweep catches clients dribbling under 20h.         |
| 1.10 | _(Open — deferred to a separate UX-flow session)_ Monday first-look: lean is the one next action to start.                                    | Optimizes for starting over surveying; the mission's "one thing handed to you."           |
| 1.11 | _(Open — deferred to a separate UX-flow session)_ Rhythm: lean is silent — no scheduled morning/EOD push, only evidence-earned notifications. | Strictest reading of Law 3; the rhythm is what's on screen when you open it.              |

### Area 2 — the money layer / draw

| #   | Decision                                                                                                                                                                               | Reason                                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 2.1 | **The draw is the boundary.** Business up to and including the draw is in; everything after the draw is out; one held cost-of-living number for personal runway.                       | A company of one has exactly one pipe between business and person; Flowstate owns the business side of it and nothing past it. |
| 2.2 | **Roll-ups, not transactions.** Flowstate never ingests transaction rows.                                                                                                              | The moment it needs categorized transactions it's a budgeting app you maintain forever — the mission's named trap.             |
| 2.3 | **The running cash ledger.** Business cash is derived live from paid invoices − imported expenses − logged draws; the manual bank balance is a periodic reconcile that surfaces drift. | Answers "as live as possible" without a feed; the reconcile catches missed expenses.                                           |
| 2.4 | Tier 1 (full Draw panel: available-to-draw, tax reserve, business + personal runway, minimum draw) ships in **v1**.                                                                    | You do the draw math in your head today and no tool answers it; it pays off every month regardless of pipeline.                |
| 2.5 | Tier 0 (tax-reserve line) is folded into W3/W4 and is nearly free.                                                                                                                     | Only Flowstate's revenue data can produce the reserve number.                                                                  |
| 2.6 | Tier 2 (personal spending, categories, net worth, bank feeds) is **never built**.                                                                                                      | Directly contradicts "held, never managed"; it is YNAB/Monarch.                                                                |
| 2.7 | Build the `business_expenses` (financial-class) table and money settings in **W1** even though the panel is a later slice.                                                             | Lays the pipe during the reshape that's happening anyway; zero rework later.                                                   |

### Area 3 — capture

| #   | Decision                                                                                              | Reason                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1 | Flowstate **replaces** Clockify; no live sync.                                                        | W2 makes Flowstate the timer; two timers forever is the second-list the mission forbids.                                                                                  |
| 3.2 | At cutover, import **open unbilled time only** to seed per-client carry-forward.                      | Preserves the `/invoice` ledger's continuity without a full-history remapping project.                                                                                    |
| 3.3 | Money capture is **manual roll-ups + CSV expense import**, no bank feed, no accounting-tool API.      | A feed is 20h+ and permanent maintenance to save minutes, and it pulls the transactions decision 2.2 refuses.                                                             |
| 3.4 | Email → tasks is **paste-only**, not inbox integration.                                               | The mission's capture is paste (Level 2, you approve); inbox watching is a much larger, maintenance-heavy build.                                                          |
| 3.5 | Calendar → capacity stays **read-only, already built**; count only accepted, timed events.            | Your calendar makes the Budget's free-hours number honest; declined/all-day events must not read as busy.                                                                 |
| 3.6 | Documents → project context is **not built**.                                                         | Ingestion is a rabbit hole and re-introduces the embeddings tax just killed; docs live in the on-disk folder.                                                             |
| 3.7 | Global hotkey captures **one line of text into a single Backlog inbox**, no decision at capture time. | Under-two-seconds means no project-picking; you capture raw and triage later — accuracy later beats discipline now. The Sweep rules on stale inbox items so nothing rots. |

### Area 4 — project planning

| #   | Decision                                                                                                                                 | Reason                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 4.1 | A plan = template → phases → **per-phase hour estimate + optional deadline**. Estimate at task level is optional.                        | Plans at the level you think; task-level estimates are upkeep you needn't carry.                               |
| 4.2 | **No dependency graph.** Ordering expresses sequence.                                                                                    | A task DAG is a 10-person feature; the product breaks at 10 on purpose.                                        |
| 4.3 | Projects gain \*\*`billing_type` (hourly                                                                                                 | fixed_fee)\*\*; planning and the off-track signal are type-aware.                                              | "Running hot" means opposite things: more revenue (hourly) vs evaporating margin (fixed-fee). |
| 4.4 | Fixed-fee planning **is built in v1** (you take a mix). Fixed-fee projects carry a fee + a target-rate floor.                            | Confirmed mix of hourly and fixed-fee; not speculative.                                                        |
| 4.5 | The universal off-track signal = **budget (hours) consumed ahead of work (phases/tasks) completed**.                                     | Objective and computable from data you already have; fires before either the bill or the margin surprises you. |
| 4.6 | Estimate-vs-actual surfaces on **project detail** (burn bars), **Projects board** (health dot), and **Week** (earliest steering signal). | Three altitudes, no new home.                                                                                  |
| 4.7 | First off-track crossing fires **one native notification** + a Week treatment.                                                           | A project crossing budget is genuine evidence, not a timer — it earns an interruption under Law 3.             |

---

## 4. MISSION.md amendment — accepted (apply as written)

The mission's Money surface is revenue-only and has no expense / cash / tax / draw concept, so
the Draw panel genuinely needs this. The amendment _sharpens_ the personal boundary rather than
loosening it — it names exactly where "held, never managed" sits.

```diff
--- a/MISSION.md  (### Horizons table, Month row)
-| **Month**   | The money and the delivery. Revenue, effective rate, invoices sent and unpaid, project health, the hire trigger.     | Monthly   |
+| **Month**   | The money and the delivery. Revenue, effective rate, invoices sent and unpaid, business expenses and tax reserve, what's safe to draw, project health, the hire trigger.     | Monthly   |
```

```diff
--- a/MISSION.md  (### The personal category, after the "held, never managed" line)
 **The rule: personal work may be held, never managed.** The day a personal goals view gets built,
 the line has been crossed.
+
+### Money crosses into personal at exactly one point: the draw
+
+A company of one has one pipe between the business and the person — the owner's draw. Flowstate
+owns the **business side of that pipe in full**: revenue in, business expenses out, tax reserved,
+and therefore *what is safe to pay yourself*. It owns **nothing on the personal side of it** — not
+what the draw is spent on, not personal categories, not a personal budget, not a personal bank
+feed. The one personal figure it may hold is a **single monthly cost-of-living number**, set by
+hand and never itemised, so it can state a personal runway and the floor under the draw. One held
+number is *held*. Categorised personal spending is *managed*, and building it is the budgeting app
+this product refuses to become.
```

```diff
--- a/MISSION.md  (### Five surfaces, Money paragraph)
-**Money** is the monthly surface: revenue, effective rate, hours billed vs
-worked, invoices sent and unpaid.
+**Money** is the monthly surface: revenue, effective rate, hours billed vs worked, invoices sent
+and unpaid, business expenses and tax set-aside, and what's safe to draw. It stops at the draw —
+nothing on the personal side of it lives here.
```

---

## 5. Scope ledger — what this discovery changed

Sizes: **S** < 4h · **M** 4–12h · **L** 12–40h.

### Displaces something in v1

| New                                                                                                                                                                                                                  | Size     | Displaces                                      | Why the trade is right                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Draw panel (Tier 1)** — running cash ledger, tax reserve, available-to-draw, business + personal runway, minimum draw, CSV expense import, money settings. Pipe (`business_expenses` table + settings) laid in W1. | **~14h** | **Client-onboarding automation → v1.1** (−14h) | Onboarding pays off only when you sign a client (pipeline-dependent; checklist works by hand meanwhile). The Draw panel pays off every month regardless. Net ≈ 0. |

### Net-new v1 (not previously itemized)

| New                                                                                                                                                                                                                            | Size           | Note                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Project planning & estimate-vs-actual (call it W14)** — `billing_type`, fixed-fee fee + target-rate floor, per-phase estimates (task optional), phase-attributed burn, the off-track signal + notification + Week treatment. | **M–L (~13h)** | Projects/phases were counted "SHIPPED, reshape in W1"; the _planning_ layer (estimates, billing type, burn, off-track) was never itemized. This is real new build. |
| Filter "decline outright" escape on a lead card.                                                                                                                                                                               | **S (~1h)**    | Folds into W10.                                                                                                                                                    |

### v1.1

| Item                                                                                          | Size | Note                                                                         |
| --------------------------------------------------------------------------------------------- | ---- | ---------------------------------------------------------------------------- |
| Client-onboarding automation (folder tree + starter contract + project + phases + checklist). | ~14h | Displaced by the Draw panel; the checklist half survives in v1 via "signed". |
| Filter public intake link + token/anon route.                                                 | ~14h | Already v1.1 in `§8c` Q5.                                                    |
| Global hotkey: clipboard / screenshot capture (beyond text).                                  | S    | Text-only in v1.                                                             |
| CSV expense import polish / one-click export mapping.                                         | S    | Basic CSV import is in v1; smoother mapping later.                           |

### v2 / won't build

| Item                                                                  | Verdict                      | Why                                                                                    |
| --------------------------------------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------------- |
| Live Gmail inbox integration.                                         | Won't build (v2 at earliest) | Paste-to-tasks covers the mission's capture; inbox watching is a maintenance sink.     |
| Document ingestion → project context.                                 | Won't build                  | Rabbit hole; re-introduces the killed embeddings tax; docs live on disk.               |
| Bank feed (Plaid) for business or personal.                           | Won't build                  | 20h+ + permanent maintenance to save minutes; pulls transactions decision 2.2 refuses. |
| Accounting-tool (QBO/Xero) API integration.                           | Won't build                  | Heavy OAuth to fetch a few roll-up numbers readable in 60s.                            |
| Personal budgeting — categories, net worth, spending trends (Tier 2). | Never                        | Contradicts the mission by name.                                                       |
| Task dependency graph.                                                | Won't build                  | 10-person feature; product breaks at 10 on purpose.                                    |

### Revised arithmetic

|                                                     | Hours        |
| --------------------------------------------------- | ------------ |
| `v1-scope.md §8d` running total                     | ~166         |
| Draw panel in, onboarding out                       | +14 − 14 = 0 |
| W14 project planning & estimate-vs-actual (net-new) | +13          |
| Filter decline-outright escape                      | +1           |
| **Revised v1 total**                                | **~180**     |

At 8–10 h/week × 13 weeks (104–130h), **~180h is ~1.4–1.7 quarters.** The discovery, done
honestly, grew the plan. To land near a quarter, the cheapest deferrals (each a deliberate call,
not a week-eleven discovery):

1. **Split W2** — menu-bar timer + idle detection to v1.1, keep tags / required project /
   thresholds / exports / gap-fill. **−8h.**
2. **Ledger to v1.1** — nice, not load-bearing once the Budget is live. **−8h.**
3. **Tickler to v1.1** — eight dates a year; the calendar handles them until then. **−6h.**
4. **Fixed-fee half of W14 to v1.1** — ship hourly planning + the objective burn signal; add the
   fixed-fee margin floor once you've run a fixed-fee project through the hourly view. **−5h.**

All four: **~153h.** Still above a clean quarter, but within a quarter + a fortnight, and every
cut is reversible. This is the number to decide against deliberately — see open Q5.

---

## 6. Open questions (each with the trade-off)

_Answered 2026-08-23: **Q1** → threshold-primary + monthly backstop. **Q4** → onboarding to v1.1.
**Q2 and Q3** are being worked in a separate UX-flow session (leans stand as defaults until then).
Q5–Q10 remain open._

| #   | Question                                                                                                                     | Trade-off                                                                                               | My lean                                                      |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1   | ✅ **Decided:** threshold-primary + monthly backstop.                                                                        | —                                                                                                       | —                                                            |
| 2   | _(In separate UX session)_ Monday first-look: one next action / 14-day due / what's stale / the money picture?               | Shapes what Today and Week draft on open; only you know what earns trust fastest.                       | The one next action to start.                                |
| 3   | _(In separate UX session)_ Rhythm: silent, one gentle EOD nudge, or morning + EOD nudges?                                    | Silent is the strict Law-3 reading; a nudge warms the rhythm but edges toward timer-fired interruption. | Silent — evidence-earned only.                               |
| 4   | ✅ **Decided:** Draw panel displaces client onboarding → v1.1.                                                               | —                                                                                                       | —                                                            |
| 5   | The cut line: v1 is now ~180h. Which of the four deferrals in §5 do we take to fit a quarter?                                | Each is reversible but each removes something real; taking none means v1 is ~1.5 quarters.              | Take deferrals 1–3 (~152h); hold fixed-fee.                  |
| 6   | Fixed-fee "running hot" threshold: what % of the fee consumed (vs work done) trips the signal?                               | Too low = noisy; too high = the warning comes too late to re-scope.                                     | Default 80%, user-adjustable.                                |
| 7   | Tax reserve: a single default % of revenue, or a setting you tune per period?                                                | A fixed % is simplest; real estimated-tax rates vary with income.                                       | One setting, default you set once.                           |
| 8   | Personal runway: cost-of-living only, or also a personal-savings figure you enter?                                           | Savings makes runway real but is one more held number that goes stale.                                  | Both — one savings number, reconciled like the bank balance. |
| 9   | Clockify import: does your Detailed CSV carry a clean project→client mapping, or is cutover a manual per-project assignment? | Clean mapping = an import script; messy = a one-time manual pass at cutover.                            | Manual pass at cutover (one-time, small).                    |
| 10  | Focus mode after W2 lands: park as planned, or un-park as the timer's full-screen mode?                                      | Redundant once the first-class timer exists, unless you want a distraction-free session view.           | Decide after using the W2 timer for a week (`§8e`).          |
