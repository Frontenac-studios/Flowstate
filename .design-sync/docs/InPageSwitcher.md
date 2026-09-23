---
category: Navigation
---

# InPageSwitcher

The shared in-page segmented control: an inset white pill (the active option) riding a soft-gray `--active-surface` track (DT-7). The raised pill reads as raised purely through `--active-raised-border` — **strictly flat, no shadow**.

Fully controlled and presentational; the caller owns the value and its persistence. Arrow keys move between segments. `ariaLabel` is required. `trailing` clusters one extra control inside the track (Today's add-task `+`).

`value` is typed loosely on purpose: a sentinel no option matches leaves every segment unpressed.

Reach for this before writing bespoke tab markup — it backs Today's Day/Week, the Projects view and zoom toggles, and the Plan sub-view switchers.
