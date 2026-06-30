import { describe, expect, it } from "vitest";

import {
  computeTimelineRange,
  defaultViewportTopMin,
  TIMELINE_VIEWPORT_MINUTES,
} from "./adaptive-window";

const DAY = { dayStartMin: 7 * 60, dayEndMin: 19 * 60 };

describe("computeTimelineRange", () => {
  it("spans the working hours when nothing else extends them", () => {
    const range = computeTimelineRange({ ...DAY, blocks: [], nowMin: 12 * 60 });
    expect(range).toEqual({ startMin: 7 * 60, endMin: 19 * 60 });
  });

  it("extends to an early block so out-of-hours work stays reachable", () => {
    // A 6:10am workout pulls the top up to (6:10 − 30min) → snapped to 5am.
    const range = computeTimelineRange({
      ...DAY,
      blocks: [{ startMin: 6 * 60 + 10, endMin: 6 * 60 + 40 }],
      nowMin: 12 * 60,
    });
    expect(range.startMin).toBe(5 * 60);
    expect(range.endMin).toBe(19 * 60);
  });

  it("extends to a late block, snapped out to the whole hour", () => {
    const range = computeTimelineRange({
      ...DAY,
      blocks: [{ startMin: 22 * 60, endMin: 23 * 60 }],
      nowMin: 12 * 60,
    });
    // 23:00 + 30min pad → 23:30 → ceil to the hour → 24:00.
    expect(range.endMin).toBe(24 * 60);
  });

  it("extends to now when now is past working hours", () => {
    const range = computeTimelineRange({ ...DAY, blocks: [], nowMin: 21 * 60 });
    expect(range.endMin).toBe(22 * 60); // 21:00 + 30min → snapped up to 22:00
  });

  it("never renders shorter than the viewport", () => {
    const range = computeTimelineRange({
      dayStartMin: 9 * 60,
      dayEndMin: 11 * 60,
      blocks: [],
      nowMin: 10 * 60,
    });
    expect(range.endMin - range.startMin).toBeGreaterThanOrEqual(TIMELINE_VIEWPORT_MINUTES);
  });

  it("clamps to the bounds of the day", () => {
    const range = computeTimelineRange({
      dayStartMin: 0,
      dayEndMin: 24 * 60,
      blocks: [{ startMin: 0, endMin: 30 }],
      nowMin: 23 * 60 + 59,
    });
    expect(range.startMin).toBe(0);
    expect(range.endMin).toBe(24 * 60);
  });
});

describe("defaultViewportTopMin", () => {
  it("parks now an hour from the top of the viewport", () => {
    const range = { startMin: 5 * 60, endMin: 22 * 60 };
    expect(defaultViewportTopMin(range, 12 * 60)).toBe(11 * 60); // 12:00 − 60min
  });

  it("does not scroll above the range top", () => {
    const range = { startMin: 7 * 60, endMin: 19 * 60 };
    // now is 7:20 — one hour before would be 6:20, clamped to the 7:00 top.
    expect(defaultViewportTopMin(range, 7 * 60 + 20)).toBe(7 * 60);
  });

  it("does not scroll past the last full viewport", () => {
    const range = { startMin: 7 * 60, endMin: 19 * 60 };
    // now near end: top can't exceed end − viewport (19:00 − 6h = 13:00).
    expect(defaultViewportTopMin(range, 18 * 60 + 30)).toBe(13 * 60);
  });

  it("falls back to the range top when there is no now", () => {
    const range = { startMin: 7 * 60, endMin: 19 * 60 };
    expect(defaultViewportTopMin(range, null)).toBe(7 * 60);
  });
});
