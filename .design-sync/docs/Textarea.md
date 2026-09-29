---
category: Forms
---

# Textarea

Same border and focus treatment as `Input`, but with the 14px container radius (`rounded-card`) instead of a pill. `[field-sizing:content]` grows it to fit its content up to `max-h-[40vh]`, then it scrolls internally, so a long paste can never push the surrounding layout off-screen.

Composer overlays that strip the border and background keep their own bespoke utilities rather than routing through this component.
