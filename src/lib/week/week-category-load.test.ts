import { describe, expect, it } from "vitest";

import { computeWeekCategoryLoad } from "./week-category-load";

describe("computeWeekCategoryLoad", () => {
  it("weights tasks and protected blocks per category", () => {
    const snapshot = computeWeekCategoryLoad({
      tasks: [
        { category: "professional", isTop3: true },
        { category: "professional", dayPriorityOrder: 1 },
        { category: "relationships" },
      ],
      protectedBlocks: [{ category: "body_mind" }, { category: "body_mind" }],
    });

    expect(snapshot.byCategory.professional.weight).toBe(6);
    expect(snapshot.byCategory.professional.taskCount).toBe(2);
    expect(snapshot.byCategory.relationships.weight).toBe(1);
    expect(snapshot.byCategory.body_mind.weight).toBe(2);
    expect(snapshot.byCategory.body_mind.protectedBlockCount).toBe(2);
    expect(snapshot.emptyCategories).toContain("adulting");
    expect(snapshot.emptyCategories).toContain("personal_projects");
  });

  it("ignores unresolved categories", () => {
    const snapshot = computeWeekCategoryLoad({
      tasks: [{ category: "adulting", categoryUnresolved: true }],
      protectedBlocks: [],
    });

    expect(snapshot.totalWeight).toBe(0);
    expect(snapshot.emptyCategories).toHaveLength(0);
  });
});
