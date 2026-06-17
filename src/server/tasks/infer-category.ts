import "server-only";

import { type InferCategoryFromTitle } from "@/lib/tasks/resolveTaskCategory";

// Phase 1 (1.4a) layer-3 seam — the single place the AI provider gets wired.
//
// Decided design (data-spine.md §7, 1.AIa–d / build-spec 1H): an EMBEDDINGS
// nearest-prototype classifier, NOT an LLM. Embed the title, take cosine similarity
// against five category prototype vectors, and return { category, confidence } only
// when the top match clears a floor AND beats the runner-up by a margin (1.AIc);
// otherwise abstain (null). A small local model powers live + offline; a sharper
// hosted model is used only by the bulk backfill.
//
// Until that lands this abstains (returns null), so resolveTaskCategory falls through
// to last-used and then the unresolved fallback — capture never blocks and nothing is
// mis-categorised with false confidence. The real provider must also swallow its own
// errors as `null` (an error == "no opinion", not a thrown request).
export const inferCategoryFromTitle: InferCategoryFromTitle = () => null;
