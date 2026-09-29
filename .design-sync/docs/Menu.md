---
category: Overlays
---

# Menu

Spec v3 Pa1 menu: a white `--radius-card` card with **no border** and a two-layer `--shadow-menu`, 8px padding, 36px rows (12px sides, 8px radius, 14/500). Arrow keys move between items; Home/End jump.

- `MenuItem` — `shortcut` (a small key chip on the right), `destructive` (crimson — put it **last, after a `MenuDivider`**), `selected` (pick-one lists: bold + check), `submenu` (›), `indent` (nested, 28px), `dimmed` + `note` (e.g. "Not planned" at 40%).
- `MenuDivider`, `MenuLabel` (label caps group heading), `MenuSearch` (36px pill search field for long lists).

Position it yourself, directly below its trigger (`absolute right-0 top-full mt-1`), and put `aria-expanded` on the trigger — `IconButton`/`Button` then stay pressed while it's open.

```jsx
<Menu aria-label="Task actions" className="absolute right-0 top-full mt-1 w-[232px]">
  <MenuItem shortcut="E">Edit</MenuItem>
  <MenuDivider />
  <MenuItem destructive>Delete</MenuItem>
</Menu>
```
