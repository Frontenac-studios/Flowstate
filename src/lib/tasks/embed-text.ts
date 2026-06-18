import type { FeatureExtractionPipeline } from "@huggingface/transformers";

// Phase 1 (1H / 1.AId): the local embedding runtime, shared by the live composer
// (browser), the server create path (Node), and offline. A single small sentence
// model — all-MiniLM-L6-v2, int8-quantized (~23MB) — embeds a title to a unit vector.
// The model is fetched once from the HF hub and cached by the runtime; embeddings are
// memoized per normalized title so per-keystroke calls stay near-free (1.AIa).

const MODEL_ID = "Xenova/all-MiniLM-L6-v2";

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    // Dynamically import the (large) library so it's only fetched on first inference,
    // not in the composer's initial chunk.
    extractorPromise = import("@huggingface/transformers").then(({ env, pipeline }) => {
      // We ship no bundled model files; always resolve from the hub / runtime cache.
      env.allowLocalModels = false;
      // int8 weights keep the download small enough for a per-keystroke client path.
      return pipeline("feature-extraction", MODEL_ID, { dtype: "q8" });
    });
  }
  return extractorPromise;
}

/** Fold a title to its cache key: trimmed, lowercased, whitespace-collapsed. */
export function normalizeTitle(title: string): string {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

const embeddingCache = new Map<string, number[]>();

/** Embed a title to a mean-pooled, L2-normalized vector. Empty title → empty vector. */
export async function embedText(text: string): Promise<number[]> {
  const key = normalizeTitle(text);
  if (!key) return [];

  const cached = embeddingCache.get(key);
  if (cached) return cached;

  const extractor = await getExtractor();
  const output = await extractor(key, { pooling: "mean", normalize: true });
  const vector = Array.from(output.data as Float32Array);
  embeddingCache.set(key, vector);
  return vector;
}

/** Preload the model (and pay the download) ahead of the first real call. */
export async function warmEmbedder(): Promise<void> {
  await getExtractor();
}
