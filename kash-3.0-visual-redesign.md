# Kash 3.0 — Visual Redesign (Jun 24)

> A live redesign session: revising the design tokens (the "too gray" flat-calm system → a Pinterest-style black-and-white) and wireframing each page (object placement, removing clutter). **Supersedes parts of `design-tokens.md`'s palette** and adds per-page layout decisions.

## Palette direction (revises `design-tokens.md`)

- **Why:** the current flat-calm system reads **too gray** — gray backdrop (`#f5f6f8`), muted ink, graphite-blue accent.
- **New direction: Pinterest black-and-white.** **Pure white** surfaces, **crisp near-black** ink (`~#16181d`), **minimal gray** (hairline dividers only). High contrast, lots of whitespace.
- **Color = category only**, shown as a **thin (3px) left stripe** per task row (chosen over a dot — keeps balance glanceable).
- **Accent = black.** No brand color — all colored accents (cobalt/indigo/mint/brown/clay/plum) were rejected; black is the accent. So every element that leaned on a colored fill gets redesigned off black/white.
- **Category colors:** keep the Apple system hexes (Professional cyan · Personal purple · Relationships red · Adulting orange · Body & Mind green).

### Element redesign (accent-using components) — in progress

Going element-by-element, 4+ options each:

- **Primary button** — **OPEN.** Options parked: **C** outline · **D** soft-gray fill · **E** minimal text. Decide after the page wireframes.
- Active nav-rail item · segmented switcher · toggle/selected states · checkbox checked · Top-3 star · links · focus ring — _TBD._

## Page wireframes

### Today — RESOLVED (Jun 24)

- **Summary band on top** (always visible): date · **Top 3** (①②③) · **balance bar** · the **List / Calendar / Review** switcher.
- **Today list** — the day's tasks; **triage** leftovers fold in at the top when present. Gets the most vertical room.
- **Composer pinned at the bottom**, chat-style (always reachable, message-bar feel).
- **Removed from Today: Tomorrow / This Week / Later** — future buckets belong to Week / planning, not the daily view.
- Left nav rail + right chat rail unchanged.

### Week — RESOLVED (Jun 24)

- **Keep all elements:** 7 day-columns (today highlighted) · **per-day 1–3 priorities** · **per-category load cue** per day · **inbox / unscheduled rail** · **Draft week** (AI) · **Weekly review** entry.
- **"Later" gets a separate backlog section** — the inbox rail stages _this-week_ tasks; a distinct **Later backlog** holds someday tasks (the content pulled off Today's Tomorrow/Week/Later). Placement (below the grid vs its own sub-view) → settle in build.

### Projects — RESOLVED (Jun 24)

- **Miller columns use the full width** — the docked task-detail panel is **cut**.
- **Task detail expands inline** within the Tasks column (click to open in place; no docked panel, no drawer). _Caveat: complex fields (blockers, recurrence) are tight in a narrow column — may need a "more" affordance._
- **Import history → its own page**, reached by a link (accessible, but not a panel cluttering the workspace).
- Keep: Miller + **Timeline** toggle, inline add-phase/task rows. Index = project cards (name · category · % progress).

### Plan · Bingo · Abyss · Care · Settings — _TBD (walking through one-by-one)_
