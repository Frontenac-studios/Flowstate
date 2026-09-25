---
category: Feedback
---

# QueryErrorNotice

Inline error state for a failed `useQuery`, so a broken fetch reads as an error with a retry rather than as an empty surface. `role="alert"`, subtle-bordered card, centred meta copy.

Give it a specific `message` ("This month didn't load.") whenever you can; the default is deliberately vague.
