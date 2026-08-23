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
      { category: "personal" },
      { category: "business" },
      { category: "personal" },
      { category: "personal" },
    ]);

    expect(totalTasks).toBe(4);
    expect(total).toBe(4);
    // business precedes personal per PROJECT_CATEGORIES, regardless of input order.
    expect(segments).toEqual([
      { category: "business", weight: 1, taskCount: 1 },
      { category: "personal", weight: 3, taskCount: 3 },
    ]);
  });

  it("counts a Top-3 task as three weighted units but one task", () => {
    const { segments, total } = computeCategoryBalance([
      { category: "business", isTop3: true },
      { category: "business" },
    ]);

    expect(total).toBe(4);
    expect(segments).toEqual([{ category: "business", weight: 4, taskCount: 2 }]);
  });

  it("reports core life-areas with nothing planned as empty", () => {
    const { emptyCategories } = computeCategoryBalance([{ category: "business" }]);

    expect(emptyCategories).toEqual(["personal"]);
  });

  it("flags a dominant life-area and a lopsided day", () => {
    // A Top-3 deck (weight 3) dwarfs a lone task; personal sits empty.
    const { dominant, lopsided } = computeCategoryBalance([
      { category: "business", isTop3: true },
      { category: "business" },
    ]);

    expect(dominant).toBe("business");
    expect(lopsided).toBe(true);
  });

  it("is not lopsided when every life-area has something planned", () => {
    const { dominant, lopsided, emptyCategories } = computeCategoryBalance([
      { category: "business", isTop3: true },
      { category: "personal" },
    ]);

    expect(dominant).toBe("business");
    expect(emptyCategories).toEqual([]);
    expect(lopsided).toBe(false);
  });

  it("buckets unset and unresolved categories into a trailing null slice", () => {
    const { segments, total } = computeCategoryBalance([
      { category: "business" },
      { category: null },
      { category: "personal", categoryUnresolved: true },
      {},
    ]);

    expect(total).toBe(4);
    expect(segments).toEqual([
      { category: "business", weight: 1, taskCount: 1 },
      { category: null, weight: 3, taskCount: 3 },
    ]);
  });

  it("keeps the uncategorised slice last even when categories are present", () => {
    const { segments } = computeCategoryBalance([{ category: null }, { category: "personal" }]);

    expect(segments.map((s) => s.category)).toEqual(["personal", null]);
  });
});
