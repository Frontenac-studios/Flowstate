import { describe, expect, it } from "vitest";

import { computeBudgetBar } from "./compute-budget-bar";

const HOUR = 3600;
const TEN_MIN = 600;

describe("computeBudgetBar", () => {
  it("is unset when no tilt is declared", () => {
    const bar = computeBudgetBar({
      businessSeconds: 4 * HOUR,
      personalSeconds: HOUR,
      tiltBusinessPct: null,
    });
    expect(bar.state).toBe("unset");
    expect(bar.tiltBusinessPct).toBeNull();
    // Actual split is still computed — the invite can preview it.
    expect(bar.actualBusinessPct).toBe(80);
    // No tilt means no off-target signal.
    expect(bar.deltaPct).toBeNull();
  });

  it("is empty when a tilt is declared but nothing is logged", () => {
    const bar = computeBudgetBar({
      businessSeconds: 0,
      personalSeconds: 0,
      tiltBusinessPct: 70,
    });
    expect(bar.state).toBe("empty");
    expect(bar.loggedSeconds).toBe(0);
    expect(bar.actualBusinessPct).toBeNull();
    expect(bar.deltaPct).toBeNull();
  });

  // The load-bearing behaviour (acceptance criterion): seconds are the denominator,
  // so many tiny personal errands barely move the split while one long detour moves
  // it visibly. Start from the same six-hour business day in both cases.
  it("barely moves for six ten-minute personal errands", () => {
    const sixHoursBusiness = 6 * HOUR;
    const errands = 6 * TEN_MIN; // one hour of personal, in small pieces
    const bar = computeBudgetBar({
      businessSeconds: sixHoursBusiness,
      personalSeconds: errands,
      tiltBusinessPct: 70,
    });
    // 21600 / (21600 + 3600) = 85.7% → 86, comfortably above the 70 tilt.
    expect(bar.actualBusinessPct).toBe(86);
    expect(bar.deltaPct).toBe(16);
  });

  it("moves visibly for one three-hour personal detour", () => {
    const sixHoursBusiness = 6 * HOUR;
    const detour = 3 * HOUR;
    const bar = computeBudgetBar({
      businessSeconds: sixHoursBusiness,
      personalSeconds: detour,
      tiltBusinessPct: 70,
    });
    // 21600 / (21600 + 10800) = 66.7% → 67, now below the 70 tilt.
    expect(bar.actualBusinessPct).toBe(67);
    expect(bar.deltaPct).toBe(-3);
  });

  it("the detour crosses the tilt while the errands do not", () => {
    const base = 6 * HOUR;
    const errands = computeBudgetBar({
      businessSeconds: base,
      personalSeconds: 6 * TEN_MIN,
      tiltBusinessPct: 70,
    });
    const detour = computeBudgetBar({
      businessSeconds: base,
      personalSeconds: 3 * HOUR,
      tiltBusinessPct: 70,
    });
    // Errands stay on the business side of the tilt; the detour tips under it.
    expect(errands.deltaPct).toBeGreaterThan(0);
    expect(detour.deltaPct).toBeLessThan(0);
    // And the errands barely register: within a few points of a pure business day.
    const pure = computeBudgetBar({
      businessSeconds: base,
      personalSeconds: 0,
      tiltBusinessPct: 70,
    });
    expect(Math.abs(pure.actualBusinessPct! - errands.actualBusinessPct!)).toBeLessThanOrEqual(15);
  });

  it("derives free minutes from capacity minus booked, floored at zero", () => {
    const bar = computeBudgetBar({
      businessSeconds: HOUR,
      personalSeconds: 0,
      tiltBusinessPct: 70,
      bookedMinutes: 120,
      capacityMinutes: 480,
    });
    expect(bar.bookedMinutes).toBe(120);
    expect(bar.freeMinutes).toBe(360);
  });

  it("never reports negative free minutes when overbooked", () => {
    const bar = computeBudgetBar({
      businessSeconds: 0,
      personalSeconds: 0,
      tiltBusinessPct: 70,
      bookedMinutes: 600,
      capacityMinutes: 480,
    });
    expect(bar.freeMinutes).toBe(0);
  });

  it("leaves calendar figures null when no capacity data is given", () => {
    const bar = computeBudgetBar({
      businessSeconds: HOUR,
      personalSeconds: HOUR,
      tiltBusinessPct: 50,
    });
    expect(bar.bookedMinutes).toBeNull();
    expect(bar.freeMinutes).toBeNull();
  });

  it("clamps negative second inputs to zero", () => {
    const bar = computeBudgetBar({
      businessSeconds: -100,
      personalSeconds: -50,
      tiltBusinessPct: 60,
    });
    expect(bar.businessSeconds).toBe(0);
    expect(bar.personalSeconds).toBe(0);
    expect(bar.loggedSeconds).toBe(0);
    expect(bar.state).toBe("empty");
  });
});
