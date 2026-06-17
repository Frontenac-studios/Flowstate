import "server-only";

import { type InferCategoryFromTitle } from "@/lib/tasks/resolveTaskCategory";

// Phase 1 (1.4a) layer-3 seam — the single place the AI provider gets wired.
//
// Until a real model is connected this abstains (returns null), so resolveTaskCategory
// falls through to last-used and then the unresolved fallback. That is the correct
// degraded behaviour: capture never blocks and nothing is mis-categorised with false
// confidence. When the provider lands it must return { category, confidence } and
// swallow its own errors as `null` (an error == "no opinion", not a thrown request).
export const inferCategoryFromTitle: InferCategoryFromTitle = () => null;
