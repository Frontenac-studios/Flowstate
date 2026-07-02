# Kash 3.0 — Top-3 Assurance Build Spec

> Makes "I'll **know** my Top 3 get done — without scheduling them manually" real. Resolves the Top-3
> PARTIAL in `kash-3.0-goals-vs-build.md`: today Top-3 is a static list + a single 2pm stall check.
> This adds gentle, load-aware assurance — a one-tap time hold, three light touchpoints, and a soft
> flag when something keeps sliding — while honoring "guided, in control, never nagging."
>
> **Status:** shaped Jul 1 2026 (decision session). Ready to slice. Builds on existing Top-3 code.

---

## 0. Purpose

The user sets three priorities in the morning and wants confidence they'll land — but explicitly does
**not** want to hand-schedule them, and does **not** want to be nagged on a busy day. So assurance
here means: keep the Top-3 quietly in view, make it one tap to protect time, check in a few times
without pinging, and speak up only when a task genuinely keeps slipping.

---

## 1. Decision log (locked Jul 1 2026)

### Functional

| #   | Decision        | Choice                                                                                                                                                                                                                                        |
| --- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | Time protection | **Offer a block, one tap.** Kash offers to hold a focus block for the Top-3; it places it only when the user taps. No manual scheduling, no silent auto-reserve.                                                                              |
| T2  | Check-in rhythm | **Morning + midday + wind-down**, all **load-aware** — the midday check-in suppresses when the day is over-committed. Predictable, gentle touchpoints.                                                                                        |
| T3  | When it slips   | **Silent rollover by default; flag persistent slips.** Unfinished Top-3 rolls to tomorrow quietly (existing behavior), BUT a task sitting in Top-3 **2+ days with no progress** gets surfaced: "keeps sliding — break it down, or let it go?" |

### Visual design

| #   | Decision        | Choice                                                                                                                                                     |
| --- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TD1 | Midday check-in | **On the slots** — lives on the Top-3 list itself: completed items struck through, a quiet "still time for these · {h} left" beneath. Not a separate chip. |
| TD2 | Hold-time offer | **Timeline ghost block** — a dashed placeholder appears on the Today timeline; tap to confirm the hold, so the user sees exactly where the time lands.     |
| TD3 | Persistent slip | **Gentle chip** — an amber chip that names the choice ("'File taxes' keeps sliding. Break it down, or let it go?"). Present, but not a full modal.         |

**Settled (Phase 4, Jul 1 2026):**

- **Hold length = 45-min sprint + break + resume (T1/TD2).** The one-tap hold is a **45-minute** focus
  block; at the end Kash **prompts a break with suggestions** (a Care breathing/walk offer), then lets
  the user **continue another 45** if they want. Not a static block — a gentle sprint/rest rhythm that
  ties Top-3 focus into Care.
- **Midday timing = fixed early afternoon (~1–2pm)** (T2), matching the current stall-check timing.
  Suppression still reuses the over-commit signal via the arbiter (M9).
- **Milestone/slip threshold (T3)** — confirm "2+ days, no focus time and not completed" against the
  existing `evaluate-top3-stall` "slipped" definition (engineering default).

---

## 2. Data model

Read-mostly; reuses Top-3 + protected-block + nudge infra.

- **Time hold (T1/TD2)** — reuse **`protected_blocks`**: the one-tap hold creates a **45-minute**
  protected block on the Today timeline flagged as a Top-3 focus hold (add a small `kind`/`source`
  marker, or a nullable `top3` boolean). On completion, a **break prompt** offers a Care break
  (breathing/walk) and a **resume** for another 45; a resumed sprint is a second block. No new table.
- **Slip detection (T3)** — reuse **`evaluate-top3-stall`**, which already computes both a same-day
  stall and a multi-day "slipped" state. Needs a reliable "days in Top-3 without progress" signal;
  derive from `top3Order` + `top3PinnedAt` + focus history, adding a first-entered timestamp only if
  the current signal is insufficient.
- **Nudge kinds** — `top3_stall` already exists. Surface the **slip chip** via it (or add `top3_slip`
  if the copy/behavior needs to differ). The **midday check-in is not a nudge** — it's a UI state on
  the Top-3 slots (TD1), so no nudge row.
- **Setting** — extend `app_settings`: `top3MiddayCheckin` (`on` | `off`, default `on`). Time hold and
  slip flag need no toggle (both are user-initiated / rare).

RLS `auth.uid()`; protected blocks + nudges already carry sync + `(user_id, updated_at)`.

---

## 3. Placement & flows

### 3a. Morning (T2)

At set-up, the Top-3 slots show the existing wind-down deadline ("Top 3 by {time}", `Top3Deadline`).
Alongside, the **one-tap hold offer** (TD2): a dashed **ghost block** on the Today timeline sized to
the default hold, placed around existing commitments — tap to confirm, ignore to skip. Nothing is
reserved unless tapped (T1).

### 3b. Midday (T2, TD1)

A single, load-aware check-in **rendered on the Top-3 slots themselves** (`Top3Slots`): completed
tasks struck through, incomplete ones live, and a quiet line beneath — "still time for these · {h}
left." **Suppressed** when the day is over-committed (reuse the over-commit signal). No chip, no ping —
it's just how the list reads at midday.

### 3c. Wind-down (T2)

The existing soft deadline holds ("aim to finish by {time}"). The end-of-day review (`Top3ReviewSummary`)
shows what landed. Unfinished items roll over silently (T3, `useTop3Rollover`).

### 3d. Persistent slip (T3, TD3)

`evaluate-top3-stall` flags a task in Top-3 **2+ days with no progress**. Surface it as a **gentle
amber chip** (TD3) that names the choice — break it down (opens quick decomposition), drop it, or keep.
Not on day one, not for a normal single-day carryover — only when something genuinely keeps sliding.

---

## 4. States & edges

- **All three done** — midday check-in reads as a quiet win; no wind-down pressure. (Ephemeral
  celebration per §15 still applies — separate from this.)
- **Busy day** — midday check-in and any initiated offer suppress; the wind-down deadline and silent
  rollover remain, so nothing is withheld, nothing nags.
- **Hold declined** — no block; Top-3 still tracked via list + deadline.
- **Fewer than 3 set** — everything scales to however many Top-3 exist.
- **Slip resolved** — chip clears the moment the task gets focus time or is broken down/dropped.
- **`top3MiddayCheckin = off`** — no midday line; morning hold offer + wind-down + slip flag remain.

---

## 5. Integration

- **Existing Top-3 code** — `Top3Slots`, `Top3Deadline`, `Top3ReviewSummary`, `useTop3Rollover`,
  `build-top3-status`, `evaluate-top3-stall`, `template-nudge`. This spec adds the hold, the midday
  slot-state, and the slip chip on top of them.
- **Protected blocks** — the time hold is a protected block (the infra exists, currently unused for
  Top-3); it participates in the timeline + AI week-draft "respect protected blocks" logic.
- **Over-commit / load** — the same signal that gates goal-steering (G3) and balance nudges (B4) gates
  the midday check-in and offers here. One shared notion of "the user is slammed."
- **RDM / Focus** — Top-3 remain RDM- and focus-eligible; a held block is a natural focus-timer target.
- **Plan** — closes the Top-3 assurance gap; update `docs/build-status.md` + `goals-vs-build.md`.
- **Sync / RLS** — protected-block marker + setting ride existing sync; `auth.uid()`.

---

## 6. Motion

The ghost block settles in softly and firms up on confirm. The midday slot-line cross-fades in. The
slip chip arrives with the standard gentle nudge settle — amber, never alarming. Per `animation-sweep.md`.

---

## 7. Build slice (suggested PRs)

1. **One-tap hold** — ghost block on the Today timeline (TD2) → confirmed `protected_blocks` hold (T1);
   default-length logic.
2. **Midday check-in** — load-aware slot-state on `Top3Slots` (TD1) + `top3MiddayCheckin` setting (T2).
3. **Persistent-slip chip** — surface `evaluate-top3-stall`'s slipped state as the amber choice chip
   (TD3) with break-down / drop / keep (T3).
4. **Docs** — flip Top-3 to built in `goals-vs-build.md` + `build-status.md`.
