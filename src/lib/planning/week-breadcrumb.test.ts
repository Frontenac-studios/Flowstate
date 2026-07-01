import { describe, expect, it } from "vitest";

import {
  deriveIsoWeekForBreadcrumb,
  isoWeekNumber,
  mondayFromIsoWeek,
  resolveWeekAnchorDate,
  weekDatesForBreadcrumb,
} from "./week-breadcrumb";

describe("week-breadcrumb", () => {
  const wedAug2026 = new Date(2026, 7, 19);

  it("computes ISO week number", () => {
    expect(isoWeekNumber(new Date(2026, 7, 19))).toBe(34);
  });

  it("resolves Monday from isoWeek segment", () => {
    expect(mondayFromIsoWeek(2026, 34)).toEqual(new Date(2026, 7, 17));
    expect(resolveWeekAnchorDate({ year: 2026, quarter: 3, month: 8, isoWeek: 34 })).toBe(
      "2026-08-17"
    );
  });

  it("derives current week when month matches now", () => {
    expect(resolveWeekAnchorDate({ year: 2026, quarter: 3, month: 8 }, wedAug2026)).toBe(
      "2026-08-17"
    );
  });

  it("derives mid-month week for other months", () => {
    expect(resolveWeekAnchorDate({ year: 2026, quarter: 1, month: 3 })).toBe("2026-03-09");
  });

  it("derives isoWeek for breadcrumb without explicit segment", () => {
    expect(deriveIsoWeekForBreadcrumb({ year: 2026, month: 8 }, wedAug2026)).toBe(34);
  });

  it("lists seven dates for scoped week", () => {
    const dates = weekDatesForBreadcrumb(
      { year: 2026, quarter: 3, month: 8, isoWeek: 34 },
      wedAug2026
    );
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-08-17");
    expect(dates[6]).toBe("2026-08-23");
  });
});
