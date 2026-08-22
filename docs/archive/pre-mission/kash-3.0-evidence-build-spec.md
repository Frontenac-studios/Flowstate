# Kash 3.0 — Evidence Build Spec

> _"Evidence that you're that bitch."_ The backward-looking half of Kash: a calm, credible surface
> that reflects your accomplishments and progress back to you so visible progress becomes
> reassurance. Resolves **Gap A** in `kash-3.0-goals-vs-build.md` and reconciles README goals #5
> (visualization) and #6 (be _reminded_ of wins) with the plan.
>
> **Status:** shaped Jul 1 2026 (decision session). Ready to slice. Promoted from
> `kash-3.0-ideas-backlog.md`.

---

## 0. Purpose

Every prior tool failed at the same point: it never gave the reassurance or the visualization of
progress the user wanted, so they stopped opening it. Wins today are captured and celebrated **once**
at end-of-day, then never resurfaced — the data exists but is never reflected back. Evidence is the
surface that reflects it back: **your own wins and words, lightly threaded together in your own voice,
as proof of who you've been proving yourself to be.**

It is memory, not metrics. It must never become a scoreboard (see §5, reconciliation with plan §15).

---

## 1. Decision log (locked Jul 1 2026)

| #   | Decision             | Choice                                                                                                                                                                                                                                                            |
| --- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Access model         | **Both** — a permanent shrine **and** Kash resurfaces it.                                                                                                                                                                                                         |
| E2  | Content              | **Braid, weighted to the user's own wins + words.** Real artifacts are the substance; AI is a thin connective thread.                                                                                                                                             |
| E3  | AI voice             | **The user's own voice, reflected** — drawn from their reflections + About-me tone. Not a hype friend, not a detached observer.                                                                                                                                   |
| E4  | Home                 | **The "Wins" tab in Care, lower zone** _(refined Phase 2 / A4)_. One "Wins" tab, two zones: recent **7-day pulse** (Daily Wins hit-rate + garden nourish) on top, **Evidence** scroll below. Not a standalone tab — short- and long-horizon wins together.        |
| E5  | Resurfacing triggers | **(a) Larger goal completion** (goals above a size/horizon threshold — see E8), and **(b) periodic review — adjustable in the UI, default quarterly.**                                                                                                            |
| E8  | "Larger" threshold   | _(Settled Phase 4.)_ A goal-completion edition fires when **either** the goal is **quarter-horizon or bigger** **OR** it has **3+ milestones** — catches both "aimed big" and "was a lot of work," so nothing substantial is missed while small goals stay quiet. |

### Visual design (locked Jul 1 2026)

| #   | Decision              | Choice                                                                                                                                                                                                                             |
| --- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ED1 | Shrine layout         | **Scroll of proof** — own-voice throughline at the top, then wins / reflection quotes / completed milestones stacked as cards down a vertical scroll.                                                                              |
| ED2 | Item style            | **Plain list lines** — understated one-liners, minimal chrome; the words carry it, nothing decorative competes. (Note: this is quieter than quote-cards — reflections still show verbatim, just as clean lines, not boxed quotes.) |
| E6  | No low-mood detection | **Explicitly excluded.** Evidence never fires off a "rough week detected" signal. Resurfacing moments are _earned_ (completion, cadence), never diagnostic of the user's emotional state.                                          |
| E7  | Not gamification      | No points, scores, streaks, or badges. A calm wall of proof, not a tally (reconciles plan §15).                                                                                                                                    |

**Open (settle during build):**

- Voice guardrails — the precise "never do this" list (§3c). Draft below; confirm before shipping AI copy.
- _(E8 settled Phase 4: quarter-horizon+ OR 3+ milestones. Cadence default **quarterly**, E5.)_

---

## 2. Data model

Evidence is **read-mostly** — it aggregates surfaces that already exist. New storage is minimal.

**Reads (no schema change):**

- `daily_wins` (accepted) — the primary substance. `source`, `refId`, `label`, `winDate`.
- `care_reflections` — verbatim snippets in the user's own words (tone source for E3).
- `goals` + `goal_milestones` — completed goals/milestones and their arcs.
- `task_time_entries` — focus time invested, per category (energy actually spent).
- care events / streaks — showing up for body & mind.
- bingo lines completed (`bingo_cards`, `goals.cellIndex`).
- `about_me_sections` — tone/voice reference for E3 narration.

**New (small):**

- **`evidence_editions`** (one table) — a cached, generated Evidence "edition" so the shrine loads
  instantly and resurfaced editions are stable/re-openable:
  - `id`, `userId`
  - `kind` — `periodic` | `milestone` (enum) — which trigger produced it
  - `periodStart`, `periodEnd` (date) — the window it covers
  - `refId` (uuid, nullable) — the goal/milestone that triggered a `milestone` edition
  - `narrative` (jsonb) — the AI-woven throughline + the ordered list of referenced win/reflection/goal ids it anchors to (never free-floating; every claim points at a real artifact)
  - `state` — `unseen` | `seen`
  - `createdAt`, `updatedAt`
  - Indexes: `(user_id, updated_at)` composite (sync + RLS hot path, per backend-optimization standing req); `(user_id, kind, period_start)`.
- **Cadence setting** — extend `app_settings` (not a new table): `evidenceCadence` (`monthly` | `quarterly` | `off`), **default `quarterly`**. Adjustable in Settings + inline from the Care tab (E5).

RLS scoped to `auth.uid()` on `evidence_editions`. **This table is emotionally sensitive** — same
never-logged, transparent treatment as the About-me doc (plan §13). No narrative text in logs/Sentry.

---

## 3. Placement & flows

### 3a. Care tab — the shrine (E4)

A new tab in the Care hub. Default view = the **latest edition** (or a live "so far" view if none
generated yet), with a way to page back through prior editions — a genuine _wall_, not just today.

Layout = **scroll of proof** (ED1), items as **plain list lines** (ED2):

- **The throughline** (thin AI thread, E3): a short passage in the user's own voice noticing the
  pattern — "You kept choosing your body this month, even when work was loud." Sits at the top of the
  scroll. Understated. Anchored.
- **The evidence beneath it** (the substance): accepted wins, verbatim reflection snippets, completed
  milestones, and focus-time-by-category for the window — rendered as **clean one-line entries**
  (ED2), not boxed cards, stacked down the scroll. Reflection text still shows verbatim; the line
  style just keeps it quiet.
- **Cadence control**: inline toggle for monthly / quarterly / off (writes `app_settings`).
- No numbers-as-score. Focus time shows as "showed up for your body 14 times," never "Body: 82 pts."

### 3b. Resurfacing (E5, E6)

- **Milestone/goal completion** → generate a `milestone` edition scoped to that goal's arc, and
  surface it gently ("You just closed X. Here's the trail that got you here.") via the existing
  nudge/essential-chip channel — **not** a modal that blocks. Add `evidence_surfaced` to the nudge
  kinds, or reuse the celebration channel; decide at build.
- **Periodic** → on the chosen cadence (tied to the existing monthly/quarterly review cadence),
  generate a `periodic` edition and mark it `unseen`; the Care tab shows an unseen dot. No push
  outside the app beyond existing review surfacing.
- **Never** fired by a low/negative signal (E6). Triggers are completion + calendar only.

### 3c. AI behavior (§11) — voice + guardrails

- Voice = the user's own, reflected (E3). Prompt draws on `care_reflections` + `about_me_sections`
  for tone. Reads like a wiser version of the user noticing their own pattern.
- **Every sentence anchors to a real artifact.** No free-floating praise. The narrative jsonb stores
  the artifact ids each claim references; the UI can surface them.
- **Guardrail list (draft — confirm before shipping):** never overpraise a thin window (if little
  happened, say less — honesty is what makes it evidence); no generic affirmations ("you're amazing!");
  never count or celebrate things the user hasn't marked as wins; never invent; be comfortable with
  a quiet period ("A slower month — and you still kept the mornings"). If there isn't enough real
  material, the edition stays small rather than padded.

---

## 4. States & edges

- **First run / not enough history** — no fabricated edition. Show a calm empty state: "Evidence
  builds as you do. Your wins and reflections will gather here." Optionally a live "this week so far."
- **Quiet window** — small, honest edition (§3c), never padded.
- **Cadence = off** — shrine still available on demand; no resurfacing.
- **Deleted source artifact** (win/reflection removed) — edition references degrade gracefully; drop
  the missing anchor, don't crash the narrative.
- **Offline / desktop** — editions are cached rows; sync per the standard model.

---

## 5. Integration

- **Reconciliation with plan §15 (locked "ephemeral, nothing stored, no gamification").** Evidence
  does **not** reopen gamification: still no points, scores, streaks, badges, or tallies. It reopens
  only the narrow, real tension the README named — that you cannot be _reminded_ of wins the system
  refuses to keep in view. §15's ephemeral **celebration moments** stay ephemeral; Evidence is a
  separate, **opt-in, memory** surface built from wins the app already persists in `daily_wins`.
  Update plan §15 + `docs/build-status.md` decision log to record this distinction.
- **Daily Wins** — Evidence is the lookback that Daily Wins always implied; `fetchRecentWinHistory()`
  already computes a hit-rate that nothing renders — Evidence is its home.
- **Care** — sits with garden/stats; the garden shows growth, Evidence shows what grew.
- **Planning / goals** — milestone completion is a shared trigger; Evidence is the backward-looking
  mirror of the forward-looking goal view (Gap A).
- **Category / balance** — evidence is shown per life-category so proof spans all five sectors, not
  just work — reinforcing the balance thesis.
- **Sync / RLS** — `evidence_editions` respects the optimized sync model + `(user_id, updated_at)`
  index from day one; RLS `auth.uid()`; never logged.

---

## 6. Motion

Calm, earned. Editions arrive with a soft settle, not confetti (celebration ≠ Evidence). Paging back
through the wall cross-fades. Consistent with the app-wide motion tokens (`animation-sweep.md`).

---

## 7. Build slice (suggested PRs)

1. **Data + read layer** — `evidence_editions` table + `evidenceCadence` in `app_settings`; tRPC
   `evidence` router (getLatest, list, generate, setCadence, markSeen); aggregation of the read
   sources into an "edition input."
2. **Care tab (shrine)** — the wall UI: throughline + artifacts + cadence control + empty state.
3. **AI narration** — the voice prompt (own-voice, anchored, guardrailed) producing the narrative jsonb.
4. **Resurfacing** — milestone-completion trigger + periodic-cadence generation + unseen dot / gentle chip.
5. **Docs** — update plan §15 + build-status decision log with the memory-vs-gamification distinction.

```

```
