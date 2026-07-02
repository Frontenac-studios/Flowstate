import { describe, expect, it } from "vitest";

import {
  emptyCategoryAttention,
  evaluateCategoryBaseline,
  type CategoryAttention,
} from "./category-baseline";

function week(partial: Partial<CategoryAttention>): CategoryAttention {
  return { ...emptyCategoryAttention(), ...partial };
}

describe("evaluateCategoryBaseline", () => {
  const workHeavyHistory = Array.from({ length: 4 }, () =>
    week({ professional: 80, body_mind: 10, relationships: 10 })
  );

  it("suppresses nudges during cold start", () => {
    const result = evaluateCategoryBaseline({
      historicalWeeks: workHeavyHistory.slice(0, 2),
      currentWeek: week({ professional: 90, body_mind: 5, relationships: 5 }),
    });
    expect(result.ready).toBe(false);
    expect(result.mostStarved).toBeNull();
  });

  it("flags most-starved category when lopsided and below baseline", () => {
    const result = evaluateCategoryBaseline({
      historicalWeeks: workHeavyHistory,
      currentWeek: week({ professional: 90, body_mind: 3, relationships: 5 }),
    });
    expect(result.ready).toBe(true);
    expect(result.lopsided).toBe(true);
    expect(result.mostStarved).toBe("body_mind");
  });

  it("does not flag when mix is balanced", () => {
    const balanced = Array.from({ length: 4 }, () =>
      week({
        professional: 20,
        body_mind: 20,
        relationships: 20,
        adulting: 20,
        personal_projects: 20,
      })
    );
    const result = evaluateCategoryBaseline({
      historicalWeeks: balanced,
      currentWeek: week({
        professional: 20,
        body_mind: 20,
        relationships: 20,
        adulting: 20,
        personal_projects: 20,
      }),
    });
    expect(result.lopsided).toBe(false);
    expect(result.mostStarved).toBeNull();
  });
});
