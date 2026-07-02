# Kash 3.0 — Balance Guidance (nudge) Build Spec

> Turns balance from something Kash **senses** into something it **advocates for**. Resolves
> **Gap C** in `kash-3.0-goals-vs-build.md`: the plan (§2) promises AI that "nudges when one category
> is starved," but the build only ships `top3_stall`, `self_care_walk`, `monthly_review`. This adds
> the missing balance voice — gently, credibly, and only when the mix is genuinely tilted.
>
> **Status:** shaped Jul 1 2026 (decision session). Ready to slice. Builds heavily on existing code
> (`computeCategoryBalance`, `abyss-balance-candidates`, `EssentialNudgeChip`, `BalanceBar`).

---

## 0. Purpose

The whole thesis is that Kash pulls you back toward the life sectors that go dark — but today it
computes lopsidedness and neglect and then says nothing. This spec gives balance a small, trustworthy
voice: it speaks up **only when the overall mix is genuinely tilted**, names it calmly, and turns the
gap into one easy action — without becoming the nag that gets muted.

---

## 1. Decision log (locked Jul 1 2026)

### Functional

| #   | Decision         | Choice                                                                                                                                                                                                           |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | "Starved" test   | **Learned baseline.** Kash learns each category's normal rhythm and flags when one drops **well below its own usual** — no arbitrary fixed numbers, adapts to the user.                                          |
| B2  | Trigger scope    | **Overall lopsidedness.** The gate is "one sector is eating everything," not per-category alarms. This avoids crying wolf on a naturally-quiet category — the nudge only fires when the mix is truly tilted.     |
| B3  | Nudge action     | **Offer something to do.** Surface a matching item from the **Abyss** in the thin category, or offer to add a small task/protected block. The gap becomes one tap.                                               |
| B4  | Cadence          | **Both:** at most **one load-aware nudge/day** (goes silent when already over-committed; rotates so nothing nags) **and** a **weekly digest** folded into the Sunday / EoW review ("these got light this week"). |
| B5  | Target selection | When lopsided (B2), use learned baselines (B1) to find the category(ies) below their usual and offer an action (B3) for the **most-starved** one.                                                                |

### Visual design

| #   | Decision         | Choice                                                                                                                                                                 |
| --- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BD1 | Daily nudge look | **Category-tinted chip** — an `EssentialNudgeChip` tinted in the starved category's color, with an inline "Add it" action. Warm; unmistakable which sector it's about. |
| BD2 | Balance-bar cue  | **Tilt caption** — a small, quiet caption under the existing `BalanceBar` ("tilted toward work this week"). A note, not a mark; keeps the bar calm.                    |

**Open (settle during build):**

- Baseline window + "well below usual" threshold (B1) — e.g. trailing 4–6 weeks, flag at <X% of usual.
- What "lopsided" means numerically (B2) — reuse `computeCategoryBalance`'s existing `dominant`/`lopsided`
  (dominant ≥ 40%) or tune. Confirm against real data so it fires rarely and meaningfully.
- Cold start: suppress balance nudges until enough history exists to learn a baseline (see §4).

---

## 2. Data model

Read-mostly; leans on existing balance + abyss code.

- **Nudge kind** — add `balance_lopsided` to `nudge_events.kind` enum and to `essentialNudgeKinds`
  (`src/lib/nudges/essential-nudge-types.ts`) so the daily nudge dedupes per local date like the others.
- **Learned baseline** — **derived**, not a new table for v1: compute each category's trailing-window
  attention (task weight + focus time) at evaluation time and compare current to baseline. If perf
  needs it later, add a small `category_baseline` cache; not required now.
- **Setting** — extend `app_settings`: `balanceNudge` (`on` | `off`, default `on`). Load-awareness is
  automatic (B4), not a separate toggle.
- No change to `BalanceBar`'s data — BD2 caption reads the existing `lopsided`/`dominant` output.

RLS `auth.uid()`; nudge rows already carry the `(user_id, updated_at)` index + sync.

---

## 3. Placement & flows

### 3a. Detection (B1, B2, B5)

Runs in the existing nudge evaluation pass (`src/server/nudges/run-nudge-evaluation.ts`):

1. Compute overall balance via `computeCategoryBalance`. **Gate on lopsidedness** (B2) — if the mix
   isn't tilted, do nothing.
2. If lopsided, compute each category's **learned baseline** (B1) and find those **below their usual**.
3. Pick the **most-starved** category (B5) and fetch a candidate action (B3) — an Abyss item in that
   category (`abyss-balance-candidates.ts`) or a "add a small thing" affordance.

### 3b. Daily nudge (B4, BD1)

- Delivered as a **category-tinted `EssentialNudgeChip`** on today/plan/care (same channel as walk /
  top3), tinted in the starved category's color, with the offered action inline ("Coffee with a
  friend? · Add it").
- **At most one per day**, deduped via `nudge_events`. **Load-aware:** suppressed when the day is
  over-committed (reuse the over-commit signal), so it never piles onto a slammed day. Rotate the
  category across days so no single sector nags.
- Accepting the action adds the task/pulls the Abyss item into the day (normal, category-carrying).

### 3c. Weekly digest (B4)

- Folded into the **Sunday / EoW review** (`EowReviewRunner`): a calm "these got light this week"
  summary listing the thin categories, each with the same one-tap offer. Never interrupts a weekday.

### 3d. Balance-bar caption (BD2)

- When `computeCategoryBalance` reports lopsided, `BalanceBar` shows a small caption beneath it
  ("tilted toward {category} this week"). Quiet, always-visible context — distinct from the nudge,
  which is the active offer. No caption when balanced.

---

## 4. States & edges

- **Cold start / not enough history** — no baseline yet, so **no balance nudges** until a learnable
  window exists (~a few weeks). Bar caption can still show gross lopsidedness. No fabricated alarms.
- **Balanced day** — nothing fires; no caption.
- **Busy day** — daily nudge suppressed (B4); weekly digest still lands on Sunday.
- **Empty Abyss in the thin category** — fall back to the "add a small thing" offer; never surface an
  irrelevant item.
- **`balanceNudge = off`** — no daily nudge and no digest; bar caption remains (it's context, not a nudge).
- **Naturally-quiet category** — because the trigger is overall lopsidedness (B2) + own-baseline (B1),
  a category that's _always_ light won't trip it; only a real drop-plus-tilt does.

---

## 5. Integration

- **Existing balance code** — `computeCategoryBalance` (`src/lib/tasks/category-balance.ts`) supplies
  lopsided/dominant/empty; this spec adds the learned-baseline layer + the delivery the plan promised.
- **Abyss** — `abyss-balance-candidates.ts` / `fetch-abyss-balance-candidates.ts` already surface
  category-matched items; B3 is their consumer.
- **Nudges** — reuses `EssentialNudgeChip` + `useEssentialNudges` + `nudge_events` dedupe; adds one kind.
- **Goals steering** — complementary: the goal spec's "offer the next step" (G2) and this "offer
  something in the thin category" share the ghosted-accept / chip pattern; a starved category that has
  a goal can offer that goal's next step (the third nudge-action option, available as a variant).
- **Over-commit / load** — consumes the same load signal the goal-steering suppression uses (§3b).
- **Plan** — closes the §2 promise; update `docs/build-status.md` Gap-C / balance line to "built."
- **Sync / RLS** — new enum value + setting ride existing sync; `auth.uid()`; never logs task content.

---

## 6. Motion

The tinted chip arrives with the standard essential-nudge settle (no attention-grabbing motion —
balance should feel like a gentle tap). The bar caption cross-fades in/out as lopsidedness changes.
Per `animation-sweep.md`.

---

## 7. Build slice (suggested PRs)

1. **Learned baseline** — trailing-window per-category attention + "below usual" detection; gate on
   `computeCategoryBalance` lopsidedness.
2. **Daily nudge** — `balance_lopsided` kind; category-tinted `EssentialNudgeChip` (BD1) with Abyss/
   add-a-thing action; one-per-day dedupe + load-aware suppression; `balanceNudge` setting.
3. **Bar caption** — BD2 tilt caption on `BalanceBar`.
4. **Weekly digest** — thin-category summary in `EowReviewRunner` (B4).
5. **Docs** — flip Gap C to built in `goals-vs-build.md` + `build-status.md`.
