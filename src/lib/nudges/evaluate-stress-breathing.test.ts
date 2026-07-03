import { describe, expect, it } from "vitest";

import { evaluateStressBreathing } from "./evaluate-stress-breathing";

describe("evaluateStressBreathing", () => {
  it("fires on long focus with low mood", () => {
    expect(
      evaluateStressBreathing({
        longestFocusSegmentMin: 90,
        incompleteTodayCount: 2,
        overdueCount: 0,
        recentMood: 2,
        alreadyNudgedToday: false,
      }).shouldFire
    ).toBe(true);
  });

  it("does not fire when already nudged today", () => {
    expect(
      evaluateStressBreathing({
        longestFocusSegmentMin: 90,
        incompleteTodayCount: 8,
        overdueCount: 3,
        recentMood: 1,
        alreadyNudgedToday: true,
      }).shouldFire
    ).toBe(false);
  });

  it("does not fire on a light day with okay mood", () => {
    expect(
      evaluateStressBreathing({
        longestFocusSegmentMin: 30,
        incompleteTodayCount: 2,
        overdueCount: 0,
        recentMood: 4,
        alreadyNudgedToday: false,
      }).shouldFire
    ).toBe(false);
  });
});
