import { describe, expect, it } from "vitest";

import {
  PROJECT_SIMILARITY_THRESHOLD,
  rankSimilarProjects,
  rankTemplatesBySimilarProjects,
  selectInferredSimilar,
} from "./project-similarity";

const unit = (x: number, y: number): number[] => {
  const n = Math.hypot(x, y);
  return [x / n, y / n];
};

describe("rankSimilarProjects", () => {
  it("ranks by cosine and marks suggestions above threshold", () => {
    const query = unit(1, 0);
    const ranked = rankSimilarProjects(query, [
      { id: "a", name: "Alpha", category: "professional", embedding: unit(1, 0.1) },
      { id: "b", name: "Beta", category: "adulting", embedding: unit(0, 1) },
      { id: "c", name: "Gamma", category: "professional", embedding: null },
    ]);

    expect(ranked[0]?.id).toBe("a");
    expect(ranked[0]?.suggested).toBe(true);
    expect(ranked[1]?.id).toBe("b");
    expect(ranked[1]?.suggested).toBe(false);
    expect(ranked[2]?.id).toBe("c");
    expect(ranked[2]?.score).toBe(0);
  });

  it("excludes ids and applies category boost", () => {
    const query = unit(1, 0);
    const ranked = rankSimilarProjects(
      query,
      [
        { id: "self", name: "Self", category: "professional", embedding: unit(1, 0) },
        { id: "same", name: "Same cat", category: "professional", embedding: unit(0.9, 0.1) },
        { id: "other", name: "Other cat", category: "adulting", embedding: unit(0.9, 0.1) },
      ],
      { excludeIds: new Set(["self"]), preferredCategory: "professional" }
    );

    expect(ranked.map((r) => r.id)).toEqual(["same", "other"]);
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });
});

describe("selectInferredSimilar", () => {
  it("returns only above-threshold candidates, capped", () => {
    const query = unit(1, 0);
    const hits = selectInferredSimilar(
      query,
      [
        { id: "a", name: "A", category: "professional", embedding: unit(1, 0) },
        { id: "b", name: "B", category: "professional", embedding: unit(0.99, 0.1) },
        { id: "c", name: "C", category: "professional", embedding: unit(0, 1) },
      ],
      { limit: 2, threshold: PROJECT_SIMILARITY_THRESHOLD }
    );

    expect(hits).toHaveLength(2);
    expect(hits.every((h) => h.suggested)).toBe(true);
    expect(hits.map((h) => h.id)).not.toContain("c");
  });
});

describe("rankTemplatesBySimilarProjects", () => {
  it("prefers name match, then category", () => {
    const ranked = rankTemplatesBySimilarProjects(
      [
        { id: "1", name: "Other", category: "adulting" },
        { id: "2", name: "Launch site", category: "professional" },
        { id: "3", name: "Launch site", category: "adulting" },
      ],
      [{ name: "Launch site", category: "professional" }]
    );

    expect(ranked.map((t) => t.id)).toEqual(["2", "3", "1"]);
  });

  it("preserves order when no similar projects", () => {
    const templates = [
      { id: "1", name: "A", category: "adulting" as const },
      { id: "2", name: "B", category: "professional" as const },
    ];
    expect(rankTemplatesBySimilarProjects(templates, [])).toEqual(templates);
  });
});
