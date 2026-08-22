# Kash 3.0 — Backlog Reframe Build Spec (Abyss → Backlog)

> The **full reframe** committed in Phase 3 (`kash-3.0-open-decisions.md` §C): rename the **Abyss** to
> **Backlog** _and_ redesign it from the dark constellation void into a **light, "pile-I-pull-from"
> list**. The engineering spine (data model, embeddings, promote logic, sync) is unchanged — see
> `kash-3.0-abyss-build-spec.md`; this spec covers the **rename, the light surface, and the reframed
> views/flows**. Ships in one coordinated rename sweep with Bingo → Goals.
>
> **Status:** shaped Jul 1 2026 (decision session). Ready to slice.
>
> **⚠️ Partially superseded by D27 (`kash-3.1-consolidated-build-spec.md`, Jul 2 2026).** The Sky was
> **kept**, not dropped: the shipped Backlog is **List (light) · Sky (dark, immersive) · Themes**, with
> the view switch carrying the theme and only the manual theme toggle retired. Wherever this doc says
> to **drop / replace / retire the Sky** (BK3, BKD3, §3c, build-order step 4), read it as
> **superseded** — the Themes lens is **additive** alongside Sky, not a replacement for it. The rename
> (BK1/BK2), List-recency (BK4), and pull actions (BK5) are unaffected.

---

## 0. Purpose

The Abyss works but its metaphor is a _void things vanish into_. "Backlog" reframes the same captured
tasks/ideas/references as **a calm pile you pull from** — clearer, more actionable, and consistent
with the app's light B&W surface. This retires the Abyss's deliberate dark exception.

---

## 1. Decision log (locked Jul 1 2026)

### Functional / IA

| #   | Decision    | Choice                                                                                                                                                                                                                                                                 |
| --- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BK1 | Rename      | **Abyss → Backlog.** User-facing everywhere: nav label, route `/abyss` → `/backlog` (redirect), capture copy, AI tool names. Ships in the **one coordinated sweep** with Bingo → Goals.                                                                                |
| BK2 | Table name  | Keep `abyss_items` **internally** (no data migration churn); rename only user-facing + route + tool surfaces. Revisit an internal rename later if desired.                                                                                                             |
| BK3 | Sky view    | ~~**Drop the dark constellation Sky.**~~ **Superseded by D27 — Sky is kept (dark/immersive).** The **light "Themes" lens** ships **alongside** Sky (not as a replacement): "keeps calling you" cluster cards from the same embedding clustering, on the light surface. |
| BK4 | List order  | **By recency (newest first)** as the default. The Themes lens carries the "what keeps pulling at me" insight; the list stays a simple, honest pile.                                                                                                                    |
| BK5 | Pull action | **Both:** a one-tap **"Today"** on every row (fast path) **plus** a **"…" menu** for the full target-picker (Week / Project / Goal). Fast by default, full control when needed.                                                                                        |

### Visual design

| #    | Decision    | Choice                                                                                                                                 |
| ---- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| BKD1 | Surface     | **Light B&W**, per the app's design tokens — **retires the Abyss dark exception** (update plan §5/§10 + `design-system-starter.md`).   |
| BKD2 | List item   | Category **left stripe** (5-category color) + a **type marker** (idea / task / reference icon) + title; quiet, dense rows (not cards). |
| BKD3 | Themes lens | Light cluster **cards** ("Keeps calling you: watercolor ×4"), brightest/most-parked first — the warm insight surface, on light.        |

**Open (settle during build):**

- Redirect handling for any bookmarked `/abyss` (permanent redirect).
- Whether the Themes lens is a toggle beside the list or a strip above it (both fine; pick for feel).
- Capture copy wording ("park…" → keep, or "add to backlog…"); confirm during the rename sweep.

---

## 2. What stays (unchanged from `abyss-build-spec.md`)

- **Data model** `abyss_items` (type idea/task/reference, category, status active/promoted/archived,
  resurface_count, embedding). No schema change beyond what already exists.
- **Capture** — ⌘⇧A quick-capture overlay + chat "park…" tool (copy updated per BK1). Drop → Backlog
  from triage stays.
- **Promote logic** — item stays on promote, returns to `active` if the spawned task is abandoned.
  The BK5 "…" menu is the existing target-picker; the one-tap "Today" is a promote-to-Today shortcut.
- **Embeddings + clustering** — same pipeline; now feeds the **Themes lens** (BK3) instead of Sky.
- **Monthly review** — the warm Reflection-voice resurfacing stays; brightest **themes** first (was
  "constellations"), on the light surface.
- **~90-day auto-archive**, **sync/RLS** — unchanged.

---

## 3. Placement & flows

### 3a. Route & nav (BK1)

`/backlog` (redirect from `/abyss`); nav rail label "Backlog" in the "Reflect & plan" group. AI tools
that referenced "abyss" renamed to "backlog" (part of the coordinated sweep, `kash-3.0-open-decisions.md` §C).

### 3b. The list (BK4, BKD2)

Default view: a light, recency-ordered list. Each row = category stripe + type icon + title, with the
**BK5 pull affordance** (one-tap "Today" + "…"). Search + filters (category / type / age) carry over
from the Abyss list. Dense rows, calm, no dark surface.

### 3c. The Themes lens (BK3, BKD3)

A light lens (toggle/strip) showing embedding clusters as "keeps calling you" cards, most-parked
first. This is where the old Sky's _insight_ lives — pattern-spotting without the starfield.

### 3d. Pull (BK5)

- **One-tap "Today"** → promote-to-Today shortcut (spawns/links a task in the day; item → `promoted`).
- **"…" menu** → the full target-picker (Week / Project / Goal) — the existing promotion flow.

---

## 4. Integration & the coordinated rename sweep

- **One sweep with Bingo → Goals** (`kash-3.0-open-decisions.md` §C): inventory every user-facing +
  AI-tool string for "abyss"/"bingo", plan `/abyss`→`/backlog` redirect + horizon/storage keys, update
  capture/onboarding/review copy. Keep in-app "Backlog" distinct from the planning/build _backlog_ docs.
- **Retires the dark exception** — update `kash-3.0-plan.md` §5 (design) + §10 (Abyss) and
  `design-system-starter.md` to drop "Abyss = dark surface"; Backlog uses the standard light tokens.
- **Balance nudge** — `abyss-balance-candidates` still sources category-matched items to offer; now
  "from your Backlog." No logic change.
- **Docs to update on build:** `abyss-build-spec.md` (fold in the reframe or supersede its dark-surface
  - Sky sections), plan §10, design-system-starter.

---

## 5. States & edges

- **Bookmarked `/abyss`** → permanent redirect to `/backlog`.
- **Empty** — calm empty state ("Nothing parked yet — drop ideas and tasks here to pull from later").
- **Themes with too few items** — lens hides or shows "not enough yet"; list still works.
- **Everything else** (promote-returns, archive, resurface) — unchanged from `abyss-build-spec.md`.

---

## 6. Motion

Light and calm: capture drops a row in with a soft settle; pull-to-Today slides the row toward the
day; theme cards cross-fade. Retires the dark Sky's starfield motion. Per `animation-sweep.md`.

---

## 7. Build slice (suggested PRs — inside the coordinated rename sweep)

1. **Rename sweep** — `/abyss`→`/backlog` route + redirect, nav label, capture/review copy, AI tool
   names; alongside Bingo → Goals. (Table stays `abyss_items`, BK2.)
2. **Light surface** — swap Abyss dark tokens for standard light tokens on the list; retire dark
   exception in docs (BKD1).
3. **List reframe** — recency default + BKD2 rows + BK5 pull (one-tap Today + "…" menu).
4. **Themes lens** — light cluster cards from existing embeddings (BK3/BKD3), replacing the Sky.
5. **Verify** — redirect, promote-to-Today, clustering still feeds themes + monthly review; typecheck/lint/RLS.
