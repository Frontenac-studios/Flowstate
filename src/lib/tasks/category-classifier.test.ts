import { describe, expect, it } from "vitest";

import {
  type CategoryPrototype,
  classifyEmbedding,
  cosineSimilarity,
  DEFAULT_CLASSIFIER_CONFIG,
  softmax,
} from "./category-classifier";

// Orthogonal unit vectors so cosine is exactly 1 with self, 0 with others — keeps the
// gating math easy to reason about without a real model.
const PROTOTYPES: CategoryPrototype[] = [
  { category: "professional", vector: [1, 0, 0, 0, 0] },
  { category: "personal_projects", vector: [0, 1, 0, 0, 0] },
  { category: "relationships", vector: [0, 0, 1, 0, 0] },
  { category: "body_mind", vector: [0, 0, 0, 1, 0] },
  { category: "adulting", vector: [0, 0, 0, 0, 1] },
];

describe("cosineSimilarity", () => {
  it("is 1 for identical direction, 0 for orthogonal", () => {
    expect(cosineSimilarity([1, 0], [2, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 5])).toBeCloseTo(0);
  });

  it("returns 0 for mismatched or empty vectors", () => {
    expect(cosineSimilarity([1, 0], [1])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });
});

describe("softmax", () => {
  it("produces a normalized distribution", () => {
    const out = softmax([1, 2, 3], 1);
    expect(out.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(out[2]).toBeGreaterThan(out[0]);
  });

  it("a lower temperature sharpens the peak", () => {
    const warm = softmax([0.6, 0.5], 1);
    const cold = softmax([0.6, 0.5], 0.05);
    expect(cold[0]).toBeGreaterThan(warm[0]);
  });
});

describe("classifyEmbedding", () => {
  it("picks the prototype the query points at, above threshold", () => {
    const result = classifyEmbedding([0, 0, 0.9, 0, 0], PROTOTYPES);
    expect(result).not.toBeNull();
    expect(result?.category).toBe("relationships");
    expect(result?.confidence).toBeGreaterThanOrEqual(DEFAULT_CLASSIFIER_CONFIG.floor);
  });

  it("abstains when the query is ambiguous between two prototypes (margin fails)", () => {
    // Equidistant from professional and personal_projects → no clear winner.
    const result = classifyEmbedding([0.7, 0.7, 0, 0, 0], PROTOTYPES);
    expect(result).toBeNull();
  });

  it("abstains on an empty query or no prototypes", () => {
    expect(classifyEmbedding([], PROTOTYPES)).toBeNull();
    expect(classifyEmbedding([1, 0, 0, 0, 0], [])).toBeNull();
  });

  it("respects a custom floor — a high floor forces abstention", () => {
    const strict = { ...DEFAULT_CLASSIFIER_CONFIG, floor: 0.9999 };
    expect(classifyEmbedding([0, 0, 1, 0, 0], PROTOTYPES, strict)).toBeNull();
  });
});
