import { describe, expect, it } from "vitest";

import { formatMeetingTooltipLines } from "./meeting-tooltip";

function event(overrides: Partial<Parameters<typeof formatMeetingTooltipLines>[0][number]>) {
  return {
    title: "Design sync",
    startMin: 9 * 60,
    endMin: 9 * 60 + 30,
    isAllDay: false,
    ...overrides,
  };
}

describe("formatMeetingTooltipLines", () => {
  it("formats a timed event as a time-first agenda line", () => {
    const lines = formatMeetingTooltipLines([event({})]);
    expect(lines).toHaveLength(1);
    expect(lines[0]!.timeLabel).toBe("9:00a – 9:30a");
    expect(lines[0]!.title).toBe("Design sync");
  });

  it("sorts by start time, then end time", () => {
    const lines = formatMeetingTooltipLines([
      event({ title: "Late", startMin: 14 * 60, endMin: 14 * 60 + 30 }),
      event({ title: "Early", startMin: 8 * 60, endMin: 8 * 60 + 30 }),
      event({ title: "Early long", startMin: 8 * 60, endMin: 9 * 60 }),
    ]);
    expect(lines.map((l) => l.title)).toEqual(["Early", "Early long", "Late"]);
  });

  it("excludes all-day events", () => {
    const lines = formatMeetingTooltipLines([
      event({ title: "Focus day", isAllDay: true }),
      event({ title: "Standup" }),
    ]);
    expect(lines.map((l) => l.title)).toEqual(["Standup"]);
  });

  it("labels private (null or blank title) events as Busy", () => {
    const lines = formatMeetingTooltipLines([
      event({ title: null }),
      event({ title: "  ", startMin: 10 * 60, endMin: 10 * 60 + 15 }),
    ]);
    expect(lines.map((l) => l.title)).toEqual(["Busy", "Busy"]);
  });

  it("crosses noon with a/p markers", () => {
    const lines = formatMeetingTooltipLines([event({ startMin: 11 * 60 + 30, endMin: 13 * 60 })]);
    expect(lines[0]!.timeLabel).toBe("11:30a – 1:00p");
  });

  it("returns no lines when every event is all-day", () => {
    expect(formatMeetingTooltipLines([event({ isAllDay: true })])).toEqual([]);
  });
});
