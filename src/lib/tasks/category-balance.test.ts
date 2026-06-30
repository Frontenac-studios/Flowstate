import { describe, expect, it } from "vitest";

import { computeCategoryBalance } from "./category-balance";

describe("computeCategoryBalance", () => {
  it("returns an empty, neutral balance for an empty list", () => {
    expect(computeCategoryBalance([])).toEqual({
      segments: [],
      emptyCategories: [],
      total: 0,
      totalTasks: 0,
      dominant: null,
      lopsided: false,
    });
  });

  it("weights resolved categories and orders them canonically", () => {
    const { segments, total, totalTasks } = computeCategoryBalance([
      { category: "adulting" },
      { category: "professional" },
      { category: "adulting" },
      { category: "body_mind" },
    ]);

    expect(totalTasks).toBe(4);
    expect(total).toBe(4);
    // professional precedes body_mind precedes adulting per PROJECT_CATEGORIES,
    // regardless of input order.
    expect(segments).toEqual([
      { category: "professional", weight: 1, taskCount: 1 },
      { category: "body_mind", weight: 1, taskCount: 1 },
      { category: "adulting", weight: 2, taskCount: 2 },
    ]);
  });

  it("counts a Top-3 task as three weighted units but one task", () => {
    const { segments, total } = computeCategoryBalance([
      { category: "professional", isTop3: true },
      { category: "professional" },
    ]);

    expect(total).toBe(4);
    expect(segments).toEqual([{ category: "professional", weight: 4, taskCount: 2 }]);
  });

  it("reports core life-areas with nothing planned as empty", () => {
    const { emptyCategories } = computeCategoryBalance([{ category: "professional" }]);

    expect(emptyCategories).toEqual([
      "personal_projects",
      "relationships",
      "body_mind",
      "adulting",
    ]);
  });

  it("flags a dominant life-area and a lopsided day", () => {
    // A Top-3 deck (weight 3) dwarfs a lone errand; relationships sit empty.
    const { dominant, lopsided } = computeCategoryBalance([
      { category: "professional", isTop3: true },
      { category: "adulting" },
    ]);

    expect(dominant).toBe("professional");
    expect(lopsided).toBe(true);
  });

  it("is not lopsided when every life-area has something planned", () => {
    const { dominant, lopsided, emptyCategories } = computeCategoryBalance([
      { category: "professional", isTop3: true },
      { category: "personal_projects" },
      { category: "relationships" },
      { category: "body_mind" },
      { category: "adulting" },
    ]);

    expect(dominant).toBe("professional");
    expect(emptyCategories).toEqual([]);
    expect(lopsided).toBe(false);
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
      { category: "professional", weight: 1, taskCount: 1 },
      { category: null, weight: 3, taskCount: 3 },
    ]);
  });

  it("keeps the uncategorised slice last even when categories are present", () => {
    const { segments } = computeCategoryBalance([{ category: null }, { category: "body_mind" }]);

    expect(segments.map((s) => s.category)).toEqual(["body_mind", null]);
  });
});
