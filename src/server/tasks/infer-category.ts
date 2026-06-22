import "server-only";

// Phase 1 (1.4a / 1H) layer-3 seam — the server entry point for the AI provider.
//
// The classifier returns a gated {category, confidence} (data-spine §7, 1.AIa–d). On the
// CLIENT (live composer + offline) it is the LOCAL embeddings nearest-prototype model; on
// the SERVER create path it is the SHARPER HOSTED model (Haiku) behind the identical seam
// (1.AId / C4). Hosting server inference keeps onnxruntime-node's ~355MB native binary out
// of the serverless function bundle (Vercel's function-size limit) while staying AI-forward
// (Model C). This module just re-exports the provider; it abstains to `null` on low
// confidence, no API key, or any error — never throws.
export { inferCategory, warmCategoryInference } from "./hosted-category-inference";
