import { describe, expect, it } from "vitest";

import { isLongRunningTimer, LONG_TIMER_SECONDS } from "./timer-thresholds";

describe("isLongRunningTimer", () => {
  it("is false below the threshold and true at or above it", () => {
    expect(isLongRunningTimer(LONG_TIMER_SECONDS - 1)).toBe(false);
    expect(isLongRunningTimer(LONG_TIMER_SECONDS)).toBe(true);
    expect(isLongRunningTimer(LONG_TIMER_SECONDS + 3600)).toBe(true);
  });

  it("honours a custom threshold", () => {
    expect(isLongRunningTimer(90, 60)).toBe(true);
    expect(isLongRunningTimer(30, 60)).toBe(false);
  });
});
