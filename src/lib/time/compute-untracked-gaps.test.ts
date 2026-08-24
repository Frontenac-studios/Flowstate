import { describe, expect, it } from "vitest";

import { computeUntrackedGaps } from "./compute-untracked-gaps";

// A fixed 9:00–17:00 window on an arbitrary day, in UTC ms for test simplicity.
const H = 3_600_000;
const DAY = Date.UTC(2026, 7, 24); // 2026-08-24 00:00 UTC
const start = DAY + 9 * H; // 09:00
const end = DAY + 17 * H; // 17:00
const at = (hour: number, min = 0) => new Date(DAY + hour * H + min * 60_000);

const base = {
  dayStartMs: start,
  dayEndMs: end,
  nowMs: end + H, // day is over
  minGapSeconds: 15 * 60,
};

describe("computeUntrackedGaps", () => {
  it("returns the whole window when nothing is logged", () => {
    const gaps = computeUntrackedGaps({ ...base, entries: [] });
    expect(gaps).toEqual([{ startedAt: new Date(start), endedAt: new Date(end) }]);
  });

  it("finds the gaps between logged entries", () => {
    const gaps = computeUntrackedGaps({
      ...base,
      entries: [
        { startedAt: at(9), endedAt: at(11) },
        { startedAt: at(13), endedAt: at(15) },
      ],
    });
    expect(gaps).toEqual([
      { startedAt: at(11), endedAt: at(13) }, // 11:00–13:00
      { startedAt: at(15), endedAt: new Date(end) }, // 15:00–17:00
    ]);
  });

  it("ignores gaps shorter than the threshold", () => {
    const gaps = computeUntrackedGaps({
      ...base,
      entries: [
        { startedAt: at(9), endedAt: at(11) },
        { startedAt: at(11, 10), endedAt: at(17) }, // only a 10-minute gap
      ],
    });
    expect(gaps).toEqual([]);
  });

  it("merges overlapping entries before finding gaps", () => {
    const gaps = computeUntrackedGaps({
      ...base,
      entries: [
        { startedAt: at(9), endedAt: at(12) },
        { startedAt: at(11), endedAt: at(13) }, // overlaps the first
      ],
    });
    expect(gaps).toEqual([{ startedAt: at(13), endedAt: new Date(end) }]);
  });

  it("caps the window at now and treats a running entry as covered to now", () => {
    const gaps = computeUntrackedGaps({
      ...base,
      nowMs: DAY + 14 * H, // it is 14:00; day not over
      entries: [{ startedAt: at(13), endedAt: null }], // running since 13:00
    });
    // Only 09:00–13:00 is an untracked gap; 13:00→14:00 is the running timer,
    // and nothing past 14:00 is proposed.
    expect(gaps).toEqual([{ startedAt: new Date(start), endedAt: at(13) }]);
  });

  it("returns nothing before the working day has started", () => {
    const gaps = computeUntrackedGaps({ ...base, nowMs: DAY + 8 * H, entries: [] });
    expect(gaps).toEqual([]);
  });
});
