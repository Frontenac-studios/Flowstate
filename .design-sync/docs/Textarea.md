---
category: Forms
---

# Textarea

Same surface and focus ring as `Input`, with `[field-sizing:content]`: it grows to fit its content up to `max-h-[40vh]`, then scrolls internally, so a long paste can never push the surrounding layout off-screen.

Composer overlays that strip the border and background keep their own bespoke utilities rather than routing through this component.
