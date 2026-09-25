---
category: Feedback
---

# Toast

The visual only — a card with `--shadow-overlay`, a variant icon, the message, an optional ghost-Button action, and a dismiss cap.

Variants `neutral | success | info | error` are **icon-led** (DT-3b): only `error` takes colour. Do not raise a `Toast` directly — render it through `ToastProvider`, which owns the stack, the dismiss timer and the portal.
