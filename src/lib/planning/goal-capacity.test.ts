import { describe, expect, it } from "vitest";

import {
  CAPACITY_NUDGE_RATIO,
  computeGoalCapacity,
  DEFAULT_WEEKLY_AVAILABLE_MINUTES,
} from "./goal-capacity";

describe("computeGoalCapacity", () => {
  it("sums task estimates and nudges at 130%+", () => {
    const threshold = Math.ceil(DEFAULT_WEEKLY_AVAILABLE_MINUTES * CAPACITY_NUDGE_RATIO);
    const under = computeGoalCapacity([60, 120], DEFAULT_WEEKLY_AVAILABLE_MINUTES);
    expect(under.showNudge).toBe(false);

    const over = computeGoalCapacity([threshold], DEFAULT_WEEKLY_AVAILABLE_MINUTES);
    expect(over.showNudge).toBe(true);
    expect(over.ratio).toBeGreaterThanOrEqual(CAPACITY_NUDGE_RATIO);
  });

  it("ignores null and zero estimates", () => {
    const snap = computeGoalCapacity([null, 0, undefined, 30], 100);
    expect(snap.committedMinutes).toBe(30);
  });
});
