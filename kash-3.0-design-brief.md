# Kash 3.0 — Condensed Design Brief

> Attach this in Claude Design as context for any generation. It's the product + the design decisions a designer needs.

## What Kash is

A whole-life, ADHD-friendly planning app for one person. It removes "what do I work on?" paralysis with a **Random Decision Maker (RDM)** that picks a task and drops you into a Focus session. It balances five life categories and actively defends time for self-care. **Balance is the product** — every view should make category balance visible.

## The five life categories (always color-coded)

Professional · Personal Projects · Relationships · Adulting · Body & Mind. Every task carries **exactly one**. Shown as a colored left stripe on rows, as chips, and in balance bars. Colors per the Kash design system (user-editable in-app).

## Navigation — a three-column shell

- **Left:** a slim nav rail of icon + label items that expands on hover, **grouped**: "Do now" (Today, Week, Projects) · divider · "Reflect & plan" (Plan, Abyss, Care) · Settings pinned bottom.
- **Center:** the active surface.
- **Right:** a toggleable Claude chat rail.
- No bottom dock. Global actions: **Decide (⌘D)** and a command palette (⌘K).
- Section sub-views use an **in-page segmented switcher**, not extra rail items.

## Today — the heartbeat

- In-page switcher: **List · Calendar · Review**.
- **List:** a composer (type `Call mom; tomorrow; relationships` — semicolon properties with autocomplete), **Top 3** slots, bucket sections (Today/Tomorrow/This Week/Later), and a contextual triage inbox.
- **Calendar (a "living record"):** the day isn't pre-planned — focus blocks **drop onto the timeline at the current time** when you Decide/start a focus session; completed blocks stay ("✓ 38m"); gentle self-care prompts fill the gaps; a **day balance bar** shows category load.
- **Top 3 done by 5pm** via _soft escalating_ nudges (never punitive). Focus blocks **auto-enable Do Not Disturb**.

## Task model

Category, priority (`!`/`!!`/`!!!`), due date, **recurrence** (repeat badge), **dependencies**, time tracking on any task. A **blocked** task (blocked-by-one) is **visible but distinct** — _treatment C_: dashed border + striped category bar + lock + "waiting on <blocker>"; the RDM **skips** it and the blocker is prioritized.

## Self-care

A **Care** hub plus inline prompts: walks, breathing, reflection, and a generative **garden** (stats-first). **The 3 Daily Wins** — a gentle physical / mental / spiritual tracker (three rings; "2 of 3 — a little reflection would round out the day"), auto-detected, encouragement-only.

## Design principles

Calm, low-chrome, **keyboard-first**. Category color makes balance visible everywhere. AI is a companion, never a gatekeeper. **Encouragement, never guilt** (this is a wellbeing tool). Decisions are reversible.
