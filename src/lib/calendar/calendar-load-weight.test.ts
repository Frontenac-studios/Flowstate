import { describe, expect, it } from "vitest";

import {
  calendarLoadSummaryFromDayEvents,
  formatCalendarMeetingSummary,
} from "./calendar-load-weight";

describe("calendarLoadSummaryFromDayEvents", () => {
  it("weights timed busy hours and all-day events separately", () => {
    const summary = calendarLoadSummaryFromDayEvents([
      { isAllDay: false, startMin: 9 * 60, endMin: 10 * 60 + 30 },
      { isAllDay: false, startMin: 14 * 60, endMin: 15 * 60 },
      { isAllDay: true, startMin: 0, endMin: 1440 },
    ]);

    expect(summary.busyMinutes).toBe(150);
    expect(summary.timedEventCount).toBe(2);
    expect(summary.allDayEventCount).toBe(1);
    expect(summary.loadWeight).toBe(5);
  });
});

describe("formatCalendarMeetingSummary", () => {
  it("formats timed meeting counts and duration", () => {
    expect(formatCalendarMeetingSummary(3, 135)).toBe("3 meetings · 2h 15m");
  });

  it("returns null when there is no timed calendar busy", () => {
    expect(formatCalendarMeetingSummary(0, 0)).toBeNull();
  });
});
