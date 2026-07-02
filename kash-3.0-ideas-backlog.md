# Kash 3.0 — Ideas Backlog

> Future / someday features and concepts — **not yet scoped, not committed.** This is distinct from
> `kash-3.0-remaining-build.md` (the tail-work backlog for already-decided v1 features). Things here
> are seeds: captured so they're never lost, promoted to a real spec only when we choose to.
>
> **Legend:** 💡 raw idea · 🌱 shaping · 📋 ready to spec

---

## Evidence — "evidence that you're that bitch" · 📋 PROMOTED

> **Promoted to a build spec Jul 1 2026:** [`kash-3.0-evidence-build-spec.md`](./kash-3.0-evidence-build-spec.md).
> Decisions E1–E7 locked in a design session. The shaping notes below are kept for context.

**The pitch.** A surface that tracks the user's accomplishments and progress over time and, using
their own reflections and tone, draws out the places where they are _winning in life_ — where
they've proven themselves and built confidence over and over. Not a stats dashboard. A body of
**proof** the app hands back to you on the days you doubt yourself.

**Why it fits Kash.** Kash's thesis is calm + celebrating wins + remembering them. Most planners are
forward-looking pressure machines ("here's everything you still haven't done"). Evidence is the
opposite vector: it's backward-looking _reassurance_, built from data Kash is already collecting
(Daily Wins, EoD/EoW reflections, completed Top-3s, focus time, bingo/goal progress, care streaks).

**Raw material it could draw from (all already in the app):**

- Daily Wins entries (Body · Mind · Soul)
- End-of-day and end-of-week reflections (tone + content over time)
- Completed Top-3 tasks and focus sessions
- Goal / project progress and finished phases
- Care streaks, garden growth, balance improvements
- Bingo lines completed

**Open questions to shape later:**

- Where does it live? A tab in Care? A section of Planning? Its own surface?
- Cadence: always-available shrine, or does it _resurface_ to you (e.g. on a hard day, monthly, or when a reflection reads low)?
- How much is AI-authored narrative ("Here's where you showed up for yourself this month") vs. a curated wall of your own words and wins?
- Tone control — it has to feel like earned truth, never hollow hype. How does it stay credible?
- Privacy: this is emotionally sensitive, self-referential content. Same never-logged treatment as the About-me doc.

**Status:** 💡 raw idea — parked Jul 1 2026. Promote to a build spec when we decide to pursue it.

---

## Rename & reframe the Abyss as "Backlog" · 💡

**The pitch.** Rename — and reframe/redesign — the **Abyss** (`/abyss`) as **"Backlog."** The Abyss
today is the single catch-all inbox for tasks, ideas, and someday/reference items (sky + list,
capture, archive, monthly review, promote, embeddings). "Backlog" may read as clearer, calmer, and
more actionable than "Abyss" — less "void things disappear into," more "the pile I'll pull from."

**Scope to decide when promoted:**

- Is this a **pure rename** (route, nav label, copy) or a **reframe** that changes how the surface
  looks and behaves (e.g. less "dark void" aesthetic, more "ready to pull" list)?
- The Abyss has a deliberate **dark** visual exception (per design system) — does "Backlog" keep it,
  or move to the light B&W surface like the rest of the app?
- Naming collision: "backlog" is also used for _this_ ideas doc and the build backlog — make sure the
  in-app "Backlog" (user's captured items) stays distinct from planning/build backlogs.
- Copy/IA sweep: nav label, capture prompts ("park this…" → "add to backlog…?"), monthly-review copy,
  any AI tool names referencing "abyss."
- Migration: route `/abyss` → `/backlog` (redirect), `abyss-items` table naming left as-is or renamed.

**Owner doc if pursued:** would update `kash-3.0-abyss-build-spec.md` + `kash-3.0-plan.md` §10.

**Status:** 💡 raw idea — parked Jul 1 2026. Added at user request.

---
