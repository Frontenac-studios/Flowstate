# Kash 3.0 — Morning Hand-off & Nudge Arbitration Build Spec

> The two cross-cutting **foundations** the reassurance/steering track depends on (holes A1 + A2 in
> `kash-3.0-open-decisions.md`). Every new feature (Evidence, Goals steering, Balance, Top-3) surfaces
> a moment or a nudge; without these two, they'd have nowhere coherent to land and would stack into
> noise. **Build these first.**
>
> **Status:** shaped Jul 1 2026 (Phase 1 decision session). Ready to slice.

---

## 0. Purpose

Two gaps the gap-audit specs all leaned on but that don't exist yet:

1. **A morning hand-off** — a daily moment to start the day (carryover, recurring, set Top-3, the hold
   offer, the day's opening nudge). Today there's only an _end-of-day_ review and a _weekly_ Monday
   entry — no daily morning surface.
2. **Nudge arbitration** — all gentle chips flow through one runner (`ProactiveNudgesRunner` →
   `useEssentialNudges`) with **no budget or priority**. With the new nudge sources that would let
   several chips fire the same day, breaking "calm."

---

## 1. Decision log (locked Jul 1 2026)

### A2 — Morning hand-off

| #   | Decision                                                    | Choice                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Form                                                        | **Morning step (overlay).** A brief daily overlay flow (kin to the Monday entry modal, but daily) — the day's deliberate opening ritual.                                                                 |
| M2  | The day's opening nudge lives **inside** the morning moment | The single reassurance-class opener surfaces _within_ the overlay — one calm place to begin, everything gathered. Problem-class nudges come **later** (M6).                                              |
| M3  | Lightness guardrails                                        | Because a daily modal risks feeling heavy: it's **skippable** ("Skip"), **non-blocking**, appears **once per local day** (dismiss/complete → doesn't reappear), and stays brief. Honors calm/low-chrome. |

### A1 — Nudge arbitration

| #   | Decision                          | Choice                                                                                                                                                                                                                                                                                            |
| --- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M4  | Budget                            | **Adaptive (client queue).** Baseline **one** problem-class chip after the beat; allow a **second** only for something time-sensitive (e.g. a persistent slip). **Per-kind server dedupe** via `nudge_events` (each kind at most once/local date — D18; not one global nudge/day). Never a stack. |
| M5  | Priority model                    | **Reassurance first, problems still surfaced — sequenced, not suppressed.** Reassurance-class (Evidence resurface / a genuine win) **opens** the day; problem-class nudges are **not dropped** — they surface **after a beat** so warmth lands before friction.                                   |
| M6  | The "beat"                        | Problem-class nudges appear **later than** the morning opener — after the overlay closes / at a later touchpoint (e.g. midday), never in the same instant as the reassurance. Spacing is the mechanism.                                                                                           |
| M7  | Problem-class ranking             | Among problem-class, order is **persistent slip > balance starved > goal next-step**. Highest-friction first.                                                                                                                                                                                     |
| M8  | Evidence cadence is its own thing | Evidence resurfacing is rare (quarterly / big-goal completion). It's the natural reassurance **opener** when it fires; it does **not** compete in the daily problem budget.                                                                                                                       |
| M9  | One suppression point             | Load-aware suppression (the over-commit signal) lives in the arbiter, **once** — every feature defers to it instead of re-implementing "one per day, load-aware."                                                                                                                                 |

**Open (settle during build):**

- Exact "beat" spacing (M6) — a fixed delay, the next natural touchpoint (midday), or on next interaction.
- Morning-step trigger time — first `/today` open of a new local day; behavior if first open is late afternoon (show a compressed version, or skip to inline).
- Whether the overlay is truly modal or a large dismissible sheet (both satisfy M1/M3 — pick for feel).

---

## 2. The arbitration model (the heart of A1)

A single **nudge arbiter** (extend `run-nudge-evaluation.ts` + `useEssentialNudges`) replaces the
current "return all qualifying chips" behavior:

1. **Gather** all qualifying nudges, tagged **reassurance-class** (Evidence resurface, a genuine win)
   or **problem-class** (slip, balance, goal next-step).
2. **Suppress** by load (M9) — if the day is over-committed, drop problem-class initiations entirely;
   reassurance may still open.
3. **Open** with at most one reassurance-class item, shown **in the morning moment** (M2).
4. **Hold** problem-class items; release **one** after a beat (M6), ranked by M7. Release a **second**
   only if time-sensitive (M4) and still spaced.
5. **Dedupe** per local date via `nudge_events` as today.

Net effect: a good morning opens warm and quiet; if something needs attention, it taps you a little
later — never a wall of chips, never friction-first.

---

## 3. The morning hand-off (A2)

### 3a. What it gathers (M1)

A brief overlay on first `/today` open of a new day:

- **Carryover** — unfinished from yesterday, each with the existing defer/keep/drop options.
- **Recurring due** — today's recurring tasks to accept into the day.
- **Set Top-3** — the prompt to choose today's three (feeds Top-3 assurance).
- **Hold offer** — the one-tap timeline ghost-block hold for the Top-3 (Top-3 spec TD2), offered here.
- **The opener** — the single reassurance-class nudge (M2/M5), if one qualifies. Otherwise nothing —
  the overlay never manufactures a nudge.

### 3b. Feel (M3)

Calm, skippable, once-a-day. "Skip" always present; completing or skipping marks the day done. Brief —
this is a _hand-off_, not a planning session (that's the weekly Monday entry). Load-aware: on an
over-committed morning it can render compressed (carryover + Top-3 only).

### 3c. Relationship to existing surfaces

- **EoD review** (`TodayReviewPanel`) stays the evening bookend; morning hand-off is its dawn twin.
- **Weekly Monday entry** (`MondayEntryModal`) stays the weekly planning ritual; the daily hand-off is
  lighter and every-day. They should feel like a family, not duplicates.

---

## 4. Data model

- **Morning-step dedupe** — a per-local-date marker so it shows once/day (reuse `nudge_events`-style
  row with a `morning_handoff` kind, or a small `app_settings`/daily-state field).
- **Arbiter** — no new table; it's logic over the existing `nudge_events` + qualifying evaluators.
- **Setting** — `morningHandoff` (`on` | `off`, default `on`) — see the Settings reconciliation in
  A3 (`kash-3.0-open-decisions.md`); this toggle should land in the same "Assistance" group.
- RLS `auth.uid()`; rides existing sync.

---

## 5. Integration (this is the spine the other four plug into)

- **Every gap-audit spec's "one per day, load-aware" line now defers here.** Update Evidence (surfacing),
  Balance (B4), Goals steering (G2/G3), Top-3 (slip chip) to route through the arbiter rather than each
  owning its own cadence/suppression. Their per-feature intent stays; the _delivery_ centralizes.
- **Top-3** — the morning hold offer + Top-3 setting live in the hand-off (§3a).
- **Goals steering** — the "morning hand-off offer" G2 referenced now has a real home; it's a
  problem-class nudge released after the beat, not in the opener.
- **Evidence** — the reassurance-class opener; its resurfacing is M8-exempt from the daily budget.
- **Balance** — problem-class, ranked below slips (M7).
- **Settings (A3)** — `morningHandoff`, `evidenceCadence`, `goalSteering`, `balanceNudge`,
  `top3MiddayCheckin` should cohere as one **Assistance** group (resolve in Phase 2 / A3).

---

## 6. Visual & motion

- **Morning step** — overlay/sheet; brief, one calm screen, "Skip" + "Begin". Soft settle in, gentle
  fade out. Not confetti, not heavy.
- **Arbiter** — reassurance opener rendered in the overlay; later problem chip uses the standard
  `EssentialNudgeChip` settle. The **beat** (M6) is felt as spacing, not animation.
- Per `animation-sweep.md`.

---

## 7. Build slice (suggested PRs) — do before the four feature tracks

1. **Nudge arbiter** — reassurance/problem classing, adaptive budget (M4), sequencing/beat (M5/M6),
   ranking (M7), one load-aware suppression point (M9). Refactor `useEssentialNudges` to return an
   _opener_ + a _deferred queue_, not a flat list.
2. **Morning hand-off overlay** — carryover + recurring + set-Top-3 + hold offer + opener slot;
   once-a-day dedupe; skippable; compressed busy-day variant.
3. **Wire the four tracks through the arbiter** — land as each feature builds; update their specs'
   cadence lines to defer here.
