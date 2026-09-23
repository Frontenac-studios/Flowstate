---
category: Surfaces
---

# RitualSheet

The centred ritual modal: full-screen scrim + blur, panel with internal scroll and D13 fade cues, portalled to `document.body` at `--z-modal`. Used for morning hand-off, end of day, Monday entry and onboarding.

- `size` — `md` (one decision) · `wide` (default) · `xl` (morning hand-off).
- `bodyLayout` — `scroll` (default, single body scroller) or `fill` (children own height and scroll).
- `dim="strong"` deepens the scrim.
- `dismissOnBackdrop={false}` keeps an exit explicit; `Escape` still honours `onDismiss`. Omit `onDismiss` entirely for a forced flow.

Focus is trapped while open and `body` scroll is locked.
