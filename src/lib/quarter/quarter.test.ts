import { describe, expect, it } from "vitest";

import { routeComposerInput } from "./parse-composer";
import {
  daysLeftInQuarter,
  isQuarterClosing,
  quarterLabel,
  quarterMonthSpan,
  quarterOf,
} from "./quarter-period";

describe("quarterOf", () => {
  it("places a date in its calendar quarter with the right bounds", () => {
    const q = quarterOf(new Date("2026-08-15T12:00:00"));
    expect(q.year).toBe(2026);
    expect(q.quarter).toBe(3);
    expect(q.start.getMonth()).toBe(6); // July
    expect(q.end.getMonth()).toBe(9); // October (exclusive)
    expect(quarterLabel(q)).toBe("Q3 2026");
    expect(quarterMonthSpan(q)).toBe("Jul–Sep");
  });

  it("handles the year boundary (Q4 → Q1)", () => {
    expect(quarterOf(new Date("2026-01-01T00:00:00")).quarter).toBe(1);
    expect(quarterOf(new Date("2026-12-31T23:00:00")).quarter).toBe(4);
  });
});

describe("daysLeftInQuarter / isQuarterClosing", () => {
  const q = quarterOf(new Date("2026-08-15T00:00:00"));

  it("counts down to the last day", () => {
    expect(daysLeftInQuarter(q, new Date("2026-09-30T09:00:00"))).toBe(0);
    expect(daysLeftInQuarter(q, new Date("2026-09-28T00:00:00"))).toBe(2);
  });

  it("flags the closing window in the last week", () => {
    expect(isQuarterClosing(q, new Date("2026-08-15T00:00:00"))).toBe(false);
    expect(isQuarterClosing(q, new Date("2026-09-27T00:00:00"))).toBe(true);
  });
});

describe("routeComposerInput", () => {
  it("routes a currency amount to a currency target (cents)", () => {
    expect(routeComposerInput("$40k booked by September")).toEqual({
      kind: "target",
      title: "$40k booked by September",
      measureKind: "currency",
      measureTarget: 4_000_000,
    });
    expect(routeComposerInput("$1,500 MRR")).toMatchObject({
      measureKind: "currency",
      measureTarget: 150_000,
    });
  });

  it("routes a bare number to a count target", () => {
    expect(routeComposerInput("Sign 3 new clients")).toEqual({
      kind: "target",
      title: "Sign 3 new clients",
      measureKind: "count",
      measureTarget: 3,
    });
  });

  it("routes prose with no number to a Direction", () => {
    expect(routeComposerInput("We serve early-stage teams shipping production software")).toEqual({
      kind: "direction",
      statement: "We serve early-stage teams shipping production software",
    });
  });

  it("returns null for empty input", () => {
    expect(routeComposerInput("   ")).toBeNull();
  });
});
