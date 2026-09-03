import { describe, expect, it } from "vitest";

import {
  computeBurn,
  computeProjectBurn,
  describeBurn,
  effectiveRateCents,
  fixedFeeHealth,
  OFF_TRACK_MARGIN_PCT,
  OFF_TRACK_MIN_CONSUMED_PCT,
} from "./burn";

const hours = (h: number) => h * 3600;

describe("computeBurn", () => {
  it("reports an unestimated phase as unplanned, never as ok", () => {
    // Showing green for something nobody measured would be a lie the rest of the
    // signal has to live with.
    const burn = computeBurn({ estimateHours: null, actualSeconds: hours(9), completedPct: 10 });
    expect(burn.state).toBe("unplanned");
    expect(burn.consumedPct).toBeNull();
    expect(burn.aheadByPct).toBeNull();
    expect(burn.actualHours).toBe(9);
  });

  it("treats a zero estimate as unplanned rather than dividing by it", () => {
    expect(computeBurn({ estimateHours: 0, actualSeconds: hours(4), completedPct: 0 }).state).toBe(
      "unplanned"
    );
  });

  it("is ok when the budget tracks the work", () => {
    const burn = computeBurn({ estimateHours: 10, actualSeconds: hours(5), completedPct: 50 });
    expect(burn.consumedPct).toBe(50);
    expect(burn.aheadByPct).toBe(0);
    expect(burn.state).toBe("ok");
  });

  it("is ok when the work is ahead of the budget", () => {
    const burn = computeBurn({ estimateHours: 10, actualSeconds: hours(3), completedPct: 60 });
    expect(burn.aheadByPct).toBe(-30);
    expect(burn.state).toBe("ok");
  });

  it("fires once the budget runs far enough ahead of the work", () => {
    const burn = computeBurn({ estimateHours: 10, actualSeconds: hours(7), completedPct: 40 });
    expect(burn.aheadByPct).toBe(30);
    expect(burn.state).toBe("hot");
  });

  it("stays quiet inside the margin — a plan is an estimate", () => {
    const burn = computeBurn({
      estimateHours: 10,
      actualSeconds: hours(5),
      completedPct: 50 - OFF_TRACK_MARGIN_PCT,
    });
    expect(burn.aheadByPct).toBe(OFF_TRACK_MARGIN_PCT);
    expect(burn.state).toBe("ok");
  });

  it("stays quiet early, when the ratio means nothing yet", () => {
    // 2h against 40h is 5% consumed and 0% done — 'ahead of the work' by arithmetic
    // and nothing at all in reality.
    const burn = computeBurn({ estimateHours: 40, actualSeconds: hours(2), completedPct: 0 });
    expect(burn.consumedPct).toBeLessThan(OFF_TRACK_MIN_CONSUMED_PCT);
    expect(burn.state).toBe("ok");
  });

  it("is never hot once the work is finished — that overrun is history", () => {
    const burn = computeBurn({ estimateHours: 10, actualSeconds: hours(12), completedPct: 100 });
    expect(burn.consumedPct).toBe(120);
    expect(burn.aheadByPct).toBe(20);
    expect(burn.state).toBe("ok");
  });

  it("clamps a completed percent that arrives out of range", () => {
    expect(
      computeBurn({ estimateHours: 10, actualSeconds: hours(1), completedPct: 140 }).completedPct
    ).toBe(100);
  });
});

describe("computeProjectBurn", () => {
  const phase = (
    id: string,
    estimateHours: number | null,
    actualH: number,
    completedPct: number
  ) => ({
    phaseId: id,
    phaseName: id,
    estimateHours,
    actualSeconds: hours(actualH),
    completedPct,
  });

  it("weights project progress by estimate, not by phase count", () => {
    // A 40h phase finishing is not the same event as a 2h one finishing.
    const project = computeProjectBurn([phase("big", 40, 0, 0), phase("small", 2, 0, 100)]);
    expect(project.total.completedPct).toBeLessThan(10);
  });

  it("counts an unestimated phase's hours against the project total", () => {
    // Excluding them would flatter the project by hiding real time.
    const project = computeProjectBurn([phase("planned", 10, 5, 50), phase("stray", null, 5, 0)]);
    expect(project.total.actualHours).toBe(10);
    expect(project.total.estimateHours).toBe(10);
    expect(project.total.consumedPct).toBe(100);
  });

  it("has no project total until something is estimated", () => {
    const project = computeProjectBurn([phase("a", null, 3, 0), phase("b", null, 4, 0)]);
    expect(project.total.state).toBe("unplanned");
    expect(project.estimatedPhaseCount).toBe(0);
  });

  it("counts the hot phases", () => {
    const project = computeProjectBurn([phase("hot", 10, 9, 20), phase("fine", 10, 5, 50)]);
    expect(project.hotPhaseCount).toBe(1);
    expect(project.phases.find((p) => p.phaseId === "hot")!.burn.state).toBe("hot");
  });

  it("handles a project with no phases at all", () => {
    const project = computeProjectBurn([]);
    expect(project.total.state).toBe("unplanned");
    expect(project.total.actualHours).toBe(0);
    expect(project.hotPhaseCount).toBe(0);
  });
});

describe("effectiveRateCents", () => {
  it("divides the fee by the hours actually spent", () => {
    expect(effectiveRateCents(500_000, hours(50))).toBe(10_000); // $5000 / 50h = $100/hr
  });

  it("is null before any time is logged — not infinity", () => {
    expect(effectiveRateCents(500_000, 0)).toBeNull();
  });
});

describe("fixedFeeHealth", () => {
  it("knows when the fee has dropped through the floor", () => {
    const health = fixedFeeHealth({
      feeAmountCents: 500_000,
      targetRateFloorCents: 12_000,
      actualSeconds: hours(50),
    });
    expect(health.effectiveRateCents).toBe(10_000);
    expect(health.belowFloor).toBe(true);
  });

  it("reports the hours left before it does — the number worth acting on", () => {
    const health = fixedFeeHealth({
      feeAmountCents: 500_000,
      targetRateFloorCents: 10_000,
      actualSeconds: hours(39),
    });
    expect(health.hoursUntilFloor).toBe(11);
    expect(health.belowFloor).toBe(false);
  });

  it("floors at zero rather than reporting negative headroom", () => {
    const health = fixedFeeHealth({
      feeAmountCents: 500_000,
      targetRateFloorCents: 10_000,
      actualSeconds: hours(80),
    });
    expect(health.hoursUntilFloor).toBe(0);
  });

  it("says nothing when no fee or floor has been set", () => {
    const health = fixedFeeHealth({
      feeAmountCents: null,
      targetRateFloorCents: null,
      actualSeconds: hours(10),
    });
    expect(health.effectiveRateCents).toBeNull();
    expect(health.belowFloor).toBe(false);
    expect(health.hoursUntilFloor).toBeNull();
  });
});

describe("describeBurn", () => {
  const hot = computeBurn({ estimateHours: 10, actualSeconds: hours(8), completedPct: 40 });

  it("says nothing at all when the project is fine", () => {
    const ok = computeBurn({ estimateHours: 10, actualSeconds: hours(4), completedPct: 50 });
    expect(describeBurn(ok, "hourly")).toBeNull();
  });

  it("frames hourly overrun as revenue that will land over", () => {
    expect(describeBurn(hot, "hourly")).toContain("billable");
  });

  it("frames fixed-fee overrun as margin, not revenue", () => {
    const line = describeBurn(hot, "fixed_fee");
    expect(line).toContain("margin");
    expect(line).not.toContain("billable");
  });

  it("names the real rate once the fee is below the floor", () => {
    const line = describeBurn(hot, "fixed_fee", {
      effectiveRateCents: 8_000,
      targetRateFloorCents: 10_000,
      belowFloor: true,
      hoursUntilFloor: 0,
    });
    expect(line).toContain("$80/hr");
    expect(line).toContain("below your floor");
  });

  it("counts down the hours while there are still some left", () => {
    const line = describeBurn(hot, "fixed_fee", {
      effectiveRateCents: 12_000,
      targetRateFloorCents: 10_000,
      belowFloor: false,
      hoursUntilFloor: 11,
    });
    expect(line).toContain("11h");
  });
});
