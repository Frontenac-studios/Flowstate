import { describe, expect, it } from "vitest";

import { computeCategoryBalance } from "./category-balance";

describe("computeCategoryBalance", () => {
  it("returns no segments and zero total for an empty list", () => {
    expect(computeCategoryBalance([])).toEqual({ segments: [], total: 0 });
  });

  it("counts resolved categories and orders them canonically", () => {
    const { segments, total } = computeCategoryBalance([
      { category: "adulting" },
      { category: "professional" },
      { category: "adulting" },
      { category: "body_mind" },
    ]);

    expect(total).toBe(4);
    // professional precedes body_mind precedes adulting per PROJECT_CATEGORIES,
    // regardless of input order.
    expect(segments).toEqual([
      { category: "professional", count: 1 },
      { category: "body_mind", count: 1 },
      { category: "adulting", count: 2 },
    ]);
  });

  it("omits categories with no tasks", () => {
    const { segments } = computeCategoryBalance([{ category: "relationships" }]);
    expect(segments).toEqual([{ category: "relationships", count: 1 }]);
  });

  it("buckets unset and unresolved categories into a trailing null slice", () => {
    const { segments, total } = computeCategoryBalance([
      { category: "professional" },
      { category: null },
      { category: "adulting", categoryUnresolved: true },
      {},
    ]);

    expect(total).toBe(4);
    expect(segments).toEqual([
      { category: "professional", count: 1 },
      { category: null, count: 3 },
    ]);
  });

  it("keeps the uncategorised slice last even when categories are present", () => {
    const { segments } = computeCategoryBalance([{ category: null }, { category: "body_mind" }]);

    expect(segments.map((s) => s.category)).toEqual(["body_mind", null]);
  });
});
