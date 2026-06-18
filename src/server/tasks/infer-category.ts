import "server-only";

// Phase 1 (1.4a / 1H) layer-3 seam — the server entry point for the AI provider.
//
// The real classifier (data-spine §7, 1.AIa–d) is an EMBEDDINGS nearest-prototype model,
// not an LLM, and is isomorphic: the same small local model runs in the browser (live +
// offline) and here in Node for the create path, so the stored category is AI-forward
// (Model C). This module just re-exports it behind the documented server seam; the
// provider already abstains to `null` on low confidence or any error.
export { inferCategory, warmCategoryInference } from "@/lib/tasks/category-inference";
