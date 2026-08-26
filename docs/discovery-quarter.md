# Flowstate — Discovery: the Quarter surface

_Written 2026-08-24. Authority: [MISSION.md](../MISSION.md) and [v1-scope.md](./v1-scope.md).
This is a discovery record — decisions, flows, and a spec, not a build. Where a decision here
changes the plan in `v1-scope.md`, §5 states the delta; where it needs MISSION.md to change,
§4 carries the diff. Visual: [discovery-quarter-wireframes.html](./discovery-quarter-wireframes.html)
(four artboards, Flowstate's real tokens)._

Grounded against the code on 2026-08-24. State of the ground truth that shaped everything below:

- **The Quarter surface is greenfield UI.** `/plan` (`src/app/(app)/plan/page.tsx`) is a
  placeholder stub whose own comment says _"a later PR rebuilds this route as the Quarter
  surface."_ It does **not** use `SurfaceCoachLayout`. No component reads goal data.
- **The model is still `goals` + `goal_milestones`, not Directions + Targets.** `goals`
  (`src/db/schema/goals.ts`, `org_shared`) carries `category, obligationDesire, targetHorizon
(year|quarter|month), targetYear/Quarter/Month, projectId, state (active|done|backburnered),
sortOrder`. `goal_milestones` (`org_shared`, cascade on goal) carries `title, sortOrder,
targetDate, completedAt`; milestone completion is **derived from linked tasks**
  (`tasks.milestoneId`) via `src/lib/planning/goal-progress.ts`. W1's category collapse to
  `business | personal` is noted in comments.
- **There is no `goalsRouter`.** Goal/milestone CRUD, `getGoalDetail`, `promoteGoalToProject`,
  and `getQuarterActivity`/`getYearActivity` all live in `planningRouter`
  (`src/trpc/routers/planning.ts`), all `protectedProcedure`, all calling `syncPlanningRow`
  (desktop mirror).
- **W5 (Directions & Targets) is `todo`, `act:0`** — not started. So the reshape and this
  surface are one build.
- **No Week deck / "The bets" (W14) code exists** — grep-confirmed. The Targets → Week read is
  spec-only.

The consequence that drove this whole session: **MISSION names five things on Quarter — Directions,
Targets, the learning roadmap, tool spend, compliance — but W5's acceptance criteria build only two
(Directions + Targets).** The learning roadmap, tool spend, compliance, and the quarterly review
ritual are all in MISSION and **absent from W5**. As written, W5 ships a surface that contradicts
MISSION's own description of Quarter — and does so before the first quarter boundary, which v1 (at
~1.4–1.7 quarters) **will** cross. Closing that gap is what this discovery decides.

---

## 1. The surface, top to bottom

Quarter is the **bet altitude**, reviewed quarterly. It renders as the standard Flowstate page
column (`max-w-3xl`, `flex-col gap-6`), wrapped in `SurfaceCoachLayout surface="plan"` so it gets
the pinned coach dock the moment chat un-parks (today it renders full-width, same as every other
surface). Order on screen:

1. **Header** — `Quarter · Q3 2026 · Jul–Sep`, with a quiet right-aligned "N days left · review
   drafts <date>". (`text-title` h1 + `text-body` muted sub, per Money's header DNA.)
2. **Direction** — 1–2 durable statements. Sentences, never a bar. The only thing beneath each is
   the **applied line** (leads scored / declined via the Filter). Eyebrow: `Direction · 1 of 2 ·
applied, never measured`.
3. **The bets (Targets)** — up to three, each a card: title, measure on the right, a thin progress
   bar, and a foot row of chips (its Direction, its horizon, `milestone` if shipped-kind) + a
   movement line. Section header carries the counter `3 of 3` and the add affordance.
4. **Learning roadmap** — one active track (own object): the capability statement, a "why" line
   (qualitative, **not** a rate), logged-time-as-context + milestone progress, and the milestone
   checklist. Counter `1 active`.
5. **Reviewed here · owned elsewhere** — two read-strips: **tool spend** (drills to Money) and
   **compliance this quarter** (the tickler's dated obligations + reserve status). One line each,
   an `owned-elsewhere` tag, conditional — absent when there is nothing to show.
6. **The quarterly review** — not a permanent block; it arrives as a calm banner when the quarter
   is closing ("Here's how Q3 went — rule on each, then start Q4"), and opens the full review
   ritual (artboard 3). One keystroke away otherwise.

**On screen always:** Direction, Targets, Learning. **Reviewed here, owned elsewhere:** tool spend,
compliance. **One keystroke away:** the review.

_Decision 1.1 — Quarter lives at `/plan`, rebuilt from the stub, wrapped in `SurfaceCoachLayout
surface="plan"`._ Reason: `/plan` is already the reserved home; the coach dock is how every content
surface composes.

_Decision 1.2 — the vertical order is Direction → Targets → Learning → read-strips → review._
Reason: it is the hierarchy MISSION names (Direction → Target), then the third quarter-horizon goal
(learning), then the things merely reviewed here, then the ritual. The durable and the qualitative
sit above the measured, so the surface reads as "what game, then the score."

---

## 2. Directions

- **Data:** new `directions` table (per W5): `id, user_id, org_id, statement, active, created_at,
retired_at`. `org_shared`. **No progress field — the absence is the assertion** that a Direction
  is never measured (W5 already states this; keep it).
- **Cap: 1–2.** Enforced in the mutation. The UI shows `1 of 2` and an "＋ Add a second direction"
  ghost; a third fails, naming which to retire (same pattern as Targets, §3).
- **Written as a sentence**, editable in place. _"We serve early-stage teams shipping production
  software. We don't take design-only or agency-subcontract work."_
- **Retired, never deleted.** "Retire" stamps `retired_at`; the statement leaves the surface but
  stays in the quarter's record and in the review history. Reason: a Direction you dropped is a
  door you can see you closed — deleting it loses the reasoning.
- **"Applied, never measured" shows up as the applied line** beneath the statement:
  _"Scored 14 leads this quarter · 9 declined on this basis · feeds the Filter."_ This is how a
  Direction earns its place **without a metric on the Direction itself** — the count is of the
  Filter's use of it, not a measure of the Direction. (Live in v1 because the Filter is pulled
  above the cut — see §3 wiring and §5.)

_Decision 2.1 — the line between a Direction and a Target: **if it takes a number and a date, it's a
Target; if it's a rule for saying no, it's a Direction.**_ Reason: this is the one test that keeps
Directions from growing bars and Targets from becoming vibes. It is also the test the create form
uses to route what you type.

_Decision 2.2 — a Direction shows no progress, ever; its only sub-content is the applied line._
Reason: the moment a Direction has a bar, it has become a Target, and the "applied not measured"
distinction — the thing that lets you say no fast — is gone.

---

## 3. Targets ("the bets")

- **Data (per W5):** `targets`: `id, user_id, org_id, direction_id (NOT NULL), title, horizon
(quarter|month|week), period_start, period_end, measure_kind, measure_target, measure_current,
state`. `org_shared`. **Every target belongs to a direction** (non-nullable FK; test asserts
  insert-without-direction fails).
- **Cap: 3 active per quarter, enforced in the mutation — and surfaced as a _moment_, not a toast**
  (artboard 4). There is **never an empty fourth slot**. Attempting a fourth opens a "You already
  have three bets — choose one to retire" panel listing the three with their progress and a Retire
  action. Retiring keeps the bet in the quarter's record.
- **Horizons:** quarter (default), month, week — a chip on each card. A month/week target is a bet
  you want to know about faster than a quarterly feedback loop. (Reuses the existing
  `target_horizon` enum, extended `week`.)
- **Measure kinds:** `currency` ($ booked), `count` (things signed/shipped), `shipped` (a
  milestone/boolean — bar becomes an on-track/✓ state). Rendered: bar + right-aligned measure for
  currency/count; a checkmark state for shipped.
- **Movement line** (Quarter-side): last movement + projects serving ("+$4.2k this month · 3
  projects serving"). A target that moved nothing states so in **muted grey, never crimson** (same
  rule as the Week deck's "The bets").
- **Project → Target link stays at project creation, not on Quarter.** At project creation the app
  **proposes** the link ("This looks like it serves X — yes / no / different / maintenance") and
  accepts none/maintenance as first-class (W5 criterion). Quarter only _shows_ which projects serve
  each bet — it doesn't own the linking UI.

_Decision 3.1 — the cap is UX, not an error._ Reason: W5 specs "the mutation fails with the message
naming what must be retired." As a surface that becomes the whole decision: adding a fourth **is**
closing a door on an existing one. The failure path is the feature.

_Decision 3.2 — Quarter is the canonical, editable home of Targets; Week's "The bets" (W14) is a
read._ Reason: one home for the data (MISSION's "exactly one home"); Week assembles, it does not
duplicate.

---

## 4. The learning roadmap

**Its own object** (not a Target, not a `goal` category) — a `learning_tracks` table, `org_shared`,
reusing the existing `goal_milestones` machinery for its milestone list and task links:

- `learning_tracks`: `id, user_id, org_id, capability (text — the statement), why (text, optional),
active, period_start, period_end, reached_at, created_at, retired_at`.
- Milestones: reuse `goal_milestones` (or a parallel `learning_milestones`) — completion derived
  from linked tasks, exactly as goals work today.
- **Cap: 1 active track.** One capability at a time; a course-list is the habit-tracker trap.
- **Does not count against the 3-target cap.** It is a fourth quarter-horizon content type, named
  separately in MISSION's Horizons row.

**How "learning" is measured without a habit tracker** (the decided answer):

- **Logged time is context, never a quota.** The track is a thing you can log time to (via the time
  spine — it appears in the time log like any work), and the surface shows "14h logged this quarter"
  as _context_. There is **no hours target** — nothing to hit, no streak, no bar filling toward a
  number. That is the line between context and a habit tracker.
- **Progress is milestones toward the capability**, checked off as their linked tasks complete.
- **"Capability reached" is the terminal state** (`reached_at`), ruled on at the quarterly review.
- **No effective-rate tie.** (Amends MISSION — see §4-of-this-doc / the MISSION diff below.) The
  roadmap's "why" is a free-text reason, qualitative, not a rate promise.

_Decision 4.1 — learning is its own object, capped at 1, measured by **logged time (context) +
milestones (progress) + a reached state (terminal)**, with no hours quota and no rate tie._
Reason (Kat, 2026-08-24): "its own object … will not have an effective rate … track time not hours."
Logged time reuses the timer spine and stays honest; the quota is what would make it a habit
tracker, so there is no quota.

_Decision 4.2 — reuse `goal_milestones` rather than invent a new milestone system._ Reason: it
already derives completion from linked tasks and already syncs to the desktop mirror; a parallel
system is upkeep for nothing.

> **MISSION tension flagged:** MISSION's Filter and Learning-Roadmap sections both tie learning to
> effective rate ("Your effective rate rises when your skills do, so learning is treated as a
> business investment"). Kat cut the rate tie. The learning roadmap stays a _business_ investment
> (business-category only, no personal growth) — it just isn't scored against the rate. MISSION
> amendment drafted in §7.

---

## 5. Tool spend + compliance — reviewed here, owned elsewhere

The tension MISSION creates: it lists tool spend and compliance as Quarter contents, but money
lives on Money and the tickler fires on Today. **Resolution: Quarter renders read-strips it does
not own.**

- **Tool spend** — a slice of `business_expenses` (the `financial`-class table laid in W1,
  populated in W16). One read-strip: _"$214/mo · $642 this quarter · ▲ $38 vs Q2 → Money."_ Named
  at the quarter horizon because tool-creep is a slow margin leak reviewed quarterly, not monthly.
  **Owned by Money; not editable on Quarter.**
- **Compliance this quarter** — the business **tickler** items whose trigger date falls in this
  quarter: estimated taxes, LLC/annual filings, insurance/contract renewals. A short list with
  due-date + reserve status (_"Q3 estimated tax · due Sep 15 · $4,200 reserved ✓"_). **Owned by the
  tickler; fires on Today on the date.** Quarter's job is _foresight_ — the shape of the quarter's
  obligations, ahead of time — which is exactly the quarter horizon.

_Decision 5.1 — both render on Quarter in v1, as conditional read-strips (absent when empty), each
tagged with where it's owned._ Reason (Kat, 2026-08-24): "Both in v1." This keeps the tickler in v1
(it was a §8d deferral candidate) so the compliance foresight is real from day one.

_Decision 5.2 — neither strip is editable on Quarter; both drill to their owning surface._ Reason:
one home for each fact (MISSION). Quarter reviews; it does not become a second money or tickler UI.

---

## 6. The quarterly review ritual

**The Sweep at the top altitude.** It arrives pre-answered — a draft you edit — and its verbs are
the Sweep's: **drop / park (retire) / keep**, one altitude up. **Full ritual in v1** (Kat,
2026-08-24). The flow (artboard 3):

1. **Banner, when the quarter is closing** (drafts ~1 week out): "Here's how Q3 went. 2 bets met
   the mark, 1 slipped, your learning track advanced one milestone. Rule on each, then start Q4."
2. **Direction — keep or retire.** Drafted `keep` if it's still being applied (scored > 0 leads);
   drafted `retire` if it scored ~nothing. Kept Directions carry to next quarter.
3. **The bets — rule on each.** Each Target auto-marked from its data: `✓ met` (measure ≥ target),
   `◑ partial`, or `missed`, with a drafted ruling: **Done** (met), **Carry** (partial/missed, to
   next quarter), **Drop**. You edit; the ruling is pre-selected, not blank.
4. **Learning roadmap.** Shows milestones + logged time; drafted `Reached` / `Carry` / `Drop`.
5. **Start next quarter — drafted.** Carries kept Directions, carried Targets, and the learning
   track into the new quarter as a **draft with open slots** ("v1 shipped ↩ · ＋ bet 2 · ＋ bet
   3"). Closing one quarter and opening the next is a single ritual, ending in "Open Q4".

_Decision 6.1 — the review is pre-answered from the log, and every ruling defaults from the data._
Reason: MISSION — "a review is never a blank form; it is a draft the user edits." Five minutes of
judgment, not forty of recall.

_Decision 6.2 — the review ends by drafting the next quarter, not just closing this one._ Reason: a
close with no rollover leaves you at a blank Quarter on day 1; the drafted-next-quarter is what
makes artboard 2 (the near-empty start) already carry the durable Direction.

_Decision 6.3 — carried/dropped Targets and retired Directions are archived to the quarter's record,
not deleted._ Reason: the record of what you bet and dropped is the closing-doors history; it is the
data the next review reasons from.

---

## 7. The wiring

- **→ Week (W14 "The bets").** The ≤3 active Targets render on the Week steering deck as thin
  progress bars over a "shipped this week" evidence line. **Quarter is canonical + editable; Week is
  a read.** A flat week states so in grey. (W5 criterion + W14; no new work here beyond the shared
  query.)
- **→ Filter (W10).** The active Direction(s) + active Target(s) are the Filter's scoring basis
  ("scored against your active Direction and Target"). **Quarter sets them; the Filter reads them**,
  and the Direction's _applied line_ on Quarter is the loop closing back — the count of leads the
  Filter scored/declined against that Direction. **This requires the Filter in v1** — hence pulling
  W10 above the cut (§8).
- **→ Money (quarterly tax / draw).** The tie is **quarterly estimated tax**, which is (a) a
  _compliance_ tickler item (the due date) and (b) a _Money_ reserve figure (the amount set aside).
  Quarter's compliance strip shows both — "Q3 estimated tax · due Sep 15 · $4,200 reserved ✓" —
  reading the due date from the tickler and the reserve from Money. **The draw itself is monthly and
  stays on Money** — Quarter does not pull the draw panel in; it only surfaces the _quarterly_ slice
  (estimated tax) that the monthly draw math already reserves against.

_Decision 7.1 — Quarter surfaces the quarterly tax obligation (date from tickler, reserve from
Money) but never the monthly draw._ Reason: the draw is a monthly decision (Money's horizon);
pulling it onto Quarter would duplicate Money and blur the horizon boundary.

---

## 8. Scope — what this discovery changed

W5 as written is 18h (12h cut) and builds Directions + Targets only. This discovery adds four things
MISSION names and W5 omitted. Sizes: **S** < 4h · **M** 4–12h · **L** 12–40h.

### Grows W5 (net-new build inside the Quarter surface)

| Addition                                                                                                                                                                                 | Size           | Note                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Learning roadmap object** — `learning_tracks` table + CRUD + UI, reusing `goal_milestones` and the time spine for logged-time. Cap 1.                                                  | **S (~4–5h)**  | Milestone machinery already exists; the new cost is the table, the time-log link, and the surface block.                    |
| **Full quarterly review ritual** — pre-answered close across Directions/Targets/Learning, outcome computation from data, drop/carry/done rulings, and the drafted next-quarter rollover. | **M (~8–10h)** | The biggest add. It's the Sweep at the top altitude; without it the first boundary (which v1 crosses) leaves a stale board. |
| **Read-strips** — tool-spend (reads `business_expenses`) and compliance-this-quarter (reads the tickler), both conditional, drilling out.                                                | **S (~3–4h)**  | Reads only; the owning tables/features (Money expenses, tickler) are separate items already in v1.                          |

**W5 grows from ~18h to ~33–37h.** That is a real budget hit and must be paid for (below).

### Displaces / commits elsewhere

| Change                                                                   | Effect                                                                                                                                                                  | Why the trade is right                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Filter (W10-cut) pulled above the cut line.**                          | Commits ~10h that was a cut candidate; the natural offset is **the Ledger (W8) → v1.1 (−8h)**, net ≈ +2h.                                                               | The Filter is the product's highest-leverage feature and the only thing that makes a Direction's "fast no" real. The Ledger is "nice, not load-bearing once the Budget is live" (Kat's own §8d note). Pulling the Filter also lights up the Direction applied-line and the Quarter→Filter wiring in v1 instead of leaving them dormant. |
| **Tickler (scope item 8) kept in v1** (not taken as a §8d/§8g deferral). | Compliance read-strip renders in v1. No _new_ hours vs the fully-scoped ~174h (the tickler was already "Build" in §8c Q7); this just removes it from the deferral menu. | Quarter's foresight ("what obligations land this quarter") needs it; without it the compliance strip is empty until v1.1.                                                                                                                                                                                                               |

### v1.1

| Item                                                                               | Size | Note                                                                                                                            |
| ---------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------------- |
| **The Ledger (W8)** — biweekly tilt-vs-actual on Money.                            | ~8h  | Displaced by pulling the Filter above the cut; the Budget bar covers the daily read until then.                                 |
| Learning roadmap **rate/effective-rate tie**.                                      | S    | Deliberately cut for v1 (Kat); if it ever returns it's a read of Money's effective-rate history, not a new metric on the track. |
| Retired-Direction / dropped-Target **archive browser** (beyond the review record). | S    | The data is kept from v1; a dedicated history view is later.                                                                    |

### Won't build (holds the line)

| Item                                                                                              | Verdict          | Why                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Any **personal-goals view** on Quarter — life areas, balance-by-life-area, personal growth goals. | **Never**        | MISSION by name: "The day a personal goals view gets built, the line has been crossed." Quarter is business-only.                                                        |
| A **progress bar or metric on a Direction.**                                                      | Never            | A measured Direction is a Target; it destroys the "applied, not measured" distinction.                                                                                   |
| **Editing money or tickler data on Quarter.**                                                     | Won't build      | One home per fact; Quarter reads and drills, never owns.                                                                                                                 |
| **Learning as a course-list / multiple active tracks.**                                           | Won't build      | Cap 1; a list of capabilities is the habit-tracker trap.                                                                                                                 |
| **Yearly horizon** for Directions/Targets.                                                        | Won't build (v1) | The `target_horizon` enum has `year`, but Quarter is the top altitude v1 ships; a year view is a sixth thing to review. Reconsider only if a real annual ritual emerges. |

### Revised arithmetic (on top of §8g's ~174h)

> **Superseded by §13** (2026-08-25). The second-pass decisions land v1 at **~190h** with nothing
> deferred; the table below is the first-pass estimate that assumed a Ledger→v1.1 offset Kat later declined.

|                                                   | Hours        |
| ------------------------------------------------- | ------------ |
| v1-scope §8g revised total                        | ~174         |
| W5 grows (learning +5, review +9, read-strips +4) | +18          |
| Filter above cut / Ledger → v1.1                  | +10 − 8 = +2 |
| Tickler kept (already counted)                    | 0            |
| **Revised v1 total**                              | **~194**     |

At 8–10 h/week × 13 weeks (104–130h), **~194h is ~1.5–1.9 quarters** — up from ~1.4–1.7. This
discovery, done honestly, grew the plan again. The cheapest way back toward a quarter is the same
menu as §8g (split W2 −8h, fixed-fee half of W15 −5h, and now the review-ritual could ship _thin_
instead of full, −5h) — but Kat chose the full review deliberately, so the honest number is ~194h
and the ship target is ~1.5–1.9 quarters unless a deferral is taken.

---

## 9. MISSION.md amendments

One real amendment (B). Amendment A turned out to be already applied — recorded here as **rejected /
no-op** so the stale §8c reference doesn't get re-cited.

### Amendment A — resolve Law 4c to five surfaces (REJECT — already applied)

`v1-scope §8c` flagged a conflict: Law 4c said "four surfaces / fifth home" while the decided IA is
five. **Verified against MISSION.md on 2026-08-25: it is already resolved.** The body prose (line
210, "Five surfaces, and that's all") and Law 4c itself (line 327, _"**Five surfaces.** Today, Week,
Projects, Money, Quarter. A feature that needs a sixth home…"_) both already name five, with
Projects as the documented exception. **No change needed.** The §8c "Law 4c conflict — pending
amendment" note is stale and should be marked resolved in `v1-scope.md` (housekeeping, not a MISSION
edit).

### Amendment B — learning roadmap: business investment, no rate score (APPLIED 2026-08-25)

> **Applied to MISSION.md** (line 201) on 2026-08-25, worded to match the "learning is a business
> project" decision (§13 Q7) rather than the earlier "own object" phrasing. The diff below is the
> record of the change.

```diff
--- a/MISSION.md  (## The mechanics, The Learning Roadmap)
-**The Learning Roadmap** — a quarter-horizon goal in its own right. Your effective rate rises
-when your skills do, so learning is treated as a business investment, not a hobby.
+**The Learning Roadmap** — a quarter-horizon goal in its own right, and its own object (one
+active capability at a time). It is a business investment, not a hobby — but it is **not scored
+against your effective rate.** Progress is milestones toward a capability, with logged time shown
+as context and no hours quota; "capability reached" is the terminal state, ruled on at the
+quarterly review. Tying it to a rate turns a capability into a number and invites the habit
+tracker; the mission holds it as an investment you make, not a metric you chase.
```

_Strategy note in the Filter section stays as-is — a lead that "builds a capability on my learning
roadmap" is still a Filter strategy input; that's the roadmap **informing** a decision, not the
roadmap being **measured**._

---

## 10. Where the current W5 spec would annoy Kat by the third quarter

Named plainly, because the brief asked:

1. **No home for the learning roadmap.** W5 builds Directions + Targets and stops. MISSION calls
   learning "a quarter-horizon goal in its own right" — by Q1's end there's nowhere to put it.
   (Fixed: §4.)
2. **No quarter-boundary ritual.** W5 builds the surface, not the close. v1 crosses a boundary
   mid-build; without the review you'd hit Q4 with three dead Q3 targets and no drop/park/keep —
   the exact backlog-guilt the mission attacks. (Fixed: §6, full review in v1.)
3. **The cap as a DB error.** "The mutation fails with a message" is correct as enforcement and
   miserable as UX if that's all it is — you'd hit it every time you over-commit. (Fixed: §3, the
   retire-one moment.)
4. **Tool spend + compliance named but absent.** MISSION's Quarter row lists them; W5 doesn't
   mention them, so by Q2 you're bouncing to Money and Today to answer "what's the shape of this
   quarter." (Fixed: §5, read-strips, both in v1.)
5. **A Direction with nothing to show.** Without the Filter, a Direction is inert text — you can't
   see it doing its job (saying no). By Q3 you'd wonder why it's there. (Fixed: Filter above the
   cut, §7–8; the applied line is live.)

---

## 11. Open questions (each with its trade-off)

| #   | Question                                                                                                        | Trade-off                                                                                                                  | Lean                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **The displacement for the Filter.** Ledger → v1.1 is the proposed offset. Confirm, or displace something else? | Ledger is the cleanest cut (Budget covers the daily read); any other cut removes something more load-bearing.              | Ledger → v1.1.                                                        |
| 2   | **Does the review ritual live at `/plan` or as a full-screen mode?** Artboard 3 shows it in-column.             | In-column is simpler; full-screen better signals "this is the one moment."                                                 | In-column, banner-triggered.                                          |
| 3   | **Retired Directions / dropped Targets — visible where, beyond the review?**                                    | A history view is calm-breaking clutter if always on; buried, it's lost.                                                   | In the review record only for v1; a browser is v1.1.                  |
| 4   | **Learning "logged time" — a dedicated track you log to, or a business project tagged learning?**               | A project reuses everything (time, phases) but muddies "is this client work"; a track is cleaner but a little more schema. | A track with its own object (§4), time logged directly to it.         |
| 5   | **Week/month Targets — do they show on Quarter, or only quarter-horizon ones?**                                 | Showing all three horizons is complete but busier; quarter-only is calmer but hides a month bet you set.                   | Show all active, horizon chip distinguishes them.                     |
| 6   | **Compliance strip — all tickler items this quarter, or only the money-linked ones (taxes)?**                   | All is complete; money-only keeps Quarter tight to its tax/draw wiring.                                                    | All dated obligations this quarter; taxes get the reserve annotation. |
| 7   | **The applied line's exact metric** — "scored N / declined M", or a decline _rate_, or leads-scored only?       | A rate implies a target (bad for "never measured"); raw counts are safest.                                                 | Raw counts, no rate.                                                  |
| 8   | **Second Direction — encouraged or friction'd?** Cap is 2 but 1 is often right.                                 | Encouraging two invites dilution; hiding "add second" hides a real option.                                                 | Show "add a second" quietly; never prompt for it.                     |
| 9   | **`year` horizon** — kept in the enum, or removed to prevent a de-facto annual layer?                           | Keeping it invites a sixth review; removing it is a migration.                                                             | Keep in enum, no UI; revisit if an annual ritual emerges.             |
| 10  | **Does pulling the Filter above the cut change the build order** (W10 currently after the money half)?          | Earlier Filter lights up Quarter sooner; later keeps money-first sequencing.                                               | Sequence Filter right after W5 so Quarter ships whole.                |

---

## 12. The three things I'm least sure about

1. **~194h is ~1.5–1.9 quarters.** The full review ritual + Filter-above-cut are the right calls
   for the _product_, but they moved the ship target the wrong way. The honest recommendation is to
   ship the review **thin** (auto-close + carry, no drafted-next-quarter polish) unless the first
   real quarter-close proves the full version earns its ~5 extra hours.
2. **Learning as its own object vs. a business project.** Reusing `goal_milestones` is clean, but
   "log time to a track" is a new time-target the timer (W2) doesn't yet know about. If the timer
   can't cheaply attribute time to a non-project track, learning-as-a-project may be the pragmatic
   call (Q4 above).
3. **Compliance depending on the tickler.** Keeping the tickler in v1 to feed the compliance strip
   is a real ~6h commitment riding on this surface's completeness. If the tickler slips, the strip
   is empty and Quarter loses its foresight read — the one part of §5 with an external dependency.

---

## 13. Second-pass decisions — visual Q&A (2026-08-25)

Eight remaining flows were walked one at a time with rendered option-mockups. These **supersede** the
relevant earlier sections and the §8 arithmetic where they conflict.

| #   | Question              | Decision                                                                                                                                                                                                                                                                                                                            | Reason                                                                                                                                                                                 |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Target measure source | **Hybrid.** Auto-derive where Flowstate owns the data ($ booked from Money, clients-signed from pipeline, shipped from milestones); manual fallback, tagged `↻ auto` / `manual` per bet.                                                                                                                                            | Keeps the review pre-answered for the common kinds without blocking an odd target (e.g. "6 case studies").                                                                             |
| 2   | Create / edit flow    | **One smart composer.** A single field routes number+date → a bet (then reveals kind / source / horizon / parent Direction **inline for confirmation**) else a Direction.                                                                                                                                                           | Calmest, chat-like; the inline reveal makes the routing confirmable, not silent magic. Supersedes §2/§3's "split by kind".                                                             |
| 3   | Review entry          | **In-place banner.** The review expands in the Quarter column, like the Sweep (Week) and Ledger (Money). Trigger: last ~week of quarter, drafted silently. If ignored, the prior board persists flagged "closing overdue" — nothing auto-drops.                                                                                     | Consistent with every other review; no modes to enter/exit. Confirms §6.                                                                                                               |
| 4   | Bet met mid-quarter   | **Celebrate + archive-on-met.** A bet that objectively hits its number is acknowledged and archived off the active board to the quarter record (shows Done in the review). **Only on met** — never on stale/unmet, which stay for the Sweep. A landed bet still counts toward the 3-for-the-quarter (winning early ≠ a fresh slot). | Auto-settling a banked win is not the machine closing a judgment-call door (what the Sweep protects); it keeps the board live.                                                         |
| 5   | Two Directions        | **Flat "3 of 3" list, each bet chip-tagged to its Direction.**                                                                                                                                                                                                                                                                      | Keeps the per-quarter cap reading as one set; the chip already exists on every card; degrades cleanly to one Direction.                                                                |
| 6   | Cold start            | **Guided first run.** A one-time, dismissible teach of the Direction→Target model, firing only at zero-Directions / never-completed. Not a recurring gate.                                                                                                                                                                          | The model is genuinely novel; a one-time teach earns its keep without becoming the onboarding gate the product parked.                                                                 |
| 7   | Learning time source  | **A learning project.** Learning is a real business project (tagged learning, non-client) reusing projects / phases / the timer; Quarter reads it as the track; it appears on the Projects board.                                                                                                                                   | Zero new timer work; **shrinks the schema** — no `learning_tracks` table, just a project flag + capability/`reached_at`; milestones = phases. Supersedes §4's standalone-object model. |
| 8   | Filter offset         | **No deferral — keep both, extend v1.** The Ledger (W8) stays in v1; the Filter (W10) is committed above the cut.                                                                                                                                                                                                                   | Kat's call: grow the plan rather than cut. And the Filter's ~10h was already inside the ~174h baseline, so committing it is a sequencing decision, not fresh hours.                    |

### Consequences for the model and the schema

- **No `learning_tracks` table** (reverses §4's implementation). Learning = `projects.is_learning`
  (or a `kind`) + `capability` (title) + `why` + `reached_at`; milestones reuse project **phases**;
  logged time is ordinary project time. It renders as its own "Learning roadmap" block on Quarter and
  as a non-client card on the Projects board. Learning-growth cost drops **+5h → +3h**.
- **Targets gain a `measure_source`** (`auto` | `manual`) and, for `auto`, a derivation key
  (`money_booked` | `clients_signed` | `milestones_shipped`). The review reads `auto` measures live and
  leaves `manual` ones as the last-entered value.
- **A met Target archives on crossing** (`archived_at`, `state=met`) but stays counted in the quarter's
  cap. Stale/unmet Targets never auto-archive — they route to the Sweep.
- **A per-user first-run flag** gates the guided teach (fires once, at zero Directions).

### Revised arithmetic (supersedes §8)

|                                                                                   | Hours    |
| --------------------------------------------------------------------------------- | -------- |
| v1-scope §8g revised total                                                        | ~174     |
| W5 grows — learning **+3** (as a project), full review **+9**, read-strips **+4** | +16      |
| Filter above the cut (already in the ~174 baseline)                               | +0       |
| Ledger kept in v1 (no deferral)                                                   | +0       |
| **Revised v1 total**                                                              | **~190** |

~190h ≈ **1.5–1.8 quarters**. Nothing is deferred (Kat's Q8 call). The cheapest routes back toward a
quarter remain the §8g menu (split W2 −8h, fixed-fee half of W15 −5h, review thin instead of full −5h),
each reversible and none taken.

### Open questions resolved here

§11 Q1 (Filter displacement → **no deferral**) and the seven audit holes (measure source, create flow,
review entry, met-target behaviour, two-Direction layout, cold start, learning model) are all **decided
above**. Still genuinely open from §11: Q3 (retired-item history view — v1.1), Q7 (applied-line metric →
**raw counts**, decided), Q9 (`year` horizon → kept in enum, no UI). The learning-as-project choice also
retires §12's least-sure item #2.

### Confirmed 2026-08-25 (final calls)

- **MISSION amendment B — applied** to MISSION.md line 201 (§9).
- **Archive-on-met slot rule — confirmed:** a landed bet still counts toward the 3-cap; winning early
  does **not** free a slot. "Three bets a quarter" stays literally true. (No longer a reversible lean.)
- **Ship posture — ~190h, cuts deferred:** no deferrals taken now; the cut line (v1-scope Q5) is
  revisited only if the calendar slips. Ship target ~1.5–1.8 quarters.
