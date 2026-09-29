---
category: Feedback
---

# Toast

The visual only — a white `--radius-card` card with `--shadow-overlay`, a 3px stripe, a 14/600 title (`message`), an optional muted `detail` line, an optional secondary-pill action, and a dismiss cap.

The stripe takes `stripe` — pass the project's hue (`var(--project-1-solid)`) when the toast is about a project's task; it defaults to ink. `variant="error"` always uses a crimson stripe and crimson title. Do not raise a `Toast` directly — render it through `ToastProvider`, which owns the stack, the dismiss timer and the portal.
