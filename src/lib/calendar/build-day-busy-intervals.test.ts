import { describe, expect, it } from "vitest";

import { buildDayBusyIntervals, sumBusyMinutes } from "./build-day-busy-intervals";

describe("buildDayBusyIntervals", () => {
  it("merges overlapping intervals", () => {
    const merged = buildDayBusyIntervals([
      { startMin: 9 * 60, endMin: 10 * 60 },
      { startMin: 9 * 60 + 30, endMin: 11 * 60 },
      { startMin: 14 * 60, endMin: 15 * 60 },
    ]);

    expect(merged).toEqual([
      { startMin: 9 * 60, endMin: 11 * 60 },
      { startMin: 14 * 60, endMin: 15 * 60 },
    ]);
  });

  it("clips intervals to the requested window", () => {
    const merged = buildDayBusyIntervals(
      [
        { startMin: 8 * 60, endMin: 10 * 60 },
        { startMin: 17 * 60, endMin: 19 * 60 },
      ],
      { fromMin: 9 * 60, toMin: 18 * 60 }
    );

    expect(merged).toEqual([
      { startMin: 9 * 60, endMin: 10 * 60 },
      { startMin: 17 * 60, endMin: 18 * 60 },
    ]);
  });

  it("drops intervals that fall entirely outside the window", () => {
    const merged = buildDayBusyIntervals([{ startMin: 6 * 60, endMin: 7 * 60 }], {
      fromMin: 9 * 60,
      toMin: 17 * 60,
    });

    expect(merged).toEqual([]);
  });
});

describe("sumBusyMinutes", () => {
  it("counts overlapping busy time once", () => {
    expect(
      sumBusyMinutes([
        { startMin: 9 * 60, endMin: 10 * 60 + 30 },
        { startMin: 10 * 60, endMin: 11 * 60 },
      ])
    ).toBe(120);
  });
});
