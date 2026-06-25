import { describe, expect, it } from "vitest";

import { localWeekUtcBounds } from "./local-week-bounds";

describe("localWeekUtcBounds", () => {
  // UTC (offset 0) keeps the arithmetic legible.
  it("anchors to Monday 00:00 for a midweek instant (UTC)", () => {
    // Wed 2026-06-24T15:00Z → week is Mon 2026-06-22 … Mon 2026-06-29.
    const { start, end } = localWeekUtcBounds(new Date("2026-06-24T15:00:00Z"), 0);
    expect(start.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("treats Sunday as the last day of the same week, not the first", () => {
    // Sun 2026-06-28 belongs to the Mon 2026-06-22 week.
    const { start, end } = localWeekUtcBounds(new Date("2026-06-28T23:30:00Z"), 0);
    expect(start.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("includes Monday 00:00 itself in the week it starts", () => {
    const { start, end } = localWeekUtcBounds(new Date("2026-06-22T00:00:00Z"), 0);
    expect(start.toISOString()).toBe("2026-06-22T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("spans exactly 7 days", () => {
    const { start, end } = localWeekUtcBounds(new Date("2026-06-24T15:00:00Z"), 0);
    expect(end.getTime() - start.getTime()).toBe(7 * 86_400_000);
  });

  it("respects a positive tz offset (east of UTC)", () => {
    // +600 (e.g. AEST). Mon 06:00 UTC == Mon 16:00 local → still Monday's week.
    const { start } = localWeekUtcBounds(new Date("2026-06-22T06:00:00Z"), 600);
    // Local Monday midnight is 2026-06-22T00:00 +10h == 2026-06-21T14:00Z.
    expect(start.toISOString()).toBe("2026-06-21T14:00:00.000Z");
  });

  it("respects a negative tz offset crossing a day boundary", () => {
    // -300 (e.g. US Eastern). Mon 03:00 UTC == Sun 22:00 local → previous week.
    const { start, end } = localWeekUtcBounds(new Date("2026-06-22T03:00:00Z"), -300);
    // Local time is Sun 2026-06-21 22:00, so the week is Mon 06-15 … Mon 06-22.
    expect(start.toISOString()).toBe("2026-06-15T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-06-22T05:00:00.000Z");
  });
});
