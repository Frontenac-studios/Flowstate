---
category: Task rows
---

# TaskPriorityIndicator

Spec v2: only **High** priority is marked on a row, as a crimson "!". None, Low and Med render nothing — they still sort and filter, the row just stays quiet.

Pass `reserveSpace` in a list so the 12px column keeps its width and rows don't reflow.
