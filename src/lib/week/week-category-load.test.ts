import { describe, expect, it } from "vitest";

import { computeWeekCategoryLoad } from "./week-category-load";

describe("computeWeekCategoryLoad", () => {
  it("weights tasks and protected blocks per category", () => {
    const snapshot = computeWeekCategoryLoad({
      tasks: [
        { category: "business", isTop3: true },
        { category: "business", dayPriorityOrder: 1 },
        { category: "personal" },
      ],
      protectedBlocks: [{ category: "personal" }, { category: "personal" }],
    });

    expect(snapshot.byCategory.business.weight).toBe(6);
    expect(snapshot.byCategory.business.taskCount).toBe(2);
    expect(snapshot.byCategory.personal.weight).toBe(3);
    expect(snapshot.byCategory.personal.taskCount).toBe(1);
    expect(snapshot.byCategory.personal.protectedBlockCount).toBe(2);
    expect(snapshot.emptyCategories).toHaveLength(0);
  });

  it("ignores unresolved categories", () => {
    const snapshot = computeWeekCategoryLoad({
      tasks: [{ category: "personal", categoryUnresolved: true }],
      protectedBlocks: [],
    });

    expect(snapshot.totalWeight).toBe(0);
    expect(snapshot.emptyCategories).toHaveLength(0);
  });
});
