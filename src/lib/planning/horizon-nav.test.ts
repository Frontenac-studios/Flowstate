import { describe, expect, it } from "vitest";

import {
  horizonForBreadcrumb,
  trimBreadcrumbForHorizon,
  zoomToMonth,
  zoomToQuarter,
  zoomToWeek,
  zoomToYear,
} from "./horizon-nav";

describe("horizon-nav", () => {
  it("derives horizon from deepest breadcrumb segment", () => {
    expect(horizonForBreadcrumb({ year: 2026 })).toBe("year");
    expect(horizonForBreadcrumb({ year: 2026, quarter: 2 })).toBe("quarter");
    expect(horizonForBreadcrumb({ year: 2026, quarter: 2, month: 8 })).toBe("month");
    expect(horizonForBreadcrumb({ year: 2026, quarter: 2, month: 8, isoWeek: 34 })).toBe("week");
  });

  it("builds zoom breadcrumbs", () => {
    expect(zoomToYear(2026)).toEqual({ year: 2026 });
    expect(zoomToQuarter(2026, 3)).toEqual({ year: 2026, quarter: 3 });
    expect(zoomToMonth(2026, 2, 5)).toEqual({ year: 2026, quarter: 2, month: 5 });
    expect(zoomToWeek(2026, 3, 8, 34)).toEqual({ year: 2026, quarter: 3, month: 8, isoWeek: 34 });
  });

  it("trims breadcrumb to selected horizon depth", () => {
    const full = { year: 2026, quarter: 2, month: 8, isoWeek: 34 };
    expect(trimBreadcrumbForHorizon(full, "year")).toEqual({ year: 2026 });
    expect(trimBreadcrumbForHorizon(full, "quarter")).toEqual({ year: 2026, quarter: 2 });
    expect(trimBreadcrumbForHorizon(full, "month")).toEqual({
      year: 2026,
      quarter: 2,
      month: 8,
    });
    expect(trimBreadcrumbForHorizon(full, "week")).toEqual(full);
  });
});
