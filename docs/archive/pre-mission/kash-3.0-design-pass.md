# Kash 3.0 — Design pass (Jul 2)

> A full visual/UX pass over **all pages and features**, triggered by a Jul 2 screenshot review of
> the shipped app. **Proposal-first workflow:** each page gets a proposal with numbered decision
> forks (**DP-n**, same convention as DT-1…DT-20); Kat decides; only then do we build. **No code
> changes until forks are locked.** This doc starts with **Today**.

## 0. The four complaints (Jul 2, first-run screenshot)

1. **No delineation between page sections** — white cards on a white canvas with `#ececec`
   hairlines all read as one undifferentiated field.
2. **No color before data** — accent is black (DT-2) and color is reserved for category stripes on
   task rows, so an empty app is 100% grayscale. Want color on screen pre-data, or at least a
   single accent color.
3. **Cut-off text** — no clipped/truncated text anywhere unless it is clearly scrolled out of view.
   Observed: the top hour label ("12a") clipped under the TIMELINE header; "^I inbox" reading as
   broken text.
4. **Too much going on in Today** — with zero tasks the screen already shows: header date (twice),
   inbox strip, Top-3 section + deadline chips, view switcher, lens bar, task list, full timeline
   (hour grid, ⌘D decide slot, gap suggestion, sync badge, now-line), and a composer with five
   property chips and two instruction lines.

---

## 1. Today — proposal

### What's on screen (inventory)

`DayPlanCanvas.tsx` renders, simultaneously in List view: header (`AppHeader` +
in-canvas date/h1 + `InPageSwitcher`), `ContextualInbox` strip, `Top3Slots` (+ `Top3Deadline`,
hint/drop zones, slip chip), `BalanceBar`, `LensControlBar`, `TodayList` (+ `CompletedSection`),
`TimelinePane` (right column), `QuickInput` composer (pinned footer, `ComposerPropertyBar` +
`ParsePreviewChips`).

### DP-1 · Section delineation

- **A — Tinted canvas, white cards (recommended).** Page canvas moves to a barely-off-white
  (`#f7f7f8`-ish, new `--canvas` token); sections stay pure-white cards with existing hairlines.
  Cards pop without heavier borders. _Guard against the rejected "too gray" feel (Jun 24): ink
  stays crisp near-black, cards stay pure white, tint stays under ~3% gray — this is the actual
  Pinterest pattern (off-white canvas, white cards)._
- **B — All-white + stronger structure.** Keep the white canvas; darken hairlines one step
  (`#e2e2e4`), widen inter-section gaps, add uppercase section headers with hairline rules.
- **C — No cards at all.** Full-bleed zones separated by single horizontal rules; delineation from
  whitespace + rules only. Most radical; risks less structure, not more.

### DP-2 · Color before data

- **A — Single brand accent (revisits DT-2).** Pick one hue for interactive chrome: primary button
  fill, links, focus ring, now-line, active toggles. Candidates: Professional blue `#009ddc`
  (already in the palette), or a new neutral-warm hue. _This reverses the Jun 24 "accent = black"
  decision — flagging explicitly._
- **B — Category colors in the chrome (recommended as the first step).** No new hue; the existing
  five category colors appear even when the app is empty: balance bar renders a faint 5-segment
  ghost legend; empty Top-3 slots carry faint category-tinted hints; composer category chips are
  colored; empty states use category-colored icons. Keeps DT-2 intact.
- **C — A + B.** Single accent for interactive chrome **and** category color in empty chrome. Most
  color, most revision.

### DP-3 · Today density (options combinable)

- **A — Single-column default.** List view shows the list only; the timeline appears only in
  Calendar view. Biggest reduction; makes TD2–TD4 timeline work opt-in per view rather than
  always-on.
- **B — Progressive disclosure (recommended).** Keep the two-column layout but gate chrome on
  data: balance bar hidden until ≥2 tasks; lens bar collapsed behind a filter icon until the list
  has enough rows to filter; timeline hides the ⌘D decide slot, gap suggestion, and sync badge
  until at least one task/block exists; Top-3 renders as one compact row of three empty slots
  (not full-height slots + deadline + hint zones) until something is pinned.
- **C — Dedicated zero state (recommended, with B).** When the day has no tasks at all, replace
  the whole canvas below the header with a single centered "start your day" panel: the composer,
  one line of guidance, and (per DP-4) starter suggestions. The full scaffolding appears once the
  first task exists.
- **D — Demote the timeline to a rail.** Slim right-side mini-map (blocks as ticks) that expands
  on click. Middle ground between A and the status quo.

### DP-4 · Seeded/ghost content for empty surfaces (Kat's proposal)

Applies to Today, Projects, and any category-grouped surface: each category starts with seeded
example content that clears as real content arrives.

- **A — Non-interactive ghosts.** Faint, dashed, category-striped example rows ("e.g. Call the
  dentist") purely as texture/orientation. Cheapest; risk: reads as clutter to remove.
- **B — Tappable starter templates (recommended).** One seeded suggestion per category, styled as
  a ghost but tappable — tapping adopts it as a real task/project (editable). Each category's seed
  disappears once that category has real content. Delivers color pre-data (DP-2 synergy) **and**
  a useful first action (onboarding synergy, §3).
- **C — Colored empty states only.** No seeded rows; each empty section just gets a
  category-colored icon + one line. Least invasive, least useful.

### DP-5 · No-cutoff-text rule (standing rule — confirm, no options)

New standing rule for the whole pass: **text is never clipped or truncated unless the container
visibly scrolls, and then only at the scroll edge with a fade mask.** Concretely for Today: pad
the timeline grid so the top hour label clears the pane header; replace "^I inbox" with a real
key glyph ("⌃I"); minimum widths on chips so labels never mid-word ellipsize; fade masks on the
timeline's scroll edges.

### DP-6 · Small Today cleanups (approve as a batch?)

1. Date shown twice (title bar "Kash · Thu, Jul 2" + h1 "Thursday · Jul 2") — drop it from one.
2. Composer shows two instruction lines ("add tasks — one per line. Use ';'…" placeholder **and**
   "Enter for new line · ⌘↵ to add tasks" footer) — keep one.
3. "sync ○ off" badge visible on an empty timeline — move to Settings/footer, or show only when
   sync is on/erroring.
4. Property chips row (title · due · priority · project · category) always visible above the
   composer — show on focus only.
5. "Top 3 by 5:00p · wind down 6:00p" chips render before any Top-3 exists — gate on first pin
   (overlaps DP-3B).

---

## 2. Pass scope & order (after Today locks)

Same workflow per page — inventory → DP forks → Kat decides → build spec. Proposed order:

1. **Today** (this doc, §1)
2. **This Week** (`/this-week`) — shares Top-3/balance/timeline patterns; decisions cascade
3. **Projects** (`/projects`, `[id]`) — main surface for DP-4 seeded categories
4. **Backlog** (`/backlog`)
5. **Care** (`/care`) — garden hero already specced; apply DP-1/DP-2 decisions only
6. **Abyss** (`/abyss`) — dark-mode exception; check DP-5 only
7. **Settings** (`/settings`) — flagged "genuinely undesigned" in `kash-3.0-visual-redesign.md`
8. **Overlays/moments** — morning hand-off, review panel, focus mode, command palette,
   celebrations, notifications

Global deliverables of the pass: any new tokens from DP-1/DP-2 land in `src/styles/tokens.css` +
`kash-3.0-design-tokens.md` as new DT entries; DP-5 becomes a QA checklist item.

---

## 3. Onboarding & first-run flow (new requirement — Jul 2)

**We need an onboarding flow with immediate actions that bring excitement and delight but ARE
USEFUL.** Not a slideshow tour — the user should _do_ real things that leave real value behind:

- Capture 2–3 real tasks in the composer as the very first step (the parse chips are the delight).
- Pin one as today's #1 → watch it land in Top-3 and (optionally) hold time on the timeline.
- Adopt one starter template per category they care about (DP-4B seeds double as onboarding).
- Name/confirm their categories & colors (Settings → Categories, surfaced inline).
- End on the morning hand-off so day 2 opens with a familiar ritual.

Tracked as backlog item **A.8** in `kash-3.0-remaining-build.md`. Full spec to be written after
the Today forks lock (it depends on DP-2/DP-3/DP-4 outcomes).

---

## Status

- **Jul 2:** Doc created. Today proposal (§1) awaiting Kat's decisions on DP-1…DP-6.
- Decisions will be logged inline next to each fork, DT-style.
