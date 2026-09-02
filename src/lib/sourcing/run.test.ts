import { describe, expect, it } from "vitest";

import {
  addSpend,
  ageInDays,
  checkBudget,
  clampBatchSize,
  DECAY_FLOOR,
  decideRun,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MONTHLY_CEILING_CENTS,
  formatSpend,
  isoWeekKey,
  isRunDay,
  monthlyCeilingCents,
  remainingCapacity,
  rolloverDecay,
  spendToCents,
  usdToSpend,
} from "./run";

describe("isoWeekKey", () => {
  it("keys a week", () => {
    expect(isoWeekKey(new Date("2026-09-02T12:00:00"))).toBe("2026-W36");
  });

  it("gives every day of one week the same key", () => {
    const keys = [
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
      "2026-09-06",
    ].map((d) => isoWeekKey(new Date(`${d}T12:00:00`)));
    expect(new Set(keys).size).toBe(1);
  });

  it("puts a turn-of-year week in the year its Thursday falls in", () => {
    // 2027-01-01 is a Friday; ISO puts it in 2026-W53.
    expect(isoWeekKey(new Date("2027-01-01T12:00:00"))).toBe("2026-W53");
  });
});

describe("isRunDay", () => {
  it("is Tuesday", () => {
    expect(isRunDay(new Date("2026-09-01T09:00:00"))).toBe(true); // Tue
    expect(isRunDay(new Date("2026-09-02T09:00:00"))).toBe(false); // Wed
  });
});

describe("decideRun", () => {
  const tuesday = new Date("2026-09-01T09:00:00");
  const wednesday = new Date("2026-09-02T09:00:00");

  it("starts a run on the run day when none has run this week", () => {
    expect(
      decideRun({ now: tuesday, enabled: true, hasUnfinishedRun: false, weekKeysAlreadyRun: [] })
    ).toEqual({ action: "start", weekKey: "2026-W36" });
  });

  it("does not start a second run the same week", () => {
    expect(
      decideRun({
        now: tuesday,
        enabled: true,
        hasUnfinishedRun: false,
        weekKeysAlreadyRun: ["2026-W36"],
      })
    ).toEqual({ action: "idle", reason: "already-ran" });
  });

  it("finishes an unfinished run on a day it would never start one", () => {
    expect(
      decideRun({ now: wednesday, enabled: true, hasUnfinishedRun: true, weekKeysAlreadyRun: [] })
    ).toEqual({ action: "resume" });
  });

  it("resumes even when sourcing has since been switched off", () => {
    // Turning the feature off must not strand a batch mid-flight, half its prospects
    // researched and paid for and the rest invisible.
    expect(
      decideRun({ now: wednesday, enabled: false, hasUnfinishedRun: true, weekKeysAlreadyRun: [] })
    ).toEqual({ action: "resume" });
  });

  it("does nothing when disabled", () => {
    expect(
      decideRun({ now: tuesday, enabled: false, hasUnfinishedRun: false, weekKeysAlreadyRun: [] })
    ).toEqual({ action: "idle", reason: "disabled" });
  });

  it("does nothing on other days", () => {
    expect(
      decideRun({ now: wednesday, enabled: true, hasUnfinishedRun: false, weekKeysAlreadyRun: [] })
    ).toEqual({ action: "idle", reason: "not-run-day" });
  });
});

describe("clampBatchSize", () => {
  it("holds the plan's 3-10 band", () => {
    expect(clampBatchSize(1)).toBe(3);
    expect(clampBatchSize(50)).toBe(10);
    expect(clampBatchSize(7)).toBe(7);
  });

  it("falls back to the default for nonsense", () => {
    expect(clampBatchSize(null)).toBe(DEFAULT_BATCH_SIZE);
    expect(clampBatchSize(Number.NaN)).toBe(DEFAULT_BATCH_SIZE);
  });
});

describe("spend arithmetic", () => {
  it("keeps a sub-cent call from rounding away to nothing", () => {
    const tiny = usdToSpend(0.0004); // 0.04 cents
    expect(tiny.cents).toBe(0);
    expect(tiny.micros).toBeGreaterThan(0);
    expect(spendToCents(tiny)).toBeCloseTo(0.04, 5);
  });

  it("accumulates many small calls into real cents", () => {
    let total = { cents: 0, micros: 0 };
    for (let i = 0; i < 100; i++) total = addSpend(total, usdToSpend(0.0004));
    expect(spendToCents(total)).toBeCloseTo(4, 5);
  });

  it("records a research call at its real charge", () => {
    // The measured cost of one W10h research call.
    expect(spendToCents(usdToSpend(0.039826))).toBeCloseTo(3.9826, 4);
  });

  it("ignores a missing or negative charge", () => {
    expect(usdToSpend(Number.NaN)).toEqual({ cents: 0, micros: 0 });
    expect(usdToSpend(-1)).toEqual({ cents: 0, micros: 0 });
  });

  it("formats small spends in cents and larger ones in dollars", () => {
    expect(formatSpend(usdToSpend(0.25))).toBe("25.0¢");
    expect(formatSpend(usdToSpend(4.2))).toBe("$4.20");
  });
});

describe("checkBudget", () => {
  it("allows a run under the ceiling", () => {
    expect(checkBudget({ spentLast30DaysCents: 120, ceilingCents: 1000 })).toEqual({
      allowed: true,
    });
  });

  it("stops at the ceiling", () => {
    const verdict = checkBudget({ spentLast30DaysCents: 1000, ceilingCents: 1000 });
    expect(verdict.allowed).toBe(false);
    expect(verdict).toMatchObject({ reason: "ceiling", spentCents: 1000 });
  });
});

describe("monthlyCeilingCents", () => {
  it("defaults when unset", () => {
    expect(monthlyCeilingCents({})).toBe(DEFAULT_MONTHLY_CEILING_CENTS);
  });

  it("honours an override", () => {
    expect(monthlyCeilingCents({ SOURCING_MONTHLY_CEILING_CENTS: "250" })).toBe(250);
  });

  it("ignores a malformed override rather than disabling the rail", () => {
    expect(monthlyCeilingCents({ SOURCING_MONTHLY_CEILING_CENTS: "abc" })).toBe(
      DEFAULT_MONTHLY_CEILING_CENTS
    );
  });

  it("allows an explicit zero — a full stop", () => {
    expect(monthlyCeilingCents({ SOURCING_MONTHLY_CEILING_CENTS: "0" })).toBe(0);
  });
});

describe("remainingCapacity", () => {
  it("fits what the clock allows", () => {
    expect(remainingCapacity({ elapsedMs: 0 })).toBe(2);
    expect(remainingCapacity({ elapsedMs: 160_000 })).toBe(0);
  });

  it("never returns a negative", () => {
    expect(remainingCapacity({ elapsedMs: 999_999 })).toBe(0);
  });
});

describe("rolloverDecay", () => {
  it("leaves a fresh prospect at full weight", () => {
    expect(rolloverDecay(0)).toBe(1);
    expect(rolloverDecay(14)).toBe(1);
  });

  it("slips 10% a week after the grace period", () => {
    expect(rolloverDecay(21)).toBeCloseTo(0.9, 5);
    expect(rolloverDecay(28)).toBeCloseTo(0.8, 5);
  });

  it("floors at half — a stale prospect fades, it never becomes worthless", () => {
    expect(rolloverDecay(365)).toBe(DECAY_FLOOR);
  });
});

describe("ageInDays", () => {
  it("counts whole days and never goes negative", () => {
    const now = new Date("2026-09-02T12:00:00Z");
    expect(ageInDays(new Date("2026-08-30T12:00:00Z"), now)).toBe(3);
    expect(ageInDays(new Date("2026-09-05T12:00:00Z"), now)).toBe(0);
  });
});
