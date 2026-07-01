import { describe, expect, it } from "vitest";

import { weightedProgress } from "./weighted-progress";

describe("weightedProgress", () => {
  it("returns 0% when there are no tasks", () => {
    expect(weightedProgress([])).toEqual({ percent: 0, completedWeight: 0, totalWeight: 0 });
  });

  it("weights heavy tasks at 3 and regular at 1", () => {
    const result = weightedProgress([
      { completed: true, isHeavy: true },
      { completed: true, isHeavy: false },
      { completed: false, isHeavy: false },
      { completed: false, isHeavy: false },
    ]);
    expect(result).toEqual({ percent: 67, completedWeight: 4, totalWeight: 6 });
  });

  it("returns 100% when all weight is complete", () => {
    expect(
      weightedProgress([
        { completed: true, isHeavy: true },
        { completed: true, isHeavy: false },
      ])
    ).toEqual({ percent: 100, completedWeight: 4, totalWeight: 4 });
  });
});
