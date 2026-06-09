import { describe, expect, it } from "vitest";

import { isExpiredTop3, isTop3ActiveForLocalDate } from "./top3-local-day";

/** US Pacific: client sends `-new Date().getTimezoneOffset()` (480 in PDT → -480). */
const TZ_LA = -480;

describe("isTop3ActiveForLocalDate", () => {
  it("returns true when pinned today", () => {
    expect(
      isTop3ActiveForLocalDate(
        {
          top3PinnedAt: new Date("2026-06-09T19:00:00.000Z"), // noon Pacific
          scheduledDate: "2026-06-08",
        },
        "2026-06-09",
        TZ_LA
      )
    ).toBe(true);
  });

  it("returns false when pinned yesterday", () => {
    expect(
      isTop3ActiveForLocalDate(
        {
          top3PinnedAt: new Date("2026-06-08T19:00:00.000Z"),
          scheduledDate: "2026-06-08",
        },
        "2026-06-09",
        TZ_LA
      )
    ).toBe(false);
  });

  it("falls back to scheduledDate when top3PinnedAt is null", () => {
    expect(
      isTop3ActiveForLocalDate(
        { top3PinnedAt: null, scheduledDate: "2026-06-09" },
        "2026-06-09",
        TZ_LA
      )
    ).toBe(true);

    expect(
      isTop3ActiveForLocalDate(
        { top3PinnedAt: null, scheduledDate: "2026-06-08" },
        "2026-06-09",
        TZ_LA
      )
    ).toBe(false);
  });

  it("isExpiredTop3 is the inverse", () => {
    const task = {
      top3PinnedAt: new Date("2026-06-08T19:00:00.000Z"),
      scheduledDate: "2026-06-08",
    };
    expect(isExpiredTop3(task, "2026-06-09", TZ_LA)).toBe(true);
    expect(isExpiredTop3(task, "2026-06-08", TZ_LA)).toBe(false);
  });
});
