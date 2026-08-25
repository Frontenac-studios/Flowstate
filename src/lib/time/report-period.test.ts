import { describe, expect, it } from "vitest";

import { resolveReportPeriod } from "./report-period";

// Fixed reference: Wed 2026-08-19, tz = UTC for arithmetic clarity.
const now = new Date("2026-08-19T12:00:00Z");

describe("resolveReportPeriod", () => {
  it("this_month spans the calendar month", () => {
    const { start, end } = resolveReportPeriod("this_month", now, 0);
    expect(start.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("last_month spans the previous calendar month", () => {
    const { start, end } = resolveReportPeriod("last_month", now, 0);
    expect(start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-08-01T00:00:00.000Z");
  });

  it("this_week and last_week are seven-day windows that abut", () => {
    const thisWeek = resolveReportPeriod("this_week", now, 0);
    const lastWeek = resolveReportPeriod("last_week", now, 0);
    expect(lastWeek.end.getTime()).toBe(thisWeek.start.getTime());
    expect(thisWeek.end.getTime() - thisWeek.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(lastWeek.end.getTime() - lastWeek.start.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });
});
