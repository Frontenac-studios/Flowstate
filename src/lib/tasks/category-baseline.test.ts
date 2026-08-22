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
  const workHeavyHistory = Array.from({ length: 4 }, () => week({ business: 80, personal: 20 }));

  it("suppresses nudges during cold start", () => {
    const result = evaluateCategoryBaseline({
      historicalWeeks: workHeavyHistory.slice(0, 2),
      currentWeek: week({ business: 90, personal: 5 }),
    });
    expect(result.ready).toBe(false);
    expect(result.mostStarved).toBeNull();
  });

  it("flags most-starved category when lopsided and below baseline", () => {
    const result = evaluateCategoryBaseline({
      historicalWeeks: workHeavyHistory,
      currentWeek: week({ business: 90, personal: 5 }),
    });
    expect(result.ready).toBe(true);
    expect(result.lopsided).toBe(true);
    expect(result.mostStarved).toBe("personal");
  });

  it("does not flag when attention holds at its usual baseline", () => {
    const result = evaluateCategoryBaseline({
      historicalWeeks: workHeavyHistory,
      currentWeek: week({ business: 80, personal: 20 }),
    });
    expect(result.mostStarved).toBeNull();
  });
});
