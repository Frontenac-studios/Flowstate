# Kash 3.0 — Design System Starter

> Paste/adapt into Claude Design → **Create design system**. Grounded in decisions made so far. **Three items aren't finalized yet** (flagged below) — set them however you like in the tool; everything else is settled.

## Not yet finalized (your call)

- **Aesthetic:** hybrid (flat content surfaces + glass chrome) vs full glass vs fully flat. _Leaning hybrid._
- **Global accent:** soften the current hot-pink (`#ff2d55`) to a calmer neutral so the category colors lead.
- **Light/dark:** both, with a calmer night palette, vs light-first.

## Brand & neutrals

- **Backdrop:** warm stone, ~`#EEEEEE` — calm, low-contrast.
- **Ink:** `#1A1D26`. **Muted ink:** `#5C6370`.
- **Surfaces:** translucent glass for _chrome_ (nav rail, header, chat rail, modals); flat opaque white for _dense content_ (lists, calendars, boards) — legibility first.
- **Accent:** proposed to soften from `#ff2d55` (TBD).

## Life-category colors — the core palette

Used everywhere as left stripes, chips, and balance bars. User-editable in-app; these are the defaults.

| Category          | Stripe / solid | Light fill | Dark text |
| ----------------- | -------------- | ---------- | --------- |
| Professional      | `#378ADD`      | `#E6F1FB`  | `#185FA5` |
| Personal Projects | `#7F77DD`      | `#EEEDFE`  | `#534AB7` |
| Relationships     | `#D4537E`      | `#FBEAF0`  | `#993556` |
| Adulting          | `#BA7517`      | `#FAEEDA`  | `#854F0B` |
| Body & Mind       | `#1D9E75`      | `#E1F5EE`  | `#0F6E56` |

## Typography

- **Sans:** Geist Sans. **Mono:** Geist Mono.
- Base 15px; calm scale. **Two weights only** (400 regular, 500 medium). **Sentence case** everywhere.

## Shape & spacing

- **Concentric radius:** outer 16 · inner 12 · control 10 · chip 8.
- Generous whitespace; minimal **0.5px** borders.

## Elevation / material

- **Chrome** (rail / header / chat / modals): soft glass — translucent + blur (if hybrid/glass).
- **Content** (lists / calendars / boards): flat opaque surfaces.

## Core components

- **Task row:** 4px category **left stripe** · checkbox · title · `#project` chip · priority dots · `⋯` menu. Top-3 row = star + colored border.
- **Category chip:** light fill + dark text from the palette table.
- **Blocked task (treatment C):** dashed border + striped category bar + lock icon + "waiting on <blocker>".
- **Recurring task:** small repeat badge.
- **Nav rail item:** slim icon that expands to icon + label; grouped with a section label + divider.
- **Buttons:** calm outline/ghost; primary uses the (softened) accent.
- **Balance bar:** thin horizontal stacked bar, segments in category colors.

## Principles

Calm, low-chrome, keyboard-first. Category color makes balance visible. Encouragement, never guilt.
