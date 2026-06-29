import { cosineSimilarity } from "@/lib/tasks/category-classifier";

/**
 * Resurface logic for the Abyss (sub-phase 7A). Re-parking something you already have
 * — a near-duplicate by embedding similarity — bumps the existing item's
 * `resurface_count` ("you've parked this 4×"), brightening it in the List. Pure and
 * unit-tested; the tRPC backfill path does the DB writes. Reuses the category provider's
 * `cosineSimilarity` so there's one vector-math implementation.
 */

/** The minimal item shape the near-duplicate check needs. */
export interface EmbeddableItem {
  id: string;
  embedding: number[] | null;
}

/**
 * Cosine threshold above which two embedded titles count as the "same" parked idea.
 * MiniLM unit vectors: ~0.8+ is a genuine near-duplicate ("watercolour glazing" vs
 * "watercolor glaze"); related-but-distinct topics sit lower. Tunable.
 */
export const NEAR_DUPLICATE_THRESHOLD = 0.82;

/**
 * Ids of existing items whose embedding is a near-duplicate of `vector` (cosine ≥
 * threshold). Items without an embedding are skipped; an empty query vector matches
 * nothing. The caller is responsible for excluding the item that owns `vector`.
 */
export function selectNearDuplicates(
  vector: number[],
  items: EmbeddableItem[],
  threshold: number = NEAR_DUPLICATE_THRESHOLD
): string[] {
  if (vector.length === 0) return [];
  const hits: string[] = [];
  for (const item of items) {
    if (!item.embedding || item.embedding.length === 0) continue;
    if (cosineSimilarity(vector, item.embedding) >= threshold) hits.push(item.id);
  }
  return hits;
}
