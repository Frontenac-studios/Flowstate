---
category: Overlays
---

# Dialog

Spec v3 Sa dialog: centered, 360px (`size="md"` = 480px for a form), `--radius-card`, 24px padding, `--shadow-dialog` over the 32% `--scrim`. 17/600 title, 14px muted `description`, `actions` right-aligned. Escape and the scrim close it; Tab is trapped; body scroll is locked.

Quiet actions are `Button variant="outline"`; **solid crimson only on the final destructive action**. For a destructive confirm, pass `initialFocusRef` pointing at Cancel.

```jsx
<Dialog
  open={open}
  onClose={close}
  title="Delete this task?"
  description="This can't be undone."
  actions={
    <>
      <Button variant="outline" onClick={close}>
        Cancel
      </Button>
      <Button variant="destructive">Delete task</Button>
    </>
  }
/>
```
