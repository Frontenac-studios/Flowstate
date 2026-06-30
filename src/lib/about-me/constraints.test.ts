import { describe, expect, it } from "vitest";

import {
  constraintScheduleSchema,
  formatConstraintSchedule,
  formatMinutes,
  formatWeekdays,
} from "./constraints";

describe("formatWeekdays", () => {
  it("names common spans", () => {
    expect(formatWeekdays([1, 2, 3, 4, 5])).toBe("Weekdays");
    expect(formatWeekdays([6, 7])).toBe("Weekends");
    expect(formatWeekdays([1, 2, 3, 4, 5, 6, 7])).toBe("Every day");
  });

  it("collapses runs of 3+ into ranges, lists shorter ones", () => {
    expect(formatWeekdays([1, 2, 3])).toBe("Mon–Wed");
    expect(formatWeekdays([2, 4])).toBe("Tue, Thu");
    expect(formatWeekdays([1, 2, 5])).toBe("Mon, Tue, Fri");
  });

  it("dedupes and sorts", () => {
    expect(formatWeekdays([4, 2, 4])).toBe("Tue, Thu");
    expect(formatWeekdays([])).toBe("");
  });
});

describe("formatMinutes", () => {
  it("renders 12-hour am/pm", () => {
    expect(formatMinutes(480)).toBe("8:00am");
    expect(formatMinutes(15 * 60 + 45)).toBe("3:45pm");
    expect(formatMinutes(0)).toBe("12:00am");
    expect(formatMinutes(12 * 60)).toBe("12:00pm");
  });
});

describe("formatConstraintSchedule", () => {
  it("joins days and time", () => {
    expect(formatConstraintSchedule({ days: [1, 2, 3, 4, 5], startMin: 480, endMin: 1080 })).toBe(
      "Weekdays · 8:00am–6:00pm"
    );
  });

  it("handles days-only and empty", () => {
    expect(formatConstraintSchedule({ days: [2, 4] })).toBe("Tue, Thu");
    expect(formatConstraintSchedule(null)).toBe("");
  });
});

describe("constraintScheduleSchema", () => {
  it("rejects start after end", () => {
    expect(
      constraintScheduleSchema.safeParse({ days: [1], startMin: 600, endMin: 500 }).success
    ).toBe(false);
  });

  it("accepts days-only", () => {
    expect(constraintScheduleSchema.safeParse({ days: [1, 3, 5] }).success).toBe(true);
  });
});
