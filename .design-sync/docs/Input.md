---
category: Forms
---

# Input

Spec v2 text field: a 40px pill (`h-control`), white surface, `--control-border` hairline. Focus turns the border ink with a soft halo (`--focus-halo`); `aria-invalid` turns it crimson. Disabled and read-only fields sit on `--surface-2`.

**Not `w-full` by default** — the caller supplies width (`className="w-80"`).

For the invalid state, set `aria-invalid` and render an `<InlineValidation>` (13/500 crimson message) below.

```jsx
<label className="flex w-80 flex-col gap-[var(--space-2)]">
  <span className="text-meta font-semibold text-ink">Client</span>
  <Input defaultValue="Great White" />
</label>
```
