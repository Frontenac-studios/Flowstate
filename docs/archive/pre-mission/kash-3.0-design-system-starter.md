# Kash 3.0 — Design System Starter

> Paste/adapt into Claude Design → **Create design system**. Grounded in decisions made so far. **Three items aren't finalized yet** (flagged below) — set them however you like in the tool; everything else is settled.

## Direction — black-and-white (revised Jun 24)

- **Aesthetic: pure black-and-white, flat.** No glass, no blur, no warm-stone gray. Pure white surfaces, crisp near-black ink, generous whitespace — Pinterest-clean. **Color is reserved entirely for life-category meaning** (a thin left stripe).
- **Accent: black** (`#16181d`). **No brand color.** Primary buttons are **outline** (black border, no fill); the active nav item is a black pill.
- **Light-first.** The Abyss is a deliberate **dark** exception; the Care garden a **lush illustrative** exception.

## Brand & neutrals

- **Surfaces:** `#ffffff` (pure white) everywhere; **hairline borders** `#ececec`. Minimal gray.
- **Ink:** `#16181d` (near-black). **Muted:** `#6b7280`. **Faint:** `#9aa0ad`.
- **Accent:** black `#16181d` — outline buttons, active nav, links. (No hot-pink, no graphite.)
- Depth comes from whitespace + hairline borders, **not** shadow or glass.

## Life-category colors — the core palette

Used everywhere as left stripes, chips, and balance bars. User-editable in-app; these are the defaults.

_The Apple system hexes (matches the built tokens). Used mainly as a 3px left stripe per task row; the app is otherwise black-and-white._

| Category          | Stripe / solid | Light fill | Dark text |
| ----------------- | -------------- | ---------- | --------- |
| Professional      | `#009ddc`      | `#e5f5fc`  | `#0a6a93` |
| Personal Projects | `#973d97`      | `#f4e8f4`  | `#6e2c6e` |
| Relationships     | `#e03a3e`      | `#fce8e9`  | `#962427` |
| Adulting          | `#f6821f`      | `#fdeede`  | `#9a4e08` |
| Body & Mind       | `#61bb47`      | `#ecf6e8`  | `#3a7026` |

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
