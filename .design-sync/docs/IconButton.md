---
category: Actions
---

# IconButton

Icon-led action button: small square hit area, muted ink, hairline border + `--surface-2` fill on hover. The icon is the child, and `aria-label` is **required** — it is the only accessible name.

Always size the glyph with `kashIconProps` rather than a raw `size` prop, so it tracks the `--icon-*` tokens (DT-13).

```jsx
<IconButton aria-label="Add task">
  <Plus {...kashIconProps({ tokenSize: "md" })} aria-hidden />
</IconButton>
```
