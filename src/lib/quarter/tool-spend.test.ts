import { describe, expect, it } from "vitest";

import { computeToolSpend, type ExpenseRow } from "./tool-spend";

const rows: ExpenseRow[] = [
  { amountCents: 21_400, incurredOn: new Date("2026-07-05") }, // Q3
  { amountCents: 21_400, incurredOn: new Date("2026-08-05") }, // Q3
  { amountCents: 21_400, incurredOn: new Date("2026-09-05") }, // Q3
  { amountCents: 60_400, incurredOn: new Date("2026-05-05") }, // Q2 (prior)
  { amountCents: 99_900, incurredOn: new Date("2026-03-05") }, // Q1 (older)
];

describe("computeToolSpend", () => {
  it("sums this quarter and derives the monthly rate", () => {
    const s = computeToolSpend(rows, new Date("2026-08-20"));
    expect(s.thisQuarterCents).toBe(64_200);
    expect(s.perMonthCents).toBe(21_400);
  });

  it("compares against the prior quarter only", () => {
    const s = computeToolSpend(rows, new Date("2026-08-20"));
    expect(s.priorQuarterCents).toBe(60_400);
    expect(s.deltaCents).toBe(3_800); // 64,200 − 60,400
  });

  it("handles the year boundary (Q1's prior is last year's Q4)", () => {
    const yearEdge: ExpenseRow[] = [
      { amountCents: 5_000, incurredOn: new Date("2026-02-01") }, // Q1 2026
      { amountCents: 8_000, incurredOn: new Date("2025-11-01") }, // Q4 2025 (prior)
    ];
    const s = computeToolSpend(yearEdge, new Date("2026-02-15"));
    expect(s.thisQuarterCents).toBe(5_000);
    expect(s.priorQuarterCents).toBe(8_000);
    expect(s.deltaCents).toBe(-3_000);
  });

  it("is all zeros with no expenses", () => {
    const s = computeToolSpend([], new Date("2026-08-20"));
    expect(s).toEqual({
      thisQuarterCents: 0,
      priorQuarterCents: 0,
      perMonthCents: 0,
      deltaCents: 0,
    });
  });
});
