---
category: Forms
---

# Input

Flat text input: `--surface` background, hairline `--border`, focus ring at `--focus-ring` via the `kash-focus-visible` class.

**Not `w-full` by default** — the caller supplies width (`className="w-80"`). It carries no `disabled` or `readOnly` styling of its own; those render at browser defaults.

For the invalid state, add `inlineValidationFieldClass` (exported from `InlineValidation`) and render an `<InlineValidation>` below.

```jsx
<label className="flex w-80 flex-col gap-[var(--space-2)]">
  <span className="text-meta text-ink-muted">Client</span>
  <Input defaultValue="Great White" />
</label>
```
