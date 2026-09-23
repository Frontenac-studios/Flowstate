---
category: Task rows
---

# TaskDragHandle

The dnd-kit drag affordance for a task row. Deliberately near-invisible at rest (25% `--ink-muted`), lifting to 50% on hover; `tabIndex={-1}` keeps it out of the tab order.

`TASK_DRAG_HANDLE_VARIANT` is the shipped default (`grip_lines`); the other variants exist for comparison, not for per-caller choice. Spread dnd-kit's `listeners` and `attributes` onto it.
