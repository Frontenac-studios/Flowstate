import { cosineSimilarity } from "@/lib/tasks/category-classifier";

/**
 * Tag utilities for the Abyss (§7A). Tags are user-assigned strings; a shared tag forms
 * a constellation. Embeddings only ever *suggest* tags from near neighbours — never
 * auto-applied. Pure and unit-tested; the tRPC router normalizes on write.
 */

export const MAX_TAGS_PER_ITEM = 8;
const MAX_TAG_LENGTH = 32;

/** Fold a raw tag to its stored form: trimmed, lowercased, whitespace-collapsed, capped. */
export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH).trim();
}

/** Normalize a tag list: drop empties, dedupe (order-preserving), cap the count. */
export function normalizeTags(raw: readonly string[]): string[] {
  const out: string[] = [];
  for (const tag of raw) {
    const normalized = normalizeTag(tag);
    if (normalized && !out.includes(normalized)) out.push(normalized);
    if (out.length >= MAX_TAGS_PER_ITEM) break;
  }
  return out;
}

export interface TaggableItem {
  tags?: string[] | null;
}

/** The distinct tag set in use across items, sorted — the autocomplete source. */
export function distinctTags(items: readonly TaggableItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) set.add(tag);
  }
  return Array.from(set).sort();
}

export interface TagNeighbour {
  embedding: number[] | null;
  tags: string[] | null;
}

/**
 * Default cosine above which a tagged neighbour is "related enough" to lend its tag.
 * Tuned to MiniLM's modest short-title similarities (see clustering.ts); near-duplicate
 * resurfacing uses a much higher bar.
 */
export const TAG_SUGGEST_THRESHOLD = 0.5;

/**
 * Suggest tags for `vector` from embedding-near tagged neighbours, most-similar first.
 * Each tag is scored by its best-matching neighbour; tags in `exclude` (the item's own)
 * are dropped. Returns at most `max` tags. Suggestion only — the caller never auto-applies.
 */
export function suggestTagsFromNeighbours(
  vector: number[],
  neighbours: readonly TagNeighbour[],
  options?: { threshold?: number; max?: number; exclude?: readonly string[] }
): string[] {
  const threshold = options?.threshold ?? TAG_SUGGEST_THRESHOLD;
  const max = options?.max ?? 4;
  const exclude = new Set(options?.exclude ?? []);
  if (vector.length === 0) return [];

  const bestSim = new Map<string, number>();
  for (const neighbour of neighbours) {
    if (!neighbour.embedding || neighbour.embedding.length === 0) continue;
    if (!neighbour.tags || neighbour.tags.length === 0) continue;
    const sim = cosineSimilarity(vector, neighbour.embedding);
    if (sim < threshold) continue;
    for (const tag of neighbour.tags) {
      if (exclude.has(tag)) continue;
      const prev = bestSim.get(tag);
      if (prev === undefined || sim > prev) bestSim.set(tag, sim);
    }
  }

  return Array.from(bestSim.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([tag]) => tag);
}
