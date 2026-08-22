# Kash 3.0 — Screen prompt: Today (day view)

> Paste into Claude Design's "describe what you want to make." Pick template **Prototype** (or Wireframe for low-fi), and the **Kash 3.0** design system. Attach `kash-3.0-design-brief.md` for fuller context.

---

Design the **Today (day view)** screen for Kash 3.0, a calm, keyboard-first whole-life planning app. Use the Kash 3.0 design system — the five category colors, Geist type, generous whitespace, low chrome, sentence case, two font weights.

**Layout — a three-column app shell:**

- **Left:** a slim vertical nav rail of icon + label items, grouped — "Do now": Today (active), Week, Projects; a divider; "Reflect & plan": Plan, Abyss, Care; Settings pinned at the bottom.
- **Right:** a collapsed, toggleable Claude chat rail (show just its edge + toggle).
- **Center:** the Today content.

**Center content, top to bottom:**

1. **Header:** the date ("Tue Jun 16"); an in-page segmented switcher `List · Calendar · Review` with **Calendar active**; a small "Decide ⌘D" action and a chat toggle; and a Top-3 status cue (① done · ② in progress · ③ open).
2. **A day timeline (8am–8pm) as a "living record"** — not pre-planned, it fills as the day happens:
   - a neutral calendar event block "9:00 Standup";
   - a **completed** focus block "9:30 Draft Q3 deck" with a Professional (blue) 4px left stripe, a "Professional" chip, and a "✓ 38m" marker, slightly muted;
   - a gentle **dashed self-care row** in the gap: a walk icon + "Good gap — a 10-min walk?" in Body & Mind teal;
   - an **active** focus block "10:30 Review onboarding PR" with a Professional stripe, a Top-3 star, and a running timer "12:04";
   - an **open dashed slot**: "Decide (⌘D) drops the next block here".
3. **A day balance bar** at the bottom: a thin horizontal stacked bar, mostly Professional (blue) with a segment of Body & Mind (teal), labeled "mostly Professional".

**Tone & style:** calm and encouraging, not a scoreboard. Flat opaque content surfaces, 0.5px borders, category color carried as 4px left stripes, gentle muting for completed items. Nothing decorative competes with the tasks.
