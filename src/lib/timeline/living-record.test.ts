import { describe, expect, it } from "vitest";

import { largestOpenGap, nextOpenSlotMin, openGaps } from "./living-record";

describe("openGaps", () => {
  it("returns the whole window when nothing is busy", () => {
    expect(openGaps([], 7 * 60, 19 * 60)).toEqual([{ startMin: 7 * 60, endMin: 19 * 60 }]);
  });

  it("returns gaps around a single block", () => {
    const gaps = openGaps([{ startMin: 9 * 60, endMin: 10 * 60 }], 8 * 60, 12 * 60);
    expect(gaps).toEqual([
      { startMin: 8 * 60, endMin: 9 * 60 },
      { startMin: 10 * 60, endMin: 12 * 60 },
    ]);
  });

  it("merges overlapping and back-to-back busy intervals", () => {
    const gaps = openGaps(
      [
        { startMin: 9 * 60, endMin: 10 * 60 },
        { startMin: 9 * 60 + 30, endMin: 11 * 60 },
        { startMin: 11 * 60, endMin: 12 * 60 },
      ],
      8 * 60,
      13 * 60
    );
    expect(gaps).toEqual([
      { startMin: 8 * 60, endMin: 9 * 60 },
      { startMin: 12 * 60, endMin: 13 * 60 },
    ]);
  });

  it("clips busy intervals to the window", () => {
    const gaps = openGaps([{ startMin: 6 * 60, endMin: 8 * 60 }], 7 * 60, 12 * 60);
    expect(gaps).toEqual([{ startMin: 8 * 60, endMin: 12 * 60 }]);
  });
});

describe("largestOpenGap", () => {
  it("picks the roomiest qualifying gap", () => {
    const busy = [
      { startMin: 9 * 60, endMin: 9 * 60 + 30 },
      { startMin: 11 * 60, endMin: 11 * 60 + 15 },
    ];
    expect(largestOpenGap(busy, 8 * 60, 13 * 60, 30)).toEqual({
      startMin: 11 * 60 + 15,
      endMin: 13 * 60,
    });
  });

  it("returns null when no gap is long enough", () => {
    const busy = [{ startMin: 9 * 60, endMin: 11 * 60 }];
    expect(largestOpenGap(busy, 9 * 60, 11 * 60, 30)).toBeNull();
  });
});

describe("nextOpenSlotMin", () => {
  it("snaps now up to the grid when the rest of the day is open", () => {
    expect(nextOpenSlotMin([], 9 * 60 + 7, 19 * 60, 45)).toBe(9 * 60 + 15);
  });

  it("skips past a block that occupies the next slot", () => {
    const busy = [{ startMin: 9 * 60, endMin: 10 * 60 }];
    expect(nextOpenSlotMin(busy, 9 * 60 + 10, 19 * 60, 45)).toBe(10 * 60);
  });

  it("returns null when nothing fits before the end of the day", () => {
    const busy = [{ startMin: 9 * 60, endMin: 18 * 60 + 45 }];
    expect(nextOpenSlotMin(busy, 9 * 60, 19 * 60, 45)).toBeNull();
  });
});
