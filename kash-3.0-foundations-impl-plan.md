# Kash 3.0 — Foundations Implementation Plan (A0.0)

> Code-grounded build plan for the two prerequisites in
> `kash-3.0-morning-and-arbitration-build-spec.md`: the **nudge arbiter** and the **morning hand-off**.
> Written against the actual code (read Jul 1 2026). **Build before the four feature tracks.**
>
> Verify at build: `npm run typecheck` + `npm run test:run` (native-binding issues only affect the
> sandbox, not the user's machine).

---

## 0. What exists today (verified)

- **Client:** `src/hooks/useEssentialNudges.ts` — POSTs `/api/nudges/evaluate`, then **accumulates
  every returned chip** into `chips` state (dedupe by `kind` only), returns them as a flat list.
  Already has: initial defer (`INITIAL_DEFER_MS = 4s`), a `visibilitychange` re-check, and a timer to
  `hour 14` (2pm) via `msUntilNextNudgeCheck()`. Suppression already present: `notificationsEnabled`
  - `shouldSuppressInAppNudges(constraints)`.
- **Render:** `src/components/kash/nudges/ProactiveNudgesRunner.tsx` — maps `chips` → stacked
  `EssentialNudgeChip`s, fixed bottom-left. **No priority, no budget.**
- **Types:** `src/lib/nudges/essential-nudge-types.ts` — `EssentialNudgeChipPayload = { kind, message }`;
  kinds = `top3_stall | self_care_walk | monthly_review`.
- **Server:** `/api/nudges/evaluate` → `src/server/nudges/run-nudge-evaluation.ts` (evaluates, writes
  `nudge_events`, returns `{ chips }`).
- **Weekly ritual precedent:** `MondayEntryModal` + `MondayEntryRunner` (once-per-week overlay with
  storage-gated show) — **the pattern to clone for the daily morning hand-off.**

---

## 1. PR-A — Nudge arbiter (refactor, no new UI)

Turns the flat list into an **opener + a sequenced problem queue** (spec M4–M9).

### 1.1 Types (`essential-nudge-types.ts`)

```ts
export const essentialNudgeKinds = [
  "top3_stall",
  "self_care_walk",
  "monthly_review",
  "balance_lopsided",
  "goal_step",
  "top3_slip",
  "evidence_surface", // new
] as const;

export type EssentialNudgeClass = "reassurance" | "problem";

export type EssentialNudgeChipPayload = {
  kind: EssentialNudgeKind;
  message: string;
  klass: EssentialNudgeClass; // NEW — reassurance vs problem
  priority: number; // NEW — lower = surfaces first (within problem class)
  action?: { type: string; payload?: unknown }; // NEW — generalizes handleAction
};
```

- **Class map:** `evidence_surface` → reassurance; `top3_slip`, `balance_lopsided`, `goal_step`,
  `top3_stall` → problem; `self_care_walk` stays problem-ish (offer). `monthly_review` → reassurance/neutral.
- **Priority (problem class, M7):** `top3_slip` (0) < `balance_lopsided` (1) < `goal_step` (2) <
  `top3_stall`/`self_care_walk` (3).

### 1.2 Server (`run-nudge-evaluation.ts`)

- Tag each emitted chip with `klass` + `priority` + `action`.
- Add over-commit gate: when the day is over-committed, **drop problem-class** initiations before
  returning (reassurance may still pass). One place (M9). Reuse the over-commit signal used by
  `OverCommitFlag`.
- Evidence surfacing is **budget-exempt** (M8): it's emitted on its own cadence (quarterly / big-goal
  completion), not gated by the daily problem budget.

### 1.3 Client arbiter (`useEssentialNudges.ts`)

Replace the "accumulate all" reducer with arbitration:

- Split incoming chips into `reassurance[]` and `problem[]`.
- **Opener:** at most one reassurance chip → returned as `opener` (consumed by the morning hand-off,
  §PR-B). Not rendered as a bottom-left chip.
- **Problem queue:** sort by `priority`; expose **one** now; **hold** the rest.
  - **The beat (M6):** release the next problem chip after a delay (reuse the existing timer infra —
    a `RELEASE_BEAT_MS`, or gate on the next `visibilitychange` / the 2pm timer). Never show two at once.
  - **Adaptive budget (M4):** allow a **second** same-day chip only if it's time-sensitive
    (`top3_slip`); otherwise cap at one.
- New return shape: `{ opener, chip, dismiss, handleAction }` (was `{ chips, ... }`).
- Generalize `handleAction` to switch on `action.type` (keeps top3/self-care/monthly behavior).

### 1.4 Render (`ProactiveNudgesRunner.tsx`)

- Render **only the single arbitrated `chip`** (not a list). Opener goes to the morning overlay.
- Keep the fixed bottom-left placement + `aria-live`.

### 1.5 Tests

- Arbiter unit tests: budget cap (1, +1 for slip), reassurance-never-stacks-with-problem, beat spacing,
  priority order, over-commit suppression of problem class, evidence exemption.

---

## 2. PR-B — Morning hand-off overlay

Clone the `MondayEntryModal` + `MondayEntryRunner` pattern for a **daily** moment (spec M1–M3).

### 2.1 Components

- `src/components/kash/plan/MorningHandoffModal.tsx` — brief overlay: greeting, **carryover** (reuse
  `useTop3Rollover` / rollover data + defer/keep/drop), **recurring due today**, **set Top-3**
  (`Top3Slots`), **hold offer** (Top-3 spec TD2 ghost block), and the **opener slot** (the arbiter's
  reassurance opener, if any). "Skip" + "Begin". Compressed variant on over-committed mornings
  (carryover + Top-3 only).
- `src/components/kash/plan/MorningHandoffRunner.tsx` — mounts on `/today`; shows once per local day.

### 2.2 Once-a-day gating

- Mirror the Monday-entry storage gate, but keyed to **local date** (not ISO week). Options: a
  `morning_handoff` row in `nudge_events` (per-local-date dedupe, already indexed) **or** a
  `lastMorningHandoff` date in `app_settings`. Prefer `nudge_events` for parity with dedupe infra.
- Respect `morningHandoff` setting (PR-D). Skippable, non-blocking.

### 2.3 Mount

- Add `<MorningHandoffRunner />` on `/today` (near `ProactiveNudgesRunner`, inside `ChatProvider`).

---

## 3. PR-C — Wire the opener + settle EoD/Monday relationship

- Feed the arbiter's `opener` into `MorningHandoffModal`'s opener slot.
- Confirm the three surfaces read as a family: **morning hand-off** (daily dawn) · **EoD review**
  (`TodayReviewPanel`, daily dusk) · **Monday entry** (weekly). No duplicated affordances.

---

## 4. PR-D — "Assistance" settings group (A3)

- New Settings section "Assistance": master on/off + `morningHandoff`, `goalSteering`, `balanceNudge`,
  `top3MiddayCheckin`, `evidenceCadence` (dropdown). Extends `app_settings` + the settings tRPC router.
- These are **feature-behavior** controls (not notification-type), so §15's "no per-type toggles" holds.

---

## 5. Suggested order & sizing

1. **PR-A arbiter** (M) — pure refactor; unblocks everyone. Ship behind current 3 kinds first (no
   behavior change), then feature PRs add their kinds.
2. **PR-D Assistance settings** (S) — small; needed so the overlay + nudges have their toggles.
3. **PR-B morning hand-off** (M) — the overlay; clone Monday-entry.
4. **PR-C wiring** (S) — connect opener; tidy the three-surface family.

Then the four feature tracks (Evidence, Top-3, Balance, Goals) land their nudge kinds **through the
arbiter** and their moments **through the hand-off**, per each spec's updated cadence lines.

---

## 6. Guardrails

- Don't regress the existing 3 nudges — snapshot their behavior in tests before refactor.
- Keep `strict` TS + Zod on new inputs (`claude.md`).
- New tables/columns: `(user_id, updated_at)` index + RLS `auth.uid()` + sync (standing reqs).
- No `--no-verify`; conventional commits; branch `feat/foundations-nudge-arbiter` etc.
