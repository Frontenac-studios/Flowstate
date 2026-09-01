import { describe, expect, it } from "vitest";

import { computeBudgetBar } from "./compute-budget-bar";
import { evaluateOffTarget, OFF_TARGET_THRESHOLD_PCT } from "./off-target";

const HOUR = 3600;

describe("evaluateOffTarget", () => {
  it("is silent when the week is within threshold of the tilt", () => {
    // 4h business / 1h personal = 80% business, tilt 70 → delta 10 < 15.
    const bar = computeBudgetBar({
      businessSeconds: 4 * HOUR,
      personalSeconds: HOUR,
      tiltBusinessPct: 70,
    });
    expect(evaluateOffTarget(bar)).toBeNull();
  });

  it("flags drift toward personal past the threshold", () => {
    // 2h business / 3h personal = 40% business, tilt 70 → delta -30.
    const bar = computeBudgetBar({
      businessSeconds: 2 * HOUR,
      personalSeconds: 3 * HOUR,
      tiltBusinessPct: 70,
    });
    const off = evaluateOffTarget(bar);
    expect(off).not.toBeNull();
    expect(off!.towardPersonal).toBe(true);
    expect(off!.deltaPct).toBe(-30);
  });

  it("flags drift toward business past the threshold", () => {
    // 9h business / 1h personal = 90% business, tilt 60 → delta +30.
    const bar = computeBudgetBar({
      businessSeconds: 9 * HOUR,
      personalSeconds: HOUR,
      tiltBusinessPct: 60,
    });
    const off = evaluateOffTarget(bar);
    expect(off).not.toBeNull();
    expect(off!.towardPersonal).toBe(false);
    expect(off!.deltaPct).toBe(30);
  });

  it("is silent when the tilt is unset or nothing is logged", () => {
    const unset = computeBudgetBar({
      businessSeconds: 5 * HOUR,
      personalSeconds: 5 * HOUR,
      tiltBusinessPct: null,
    });
    expect(evaluateOffTarget(unset)).toBeNull();
    const empty = computeBudgetBar({
      businessSeconds: 0,
      personalSeconds: 0,
      tiltBusinessPct: 70,
    });
    expect(evaluateOffTarget(empty)).toBeNull();
  });

  it("respects a custom threshold", () => {
    // delta 10 — under the default 15, over a custom 5.
    const bar = computeBudgetBar({
      businessSeconds: 4 * HOUR,
      personalSeconds: HOUR,
      tiltBusinessPct: 70,
    });
    expect(evaluateOffTarget(bar, OFF_TARGET_THRESHOLD_PCT)).toBeNull();
    expect(evaluateOffTarget(bar, 5)).not.toBeNull();
  });
});
