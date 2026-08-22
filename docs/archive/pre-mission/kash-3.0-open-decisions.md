# Kash 3.0 — Open Decisions & Holes (consistency read)

> Output of a Jul 1 2026 consistency read across the full doc set **after** the gap-audit specs
> (Evidence, Goals, Balance, Top-3) were written and folded into the trackers. These are **holes that
> still need a decision or a plan** — coherence gaps, cross-feature conflicts, and unset values — not
> already captured as "build this" in `kash-3.0-remaining-build.md`.
>
> Ordered by leverage. §A items are cross-cutting and should be resolved **before** the four new
> specs are built, because each one touches all four.

---

## A. Cross-cutting holes (resolve before building the new track)

### A1. Nudge arbitration — there is no budget or priority · ✅ RESOLVED (Phase 1)

> **Resolved Jul 1 2026** → `kash-3.0-morning-and-arbitration-build-spec.md` (M4–M9): adaptive budget
> (1, +1 for time-sensitive), **reassurance-first sequencing** (problems surface after a beat, not
> suppressed), problem ranking slip > balance > goal-step, Evidence exempt, one load-aware suppression
> point. Shaping notes retained below.

**The hole.** Every gentle chip in the app flows through one runner (`ProactiveNudgesRunner` →
`useEssentialNudges`), which returns `chips` as a **plain list with no priority, budget, or
arbitration.** Today that's fine — only 3 kinds exist (`top3_stall`, `self_care_walk`,
`monthly_review`). But the four new specs add several more sources: **balance_lopsided**, the **goal
next-step offer**, the **Top-3 slip chip**, and **Evidence milestone-surfacing**. Each spec
independently says "one per day, load-aware" — but nothing stops _three different features_ from all
firing on the same light morning. That directly breaks the "calm, low-chrome" promise.

**Decision needed.** A single **nudge arbitration layer**: adaptive client-side sequencing (reassurance
opener + one problem chip after a beat, +1 for time-sensitive slip), a priority order when several
qualify (slip > balance > goal-step), and the shared over-commit suppression in one place instead of
re-implemented per spec. **Per-kind `nudge_events` dedupe** (D18): each kind may fire at most once per
local date — not a single global nudge/day cap. Owner: `kash-3.0-morning-and-arbitration-build-spec.md`.
**Every new spec's "one per day" line should defer to this.**

### A2. The "morning hand-off" surface doesn't exist · ✅ RESOLVED (Phase 1)

> **Resolved Jul 1 2026** → `kash-3.0-morning-and-arbitration-build-spec.md` (M1–M3): a **daily
> morning-step overlay** — brief, skippable, once/day — gathering carryover, recurring, set-Top-3, the
> hold offer, and the day's reassurance opener. Shaping notes retained below.

**The hole.** The README's morning ritual (review carryover + recurring, set Top-3, optional breath,
RDM hands you one thing) and three specs (Goals steering "morning hand-off offer," Top-3 §3a morning
hold offer, Balance) all assume a **morning moment**. In code there is **no daily morning surface** —
`TodayReviewPanel` is explicitly _end-of-day_, and `MondayEntryModal` is the _weekly_ Monday entry.
The morning hand-off is load-bearing for the new work but unbuilt and unspecced.

**Decision needed.** Define the **daily morning hand-off** as a real surface (its own light moment on
`/today`): what it shows (carryover, recurring due, Top-3 set, the one-tap hold, the single arbitrated
offer), when it triggers (first open of a new local day), and how it relates to the existing EoD
review and weekly Monday entry. This is arguably a prerequisite for A0.2/A0.4 steering to land where
the specs say they do.

### A3. New per-feature toggles vs §15 "no per-type toggles" · ✅ RESOLVED (Phase 2)

> **Resolved Jul 1 2026.** These are ruled **feature-behavior controls, not notification-type
> toggles**, so §15 stands. They live in **one new "Assistance" Settings group**: a master on/off +
> rows for `morningHandoff`, `goalSteering`, `balanceNudge`, `top3MiddayCheckin`, and `evidenceCadence`
> (dropdown). One discoverable home; calm because grouped, not scattered. Shaping notes below.

**The conflict.** Plan §15 locked notification controls as **"a global on/off + focus-block DND. No
per-type toggles for v1 (calm, minimal settings)."** But the four new specs each add a setting:
`evidenceCadence`, `goalSteering`, `balanceNudge`, `top3MiddayCheckin`. That's four per-feature
toggles landing on a decision that deliberately said _none_.

**Decision needed.** Either (a) rule these are **feature-behavior controls, not notification-type
toggles** (so §15 stands and they're allowed), or (b) fold them into **one calm "Assistance" settings
group** with sensible defaults so the surface stays minimal, or (c) drop some toggles and hard-code
defaults. Also unplanned: **where in the Settings IA** these live (Settings today has Categories,
About-me, default-week, notifications, sync, bucket mode, AI config — no "assistance/nudges" home).

### A4. Daily Wins' Care history vs Evidence — overlapping surfaces · ✅ RESOLVED (Phase 2)

> **Resolved Jul 1 2026.** **One "Wins" tab in Care, two zones:** the recent 7-day pulse (hit-rate +
> garden nourish, from `daily-wins-build-spec.md` §3b) on top, the Evidence "scroll of proof"
> (long-horizon, own-voice) below. One place for "my wins," short- and long-horizon together — not
> two near-duplicate tabs. Updates Evidence spec E4/§3a and Daily Wins §3b. Shaping notes below.

**The overlap.** `daily-wins-build-spec.md` §3b already specs a **Wins section in Care** — recent
win-cards, a gentle hit-rate ("wins on 5 of the last 7 days"), and the garden nourish. **Evidence**
(`evidence-build-spec.md`) is _also_ a Care surface showing wins history as a "scroll of proof." Two
Care surfaces reflecting wins back at the user, specced independently.

**Decision needed.** Clarify the split: e.g. **Daily Wins Care section = short-horizon stats + garden
nourish** (the 7-day pulse), **Evidence = long-horizon, own-voice, resurfacing proof** (the quarterly
wall) — or merge them into one surface. Either way, define how they share the `daily_wins` data and
whether they're one tab or two so Care doesn't ship two near-duplicate "your wins" views.

---

## B. Feature-level values · ✅ RESOLVED (Phase 4)

> **Settled Jul 1 2026** in the specs: Top-3 hold = **45-min sprint + break (Care suggestion) +
> resume**; midday check-in = **fixed early afternoon (~1–2pm)**; milestone target dates = **optional**;
> Evidence "larger goal" = **quarter-horizon+ OR 3+ milestones**. Remaining items (balance baseline
> window, lopsided %, cold-start length, slip confirmation) are **engineering defaults** with
> recommended values in each spec — no product decision needed. Original list retained below.

From each new spec's "Open (settle during build)" — consolidated so none is lost:

| Spec     | Unset value                                                                                                                                                         |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Evidence | Exact "larger goal" threshold (E8); voice-guardrail "never do this" list before shipping AI copy.                                                                   |
| Goals    | Milestone `targetDate` optional vs required for timeline; steering copy + exact load threshold; whether an all-goals attention heatmap doubles as a balance signal. |
| Balance  | Baseline window (≈4–6 wk) + "well below usual" %; numeric "lopsided" definition (reuse `dominant` ≥40%?); cold-start suppression length.                            |
| Top-3    | Default hold length (fixed 90m vs inferred from estimates); midday timing (fixed hour vs adaptive); confirm slip threshold vs existing `evaluate-top3-stall`.       |

**Consistency note:** these are four independent "learned/threshold" mechanisms (baseline, estimate
confidence, over-commit, slip). Consider a shared **"still learning…" cold-start pattern** so they
feel like one system, not four.

---

## C. Rename hygiene — two renames in flight · ✅ RESOLVED (Phase 3)

> **Resolved Jul 1 2026.** **Abyss → Backlog = full reframe** (rename **and** move from the dark void
> to the light B&W "ready-to-pull" list) — promoted from idea to committed (`kash-3.0-ideas-backlog.md`).
> **This retires the Abyss dark-surface exception** (plan §5/§10, `design-system-starter.md`) — flag
> those to update. **Sweep = one coordinated pass** covering _both_ Bingo→Goals and Abyss→Backlog:
> all user-facing + AI-tool strings, route redirects (`/abyss`→`/backlog`), storage/horizon keys,
> capture/onboarding copy. Keep the in-app "Backlog" distinct from the planning/build _backlog_ docs.
> **Reframe now fully specced → `kash-3.0-backlog-reframe-build-spec.md`.** Shaping notes below.

**Bingo → Goals** is committed (`goals-view-build-spec.md` G5). **Abyss → Backlog** is a parked idea
(`ideas-backlog.md`). Both touch the **same surfaces**: nav/horizon labels, the command palette,
breadcrumbs, horizon/route storage keys, capture/onboarding copy, and **AI tool names** (Claude tools
referencing "bingo"/"abyss").

**Decision needed.** Before either rename, do one **rename-hygiene sweep plan** (find every user-facing

- tool-facing string, plan redirects for `/abyss`→`/backlog`, decide whether DB table names change).
  Sequence them so they don't collide, and confirm the in-app "Backlog" name stays distinct from the
  planning/build _backlog_ docs.

---

## D. Interactions to watch (lower — validate during build)

- **Today load ballooning.** Goal steering, balance offers, and recurring tasks all _add_ to the day.
  The shared over-commit gate (A1) is what keeps this calm — confirm all three actually consult it.
- **Steering step ↔ RDM/Top-3.** A pulled-in milestone step is a normal task (RDM- and Top-3-eligible
  per the goals spec). Confirm it doesn't quietly crowd out the user's own Top-3 choices.
- **Category color tokens.** All new tints (balance chip, goal per-category, Evidence per-category)
  must read from the canonical category→color tokens, not ad-hoc hex — one map, reused.

---

## E. What is NOT a hole (checked, and fine)

- **Every authoritative spec is tracked** — the five unreferenced docs are Claude-Design prompts /
  shipped handoff plans, now noted as historical.
- **Evidence privacy** — consistent with About-me (never-logged); no conflict.
- **Category model, recurrence, time tracking, sync model** — coherent across all specs.
