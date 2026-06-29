import { describe, expect, it } from "vitest";

import { NEAR_DUPLICATE_THRESHOLD, selectNearDuplicates, type EmbeddableItem } from "./resurface";

// cosineSimilarity is dimension-agnostic, so small hand-built vectors suffice. A unit
// vector and its scalar multiples are cosine-1; orthogonal vectors are cosine-0.
const near = [1, 0]; // identical direction to the query → cosine 1
const mid = [1, 1]; // ~0.707 from [1,0]
const far = [0, 1]; // orthogonal → cosine 0

describe("selectNearDuplicates", () => {
  const query = [1, 0];

  it("returns items above the threshold", () => {
    const items: EmbeddableItem[] = [
      { id: "near", embedding: near },
      { id: "far", embedding: far },
    ];
    expect(selectNearDuplicates(query, items)).toEqual(["near"]);
  });

  it("excludes items below the threshold", () => {
    const items: EmbeddableItem[] = [{ id: "mid", embedding: mid }];
    // ~0.707 < 0.82 default
    expect(selectNearDuplicates(query, items)).toEqual([]);
  });

  it("honours a custom threshold", () => {
    const items: EmbeddableItem[] = [{ id: "mid", embedding: mid }];
    expect(selectNearDuplicates(query, items, 0.7)).toEqual(["mid"]);
  });

  it("skips items with no embedding", () => {
    const items: EmbeddableItem[] = [
      { id: "none", embedding: null },
      { id: "empty", embedding: [] },
      { id: "near", embedding: near },
    ];
    expect(selectNearDuplicates(query, items)).toEqual(["near"]);
  });

  it("matches nothing for an empty query vector", () => {
    const items: EmbeddableItem[] = [{ id: "near", embedding: near }];
    expect(selectNearDuplicates([], items)).toEqual([]);
  });

  it("returns every qualifying id", () => {
    const items: EmbeddableItem[] = [
      { id: "a", embedding: [1, 0] },
      { id: "b", embedding: [2, 0] }, // same direction, cosine 1
      { id: "c", embedding: far },
    ];
    expect(selectNearDuplicates(query, items).sort()).toEqual(["a", "b"]);
  });

  it("uses a sane default threshold", () => {
    expect(NEAR_DUPLICATE_THRESHOLD).toBeGreaterThan(0.5);
    expect(NEAR_DUPLICATE_THRESHOLD).toBeLessThanOrEqual(1);
  });
});
