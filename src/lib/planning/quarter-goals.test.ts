import { describe, expect, it } from "vitest";

import {
  filterGoalsByMonth,
  filterQuarterGoals,
  filterUnassignedQuarterGoals,
  type QuarterGoalFields,
} from "./quarter-goals";

const base = (overrides: Partial<QuarterGoalFields>): QuarterGoalFields => ({
  id: "g1",
  title: "Goal",
  category: "professional",
  state: "active",
  targetHorizon: "quarter",
  targetYear: 2026,
  targetQuarter: 2,
  targetMonth: null,
  ...overrides,
});

describe("filterUnassignedQuarterGoals", () => {
  it("returns quarter-scoped goals without a month", () => {
    const goals = [
      base({ id: "a" }),
      base({ id: "b", targetMonth: 5, targetHorizon: "month" }),
      base({ id: "c", targetQuarter: 1 }),
      base({ id: "d", state: "done" }),
    ];
    expect(filterUnassignedQuarterGoals(goals, 2026, 2).map((g) => g.id)).toEqual(["a"]);
  });
});

describe("filterGoalsByMonth", () => {
  it("returns month-assigned goals for the quarter", () => {
    const goals = [
      base({ id: "a", targetHorizon: "month", targetMonth: 4 }),
      base({ id: "b", targetHorizon: "month", targetMonth: 5 }),
      base({ id: "c", targetHorizon: "quarter", targetMonth: null }),
    ];
    expect(filterGoalsByMonth(goals, 2026, 2, 4).map((g) => g.id)).toEqual(["a"]);
  });
});

describe("filterQuarterGoals", () => {
  it("includes tray and month-assigned goals for the quarter", () => {
    const goals = [
      base({ id: "a" }),
      base({ id: "b", targetHorizon: "month", targetMonth: 6 }),
      base({ id: "c", targetQuarter: 3 }),
    ];
    expect(filterQuarterGoals(goals, 2026, 2).map((g) => g.id)).toEqual(["a", "b"]);
  });
});
