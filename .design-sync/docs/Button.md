---
category: Actions
---

# Button

The Spec v2 button set. Every variant is a pill (`--radius-pill`), weight 600.

- `primary` (default) — filled ink, white label. One per group: the action you want taken.
- `secondary` — soft gray fill (`--active-surface`). The other action beside a primary.
- `tertiary` — underlined text link, for skip / cancel.
- `ghost` — borderless muted pill that gains a hairline on hover, for quiet chrome and row-level actions.
- `soft-destructive` — soft crimson fill, crimson label. Everyday delete / remove.
- `destructive` — solid crimson. **Only** the final irreversible confirm (e.g. inside a "Delete project?" dialog).

A `KeyCap` inside a primary button inverts to a translucent chip automatically.

**Font-size is deliberately not set.** There is no `tailwind-merge` in this repo, so a caller's `text-xs` / `text-lg` wins on source order. Pass sizing and width through `className`.

```jsx
<Button>Start day <KeyCap>⌘↵</KeyCap></Button>
<Button variant="secondary">Review list</Button>
<Button variant="tertiary">Skip</Button>
<Button variant="soft-destructive">Delete</Button>
<Button variant="destructive">Delete project</Button>
```
