# Kash 3.0 — 3 Daily Wins Build Spec

> Build spec for the **3 Daily Wins** feature. Cross-cutting: §12 Care owns the data + history; §6 Today
> owns the daily surface. **Decided Jun 30 2026** (DW-1…DW-6 + placement). Companions:
> `kash-3.0-care-build-spec.md` (§12), `kash-3.0-today-build-plan.md` (§6),
> `kash-3.0-animation-sweep.md` (AN-B4), `kash-3.0-plan.md`.

---

## 0. Purpose

A tiny daily **"three good things"** surface: each day ends with **up to 3 wins** — small proofs the day
counted. ADHD-friendly rationale: make progress **visible and felt**, give effort a dopamine receipt, and
ensure a rough day still shows evidence of good.

**Guardrails (locked, inherited):** no streaks, no red, no scoreboard, no "you missed it." A quiet day is
allowed to be quiet. Wins are warm, never a performance metric.

**Facet labels (DW-7):** UI copy uses **Body · Mind · Soul** (compact). Schema/code enum keys may remain
`physical` / `mental` / `spiritual` where already built.

Two homes (AN-B4):

- **Today** — a **3-slot tracker** that surfaces at the **end-of-day wind-down**; wins **fill quietly
  inline** (no celebration here).
- **Care** — the **history + trends** view; the **garden-nourish reward** plays only here.

---

## 1. Decision log (locked Jun 30)

| #    | Decision               | Choice                                                                                                                                                                                        |
| ---- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DW-1 | Win source model       | **Hybrid** — AI proposes ghosted wins (§9 accept/dismiss); user keeps, swaps, or adds own.                                                                                                    |
| DW-2 | Detection taxonomy     | **Ranked**: Top-3 done › high-priority/effort done › care event › goal/milestone progress › Abyss→action. **Cap: max 1 care event** in the auto-3; tie-break = most recent; never propose >3. |
| DW-3 | Count                  | **Hard cap of 3** hero slots. Extra good things can log as ordinary entries, not in the showcase.                                                                                             |
| DW-4 | Qualitative wins       | **Yes** — a manual win can be free text with no task behind it ("set a boundary," "slept 8h").                                                                                                |
| DW-5 | Garden nourish trigger | **Either, gently** — each win = a small drip; a **full set of 3** = a slightly bigger growth beat. No penalty for fewer.                                                                      |
| DW-6 | Daily rollover         | Reset at **local midnight**, with a **morning grace window (until ~noon next day)** to backfill yesterday.                                                                                    |
| 3a   | Today placement        | **EoD-only** — appears at the wind-down beat as a reflection moment, then tucks away.                                                                                                         |
| DW-7 | Facet labels           | **Body · Mind · Soul** (display everywhere). Internal enum keys may stay `physical` / `mental` / `spiritual` in code — **RESOLVED Jul 1 2026**.                                               |

---

## 2. Data model (assumes DW-1 hybrid)

Wins are mostly **derived**; only **manual entries + overrides** are stored (mirrors care-build-spec;
avoids duplicating completion data).

```
daily_wins
  id            uuid pk
  user_id       uuid  (RLS: owner only)
  win_date      date  (local day; the rollover key)
  slot          smallint 0–2          -- which of the 3 hero slots
  source        enum: task | care_event | goal | abyss | manual
  ref_id        uuid null             -- FK to the source row when source ≠ manual
  label         text null             -- free text for manual wins (DW-4)
  state         enum: accepted | dismissed   -- ghosted-accept lifecycle (§9)
  author        enum: ai | user
  created_at / updated_at  timestamptz
```

- **Proposals are computed at read-time** from existing tables (tasks, care_events, goals, abyss_items) —
  not persisted. A row is written **only on accept / manual-add / dismiss**.
  - **Accept** → `state = accepted, author = ai` (or `user` for swaps).
  - **Dismiss** → `state = dismissed` (so the AI doesn't re-propose the same item).
  - **Manual win** → `source = manual, author = user, state = accepted`, free `label`.
- **Uniqueness:** one accepted win per `(user_id, win_date, slot)`.
- **Grace window (DW-6):** writes are allowed against `win_date = yesterday` until ~noon local; after
  that, yesterday is read-only history.
- Syncs via the existing outbox/watermark path (add `daily_wins` to the synced-tables set). LWW on
  `updated_at`.

**Perf note:** read-time proposal compute is one user-day of rows across a handful of tables — cheap;
no nightly job. Confirm against the sync model during build (expected fine).

---

## 3. Placement & flows

### 3a. Today — EoD 3-slot tracker (quiet)

- **Surfaces at the wind-down / EoD review beat** (not visible during the working day). Presented as a
  gentle reflection moment, then tucks away.
- The AI shows up to **3 ghosted proposals** (DW-2 ranking). Each: **✓ keep**, **✕ dismiss**, or leave it.
- Any empty slot offers **＋ add your own** → free text (qualitative win, DW-4). Slots are **swappable**.
- **Fill motion (AN-B4):** accepting/adding **fills the slot quietly inline** (ghosted → solid). **No**
  celebration in Today.
- Keyboard-friendly; accept/dismiss without leaving the keyboard.

### 3b. Care — history + trends + reward

- A **Wins** section in Care (beside frequency/mood stats, §12). Shows recent days as small win-cards, a
  **gentle hit-rate** ("wins on 5 of the last 7 days" — informative, **not** a streak), and the **garden**
  responding to wins (DW-5).
- **Only place** the celebratory **garden-nourish** animation plays (AN-B4 / AN-C3): a small drip per win,
  a slightly bigger growth beat on a full set of 3.

### 3c. AI behavior (§11)

- The **Reflection register** computes + proposes the day's candidate wins (DW-2) as ghosted items at the
  EoD beat, and can reflect a manual win back warmly. Essential-nudges-only: at most one gentle EoD prompt,
  **never** a "no wins" guilt nudge.

---

## 4. States & edges

- **Zero wins:** allowed, non-judgmental — soft empty state ("Tomorrow's a fresh page"), no red, no
  streak-break.
- **First run:** a one-line explainer the first time the tracker appears; the first proposal teaches by
  example.
- **Reduced motion:** inline fill + garden growth fall back to a fade (AN-0c).
- **Offline:** manual adds + accepts work locally and sync later (outbox). Proposals render from local data.
- **Grace window:** only the immediately-prior day, only until ~noon (DW-6).

## 5. Integration

- **§6 Today:** the EoD review surfaces the tracker; completions feed the candidate pool.
- **§12 Care:** owns history, the wins hit-rate stat (already named in care-build-spec), garden
  nourishment; feeds the §7.6 weekly review.
- **§11 AI persona:** Reflection register proposes + reflects.
- **§9 ghosted-accept:** reused verbatim for proposals.
- **Top-3 / care_events / goals / abyss / priority+effort:** read as candidate sources (DW-2).

## 6. Motion (decided)

- **AN-B4** — Today slot fills quietly inline; garden-nourish reward grows only in Care.
- **AN-C3** — Care garden plant grows from the soil (scale-from-base, slight overshoot) on nourish;
  small drip per win, bigger beat on a full 3 (DW-5).

---

## 7. Build slice (PRs)

1. **DWN-1** — `daily_wins` table + RLS + sync wiring + tRPC CRUD; read-time candidate-proposal query
   (DW-2 ranking + 1-care-event cap); grace-window write rule (DW-6).
2. **DWN-2** — Today EoD 3-slot tracker UI (ghosted proposals, keep/dismiss/add, swap, inline fill).
3. **DWN-3** — Care Wins section: history cards + gentle hit-rate + garden nourishment hook (DW-5).
4. **DWN-4** — AI Reflection-register proposal + single gentle EoD prompt (gated by nudge rules).
5. **DWN-5** — Verify: Vitest (ranking, care cap, rollover + grace window, override/dismiss states),
   manual QA (empty-day tone, reduced-motion, offline add), typecheck/lint/RLS audit.

**Build-ready:** dimensions 1–7 are decided; tokens (§5) + motion (AN-B4/C3) are global layers.
