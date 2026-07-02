# Kash 3.0 — Product goals vs. build (gap audit)

> Holds the **README product goals** up against what's actually in code (verified Jul 1 2026) and
> what the build plans commit to. The point isn't feature coverage — the tracker already says ~85%
> shipped — it's **coherence**: where a feature exists but its UX doesn't yet deliver the promise.
>
> Verdicts: ✅ delivered · 🟡 feature exists, promise partly unmet · 🔴 promise largely unbuilt.

---

> **⚠️ Status update (Jul 2 2026):** the gap-audit tracks identified below are **now built** on
> `feat/kash-3.0-complete` — Foundations (morning hand-off + nudge arbiter), Evidence (wins memory +
> Care shrine), Goals progress/steering (timeline + heatmap + Bingo→Goals), Balance nudge
> (category-starvation), and Top-3 assurance. Scorecard verdicts below are **current as of Jul 2 2026**.

## The rubric (from the README)

1. **Calm / kill decision paralysis** — RDM, fewer trivial choices.
2. **Balance across life sectors** — imbalance felt, not buried; pulled back toward starved areas.
3. **You plan, Kash steers** — guided but in control; reversible AI.
4. **Steer toward non-work goals in small, accomplishable steps.**
5. **Make invisible progress visible** — visualization + reassurance; see the path to goals.
6. **Celebrate wins _and be reminded of them_.**
7. **Track time per category → weekly awareness → course-correct.**
8. **Top 3 land without manual scheduling.**
9. **One place for tasks + ideas + someday (Abyss).**
10. **Recurring tasks — never think "how long has it been?"**
11. **Focus / fewer distractions.**

---

## Scorecard

| #   | Goal                                  | Verdict | One-line gap                                                                                                                |
| --- | ------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------- |
| 1   | Kill decision paralysis (RDM)         | ✅      | Core loop is real and complete.                                                                                             |
| 9   | One inbox (Abyss)                     | ✅      | Capture, sky/list, archive, promote — delivered.                                                                            |
| 10  | Recurring tasks                       | ✅      | RRULE + virtual occurrences shipped.                                                                                        |
| 11  | Focus / fewer distractions            | ✅      | Focus timer + auto-DND shipped.                                                                                             |
| 7   | Weekly time-by-category               | ✅      | `WeeklySummaryCard` rolls focus time up per category **and** project. The strongest "invisible→visible" surface in the app. |
| 3   | You plan, Kash steers                 | ✅      | Confirm-card + reversible AI honor the contract.                                                                            |
| 2   | Balance across sectors                | ✅      | Category-starvation nudge + weekly digest shipped (Jul 2026). BalanceBar + neglect callouts remain. _Was 🟡._               |
| 8   | Top 3 land                            | ✅      | One-tap timeline hold, load-aware midday check-in on slots, wind-down deadline, and persistent-slip chip.                   |
| 4   | Steer toward goals in small steps     | ✅      | Next milestone step surfaces into Today (load-aware steering). _Was 🔴._                                                    |
| 5   | Progress visualization / see the path | ✅      | Per-goal journey timeline + attention heatmap replace bare "% via milestones." _Was 🔴._                                    |
| 6   | Remember & resurface wins             | ✅      | Evidence editions + Care shrine resurface wins in the user's own voice. _Was 🔴._                                           |

---

## The three real gaps (feature ≠ promise) — RESOLVED Jul 2 2026

The gaps below were the audit's original findings (Jul 1). **All three are now addressed in code.**

### Gap A — Progress is stored, never _shown as a picture_ · goals 5 + 6 · ✅ built

**Evidence** (`evidence_editions` + Care shrine) resurfaces wins and reflections. **Goals progress**
now includes a journey timeline and attention heatmap per goal.

### Gap B — Goals don't steer the day · goal 4 · ✅ built

Next incomplete milestone step surfaces into Today (load-aware). Goals horizon renamed Bingo → Goals.

### Gap C — Balance is felt but barely acted on · goal 2 · ✅ built

Category-starvation nudge + weekly digest close the §2 promise beyond body/mind self-care walks.

---

## Original gap analysis (Jul 1 audit — historical)

### Gap A — Progress is stored, never _shown as a picture_ · goals 5 + 6

This is the heart of it. The README says the fall-off point with every prior tool was that it
_"never gives me the visualization or the reassurance I want."_ The build reproduces that same
failure:

- **Goal progress** = a text label (`{n}% via milestones`) inside `BingoGoalPanel`. No bar, no
  timeline, no "here's the path and here's how far you've come." (`src/lib/planning/goal-progress.ts`)
- **Wins** are captured to the `daily_wins` table and celebrated **once** at end-of-day, then never
  resurfaced. `fetchRecentWinHistory()` even computes a hit-rate — but nothing renders it back to
  the user. (`src/server/daily-wins/fetch-recent-history.ts`)
- There is **no lookback surface at all** — no `/wins`, no "wall of proof," no monthly "here's where
  you showed up for yourself." This is exactly the **Evidence** idea now sitting in the backlog.

**Why it matters:** the emotional payoff the whole app is built to deliver — reassurance from visible
progress — is the least-built part. Everything upstream (wins, reflections, completed milestones,
focus time) is already captured. The missing piece is a surface that _reflects it back_.

### Gap B — Goals don't steer the day · goal 4

The README's sharpened goal #4 — _"steers me in small, accomplishable steps toward achieving [my
goals]"_ — has almost no build behind it:

- Goal → milestone → task linking exists, but is **manual** (paste a task ID or make a new one), and
  new milestone tasks are created as `bucketOverride: "later"` — i.e. **pushed away from Today**, not
  toward it. (`BingoGoalPanel.tsx`)
- Nothing finds the **next incomplete milestone** and offers its next step in the morning hand-off.
- No AI sequencing ("do this one first"). Goals are a place you _visit_, not a force that _steers_.

**Why it matters:** without this, non-work goals rely on the user remembering to go tend them —
which is the exact failure ("nothing reminds me of my goals outside work") the README names.

### Gap C — Balance is felt but barely acted on · goal 2

The plan (§2) explicitly promises AI that _"nudges when one [category] is starved (Relationships has
had zero blocks in 9 days)."_ The build delivers the **sensing** (`computeCategoryBalance` →
`emptyCategories`, `lopsided`, neglect callouts) but the **acting** covers only body/mind:

- Delivered nudge kinds are exactly three: `top3_stall`, `self_care_walk`, `monthly_review`.
- There is **no category-starvation nudge** — the "Relationships starved 9 days, want to add
  something?" moment the plan describes doesn't exist yet.

So balance is a **display**, not yet a **pull**. Four of five categories are watched but never
advocated for.

---

## Build vs. build-_plans_ — where they diverge

Three different situations, worth separating:

1. **Plan ✅ + Build ✅** — the daily loop, Abyss, recurrence, time rollups, focus. Coherent.

2. **Plan ✅ + Build ✅ (Jul 2026)** — **category-starvation balance nudges** (Gap C). Shipped
   alongside the weekly digest; self-care walks remain for body/mind.

3. **The README wants it, the Plan itself under-specs or contradicts it** — the important one:
   - **Persistent wins memory (Gap A) is in direct tension with a locked decision.** Plan §15
     Mechanics decided wins are _"ephemeral… nothing scored or stored, no points/badges/streaks."_
     But README goal #6 is _"celebrate my wins **and be reminded of them**."_ You can't be reminded
     of something the system deliberately doesn't keep in view. **This is a genuine product-fork the
     plan marked "resolved" that the goals reopen.**
   - **Rich goal-progress visualization (Gap A)** was never specced beyond "% via milestones." The
     "see the path to my goals" promise has no design behind it.
   - **Goal→daily-step steering (Gap B)** isn't a first-class specced flow anywhere.

**Takeaway:** the build faithfully implements the plan. The plan faithfully covers the _mechanical_
product (capture, schedule, track, balance-sense). What neither fully covers is the **reassurance /
reflection layer** — visualization of progress, memory of wins, active steering toward goals — which
is, ironically, the emotional core the README now names as the whole point.

---

## Suggested next moves — DONE (Jul 2 2026)

All five items from the Jul 1 audit have been specced and built:

1. ✅ Wins-memory fork reopened → **Evidence** built
2. ✅ Goal-progress visualization specced → **journey timeline + heatmap** built
3. ✅ Goal→day steering specced → **next-step into Today** built
4. ✅ Balance nudge finished → **category-starvation nudge** built
5. ✅ Top-3 assurance → **hold + check-ins + slip chip** built
