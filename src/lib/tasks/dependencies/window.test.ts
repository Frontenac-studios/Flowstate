import { describe, expect, it } from "vitest";

import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";

import { endOfWindowWeek, isTaskInWindow } from "./window";

describe("endOfWindowWeek", () => {
  it("returns next Monday 00:00 for a midweek day (UTC)", () => {
    // 2026-06-24 is a Wednesday.
    const out = endOfWindowWeek(new Date("2026-06-24T12:00:00Z"), 0);
    expect(out.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("gives a Sunday only until the next Monday (short-lived)", () => {
    // 2026-06-28 is a Sunday → still this ISO week, expires the next day.
    const out = endOfWindowWeek(new Date("2026-06-28T12:00:00Z"), 0);
    expect(out.toISOString()).toBe("2026-06-29T00:00:00.000Z");
  });

  it("gives a Monday a full week", () => {
    // 2026-06-29 is a Monday → expires the following Monday.
    const out = endOfWindowWeek(new Date("2026-06-29T09:00:00Z"), 0);
    expect(out.toISOString()).toBe("2026-07-06T00:00:00.000Z");
  });

  it("honors the creator's timezone offset (east of UTC shifts the instant earlier)", () => {
    // UTC+2: local Monday midnight is 22:00 UTC the previous (Sunday) day.
    const out = endOfWindowWeek(new Date("2026-06-24T12:00:00Z"), 120);
    expect(out.toISOString()).toBe("2026-06-28T22:00:00.000Z");
  });
});

describe("isTaskInWindow", () => {
  const now = new Date("2026-06-24T12:00:00Z");
  const task = (scheduledDate: string | null) => ({
    scheduledDate,
    bucketOverride: null,
    completedAt: null,
  });

  it("includes a task scheduled for today", () => {
    const todayIso = toISODateString(startOfLocalDay(now));
    expect(isTaskInWindow(task(todayIso), now)).toBe(true);
  });

  it("excludes a task scheduled far in the future", () => {
    expect(isTaskInWindow(task("2026-09-01"), now)).toBe(false);
  });
});
