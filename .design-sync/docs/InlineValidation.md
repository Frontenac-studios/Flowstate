---
category: Forms
---

# InlineValidation

Crimson field-level error (§7.6): alert icon + `--text-meta` message, `role="alert"`.

Ships with `inlineValidationFieldClass` — apply it to the offending control so the field edge goes crimson too. The message alone is only half the pattern.

```jsx
<Input className={inlineValidationFieldClass} aria-invalid />
<InlineValidation message="Enter a rate before the project can be billed." />
```
