---
category: Feedback
---

# ToastProvider

Owns the toast stack, the 5s auto-dismiss, the exit animation and the `document.body` portal. Mount it once around the app region that raises toasts.

- `useToast()` throws outside a provider — use it where one is guaranteed.
- `useOptionalToast()` returns `null` instead, for components that render both inside and outside the shell (e.g. `/today/focus`, which has no provider).

```jsx
const { toast } = useToast();
toast({
  message: "Task completed",
  detail: "Draft Great White weekly report",
  stripe: "var(--project-1-solid)",
  action: { label: "Undo", onClick: undo },
});
```
