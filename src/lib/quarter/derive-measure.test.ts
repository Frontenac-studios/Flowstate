import { describe, expect, it } from "vitest";

import {
  deriveTargetCurrent,
  isTargetMet,
  measureProgress,
  type MeasureSources,
} from "./derive-measure";

const period = { periodStart: new Date("2026-07-01"), periodEnd: new Date("2026-10-01") };

const sources: MeasureSources = {
  invoices: [
    { amountCents: 1_500_000, bookedAt: new Date("2026-08-10") },
    { amountCents: 2_000_000, bookedAt: new Date("2026-09-20") },
    { amountCents: 999_999, bookedAt: new Date("2026-06-30") }, // before period
    { amountCents: 500_000, bookedAt: new Date("2026-10-02") }, // after period
  ],
  clients: [
    { signedAt: new Date("2026-07-15") },
    { signedAt: new Date("2026-09-01") },
    { signedAt: new Date("2026-05-01") }, // before period
  ],
  shippedPhases: [
    { targetId: "t1", completedAt: new Date("2026-08-01") },
    { targetId: "t1", completedAt: new Date("2026-09-01") },
    { targetId: "t2", completedAt: new Date("2026-08-01") }, // other target
    { targetId: "t1", completedAt: new Date("2026-06-01") }, // before period
  ],
};

describe("deriveTargetCurrent", () => {
  it("sums booked cents in the period only", () => {
    expect(
      deriveTargetCurrent({ id: "t1", derivationKey: "money_booked", ...period }, sources)
    ).toBe(3_500_000);
  });

  it("counts clients signed in the period only", () => {
    expect(
      deriveTargetCurrent({ id: "t1", derivationKey: "clients_signed", ...period }, sources)
    ).toBe(2);
  });

  it("counts shipped phases for this target in the period only", () => {
    expect(
      deriveTargetCurrent({ id: "t1", derivationKey: "milestones_shipped", ...period }, sources)
    ).toBe(2);
  });
});

describe("isTargetMet / measureProgress", () => {
  it("is met at or beyond target", () => {
    expect(isTargetMet(3_500_000, 4_000_000)).toBe(false);
    expect(isTargetMet(4_000_000, 4_000_000)).toBe(true);
  });

  it("clamps progress to 0..1", () => {
    expect(measureProgress(2, 4)).toBe(0.5);
    expect(measureProgress(5, 4)).toBe(1);
    expect(measureProgress(1, 0)).toBe(1); // boolean/shipped
  });
});
