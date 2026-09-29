import { describe, expect, it } from "vitest";

import { formatDuePill } from "./format-due-pill";

// Monday 2026-09-28, local noon (avoids DST/midnight edges).
const TODAY = new Date(2026, 8, 28, 12);

describe("formatDuePill", () => {
  it("returns null without a date", () => {
    expect(formatDuePill(null, TODAY)).toBeNull();
  });

  it("marks overdue with the weekday inside a week, the date beyond", () => {
    expect(formatDuePill("2026-09-25", TODAY)).toEqual({ text: "Fri", tone: "overdue" });
    expect(formatDuePill("2026-09-03", TODAY)).toEqual({ text: "Sep 3", tone: "overdue" });
  });

  it("marks today", () => {
    expect(formatDuePill("2026-09-28", TODAY)).toEqual({ text: "Today", tone: "today" });
  });

  it("keeps future dates muted", () => {
    expect(formatDuePill("2026-09-29", TODAY)).toEqual({ text: "Tomorrow", tone: "muted" });
    expect(formatDuePill("2026-10-01", TODAY)).toEqual({ text: "Thu", tone: "muted" });
    expect(formatDuePill("2026-10-20", TODAY)).toEqual({ text: "Oct 20", tone: "muted" });
  });
});
