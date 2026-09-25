---
category: Actions
---

# Button

The flat button set (DT-2). Three token-driven variants, no fill except `destructive`.

- `primary` (default) — graphite **outline**: 1.5px `--ink` border, transparent background. Flowstate's primary action is an outline, not a filled block.
- `ghost` — borderless pill, `--ink-muted`, gains a hairline border on hover. The workhorse for secondary and row-level actions.
- `destructive` — filled crimson (`--status-critical`). Irreversible confirms only; crimson never appears on a reversible path.

**Font-size is deliberately not set.** There is no `tailwind-merge` in this repo, so a caller's `text-xs` / `text-lg` wins on source order. Pass sizing and width through `className`.

```jsx
<Button>Start the day</Button>
<Button variant="ghost">Skip</Button>
<Button variant="destructive">Delete project</Button>
```
