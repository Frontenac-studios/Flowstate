# Kash 3.0 — Visual Redesign (Jun 24)

> A live redesign session: revising the design tokens (the "too gray" flat-calm system → a Pinterest-style black-and-white) and wireframing each page (object placement, removing clutter). **Supersedes parts of `design-tokens.md`'s palette** and adds per-page layout decisions.
>
> **⚠️ Some Jun-24 layout decisions were revisited in `kash-3.1-consolidated-build-spec.md` — check there before building from this doc.** Superseded: the flat-white page surface became a **tinted canvas + white cards** (D9); Projects/Miller layout is now governed by D23/D39 (`kash-3.0-projects-miller.md` is source-of-truth), not the projects wireframe here. **Reaffirmed:** the **Week "inverted emphasis" today-marker** below (soft-gray days / lone white today) — reversed by D19, then **restored as the shipped design by D40** (Jul 7). So the Week block here is current again; the palette and canvas notes are not.

## Palette direction (revises `design-tokens.md`)

- **Why:** the current flat-calm system reads **too gray** — gray backdrop (`#f5f6f8`), muted ink, graphite-blue accent.
- **New direction: Pinterest black-and-white.** **Pure white** surfaces, **crisp near-black** ink (`~#16181d`), **minimal gray** (hairline dividers only). High contrast, lots of whitespace.
- **Color = category only**, shown as a **thin (3px) left stripe** per task row (chosen over a dot — keeps balance glanceable).
- **Accent = black.** No brand color — all colored accents (cobalt/indigo/mint/brown/clay/plum) were rejected; black is the accent. So every element that leaned on a colored fill gets redesigned off black/white.
- **Category colors:** keep the Apple system hexes (Professional cyan · Personal purple · Relationships red · Adulting orange · Body & Mind green).

### Element redesign (accent-using / black-fill components)

Going element-by-element, 4+ options each, shown in real page context:

- **Primary button** — **OUTLINE (option C)** (Jun 24): black border, no fill, black text.
- **Active nav-rail item** — **soft gray fill** (`#f1f1f2` pill, black icon) (Jun 24). A contained gray _pill_ on white — not a gray backdrop — so it doesn't reintroduce the "too gray" feel.
- **Segmented control, active segment** — **inset white pill** on a gray track (iOS-style) (Jun 24). Uses a subtle shadow → a deliberate, documented exception to the no-shadow rule.
- **Settings sub-nav** — **changed from a left section-rail to a top tab bar** (Jun 24), active tab = the same **inset white pill**. (Overrides the earlier "left section-nav" decision.)
- **Week "today" marker** — **inverted**: the whole week is soft-gray, **today is the one white column**, with a **white date pill** (Jun 24). Contrast carries the signal; pairs with horizontal-scroll days (below).
- Still open: toggle/checkbox-checked · Top-3 star · links · focus ring.

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
- **Layout (Jun 24): horizontal-scroll days** — roomy fixed-width day columns; scroll sideways for later days, today auto-snaps into view. Chosen over cramming 7 equal columns. **Inverted emphasis:** all days soft-gray, **today the lone white column + white date pill.**

### Projects — RESOLVED (Jun 24)

- **Miller columns use the full width** — the docked task-detail panel is **cut**.
- **Task detail expands inline** within the Tasks column (click to open in place; no docked panel, no drawer). _Caveat: complex fields (blockers, recurrence) are tight in a narrow column — may need a "more" affordance._
- **Import history → its own page**, reached by a link (accessible, but not a panel cluttering the workspace).
- Keep: Miller + **Timeline** toggle, inline add-phase/task rows. Index = project cards (name · category · % progress).

### Focus mode — RESOLVED (Jun 24)

- **Minimal: task + timer only** — no narration, no chat (distraction-free; matches the minimal Focus register, §11).
- **Split layout: task on the LEFT, timer on the RIGHT** (full-height, prominent timer — not a corner chip).
- Done / Park live on the task side. `Esc` exits. Flat (no backdrop blur).

### Plan (Planning Mode) — RESOLVED (Jun 24, nav revised Jun 25)

- **Horizon nav:** in-page switcher **Week · Month · Quarter · Year · Bingo** on `/plan`, plus **breadcrumb zoom** (Year › Q3 › Aug › wk34). Click a period to zoom in; breadcrumb segments zoom out (NAV-2/3).
- **Year view: 2×2 quarter cards** — theme + proportional balance bar + per-week dominant-color dots; click a quarter to zoom in; drag a goal onto a quarter to set its horizon (per planning-mode.md PM-2).
- Quarter → Month → Week views per the planning-mode spec; B&W treatment applies.
- **Plan → Week tab** embeds the same Week canvas as `/this-week` with **plan mode ON** (planning rail + AI draft). Rail Week stays execution-focused.

### Bingo (Annual Goals) — RESOLVED (Jun 24) · **supersedes planning-mode PM-1**

- **A true 5×5 bingo card** — a grid of goal cells you **check off** (✓ = done), each **colored by category**. Playful, motivating, lives up to the name.
- Progress reads as **done / not-done per cell** (less % precise than a list — fine for a yearly card). Balance is readable from the category colors across the grid.
- _Supersedes planning-mode.md PM-1's "list of goal rows" — the card/grid form wins._

### Abyss — RESOLVED (Jun 24)

- **List-first** — the practical dark List leads (grouped by pattern); the **Sky is an optional "stargaze" mode** (toggle). _(Reverses the earlier "rich Sky-first" lean.)_ Still dark/immersive; still type star-styles + constellations in Sky mode.
- **Sky control placement: floating bar** (translucent, always over the canvas) — decided Jun 24.

### Care — RESOLVED (Jun 24)

- **Home: garden-centric** — the lush illustrative garden is the hero, with today's wins + what-lifts-me + a gentle prompt beside it. _(Stats-first: until the garden ships, that slot shows wins/stats.)_
- **Sub-nav: top tabs — Garden · Tasks · Breathing · Reflection · Stats · Travel.**
  - **Tasks** = the Finch self-care library (browse / adopt / create / check off).
  - **Breathing** = a tab landing (start button + recent sessions); the session itself is the pulsing-orb overlay.
  - **Reflection** = the ritual (prompt + write + mood) **+ the archive** of past reflections (merges the separate "Reflections archive").
  - **Stats** = self-care frequency · wins · mood.
  - **Travel** = restorative-time planning (kept in Care).
- Breathing & Reflection get tabs (not just overlay buttons) — discoverable, each a landing with a start action.
- **Future idea (capture for §12):** make aspects of the **garden editable** — plants by location, or plants from your home / a set location (the garden reflects real places).

### Settings — RESOLVED (Jun 24)

- **Layout (revised Jun 24): top tab bar** (horizontal tabs across the top, content below) — _changed from the earlier left section-nav._ Active tab uses the **inset white pill**.
- **Sections (tabs):** Account · **Categories** (rename/recolor the 5) · **About me** (the §13 Values · Work · Life · Constraints doc — lives here as a Settings tab) · **Notifications** (global on/off + DND) · **Preferences** · **AI / Kash** (autonomy feel, register tone — new) · **Data & sync.**

---

## Status

**All nine main pages wireframed** (Jun 24): Today · Week · Projects · Focus · Plan · Bingo · Abyss · Care · Settings. Palette direction locked (white + near-black + category-stripe color + outline button).

**Remaining design work:**

- Roll the new B&W tokens across components (a build task).
- The **garden art** spike (detailed-illustrative, Care).
- The **animation pass** (last).
- ~~Stale docs~~ ✓ **Updated Jun 24:** `design-tokens.md`, `design-brief.md`, `design-system-starter.md` now all reflect the B&W direction (white surfaces, black accent, outline buttons, Apple category hexes, Abyss/garden exceptions).

---

## Mockups

- **`kash-3.0-mockups.html`** — openable in a browser. **All nine pages now have tabs:** Today · Week · Projects · Plan · Focus · Abyss · Care · Bingo · Settings (completed Jun 24). The reliable way to view the redesign.

> **Note:** Abyss, Care, Plan, and Bingo already have detailed layouts in their build specs (Abyss = dark Sky/List · Care hub sub-views + lush garden · Plan = horizon zoom · Bingo = grid). Their wireframes are largely _defined_; the redesign mainly applies the B&W treatment (with the Abyss dark and the garden lush as deliberate exceptions). **Settings is the genuinely undesigned page** needing depth.
