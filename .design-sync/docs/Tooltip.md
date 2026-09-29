---
category: Feedback
---

# Tooltip

Opens on hover **and** focus after a 400ms delay, and portals the bubble to `document.body` at `--z-toast`.

- `variant="dark"` (default) — an ink pill, 13/500. A `KeyCap` inside it inverts to a translucent chip: `content={<>Edit task <KeyCap>E</KeyCap></>}`.
- `variant="light"` — white popover card with `--shadow-overlay`, for longer explanatory copy.
- `focusable` makes the trigger itself keyboard-reachable.

The trigger wrapper is an `inline-flex` span, so the child keeps its own layout.
