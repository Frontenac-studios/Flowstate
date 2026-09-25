---
category: Task rows
---

# SwipeActionRail

The two-finger swipe reveal rail. It renders **in flow** as the last flex child of the row — not absolutely on top of it — so the row keeps its position and its title reflows into the narrower column while the actions are open.

One continuous `--surface-2` tail split by a single hairline: no per-button border or radius, so the row plus its caps read as one object that simply got longer. Each cap is `SWIPE_ACTION_WIDTH_PX` (44) wide; `swipeRevealWidth(n)` gives the total.

Tones map to tokens: `edit` → `--action-edit`, `complete` → `--action-complete`, `danger` → `--action-danger`, `neutral` → `--ink-muted`. The rail is icon-only, so each action's `label` is its whole accessible name.
