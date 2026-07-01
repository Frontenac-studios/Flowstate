import { describe, expect, it } from "vitest";

import {
  buildMonthCalendarGrid,
  daysInMonth,
  mockReservedDayDate,
  monthDateBounds,
  quarterForMonth,
} from "./month-calendar";

describe("month-calendar", () => {
  it("returns month date bounds", () => {
    expect(monthDateBounds(2026, 2)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("counts days in month", () => {
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 1)).toBe(31);
  });

  it("maps month to quarter", () => {
    expect(quarterForMonth(1)).toBe(1);
    expect(quarterForMonth(8)).toBe(3);
  });

  it("builds a Monday-start grid", () => {
    const grid = buildMonthCalendarGrid(2026, 6);
    expect(grid.some((c) => c.iso === "2026-06-01" && c.inMonth)).toBe(true);
    expect(grid.length % 7).toBe(0);
    // June 2026 starts on Monday — no leading padding cells
    expect(grid[0]?.iso).toBe("2026-06-01");
  });

  it("picks a mock reserved date avoiding taken slots", () => {
    const iso = mockReservedDayDate(2026, 6, "personal", new Set(["2026-06-07"]));
    expect(iso).toMatch(/^2026-06-/);
    expect(iso).not.toBe("2026-06-07");
  });
});
