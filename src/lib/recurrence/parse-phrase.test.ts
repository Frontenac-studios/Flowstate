import { describe, expect, it } from "vitest";

import { parseRecurrencePhrase } from "./parse-phrase";

describe("parseRecurrencePhrase", () => {
  it("parses daily", () => {
    expect(parseRecurrencePhrase("daily")).toEqual({ rrule: "FREQ=DAILY", label: "Daily" });
  });

  it("parses every weekday", () => {
    expect(parseRecurrencePhrase("every tue")).toEqual({
      rrule: "FREQ=WEEKLY;BYDAY=TU",
      label: "Every Tue",
    });
  });

  it("parses every other week", () => {
    expect(parseRecurrencePhrase("every other week")).toEqual({
      rrule: "FREQ=WEEKLY;INTERVAL=2",
      label: "Every other week",
    });
  });

  it("parses monthly on the Nth", () => {
    expect(parseRecurrencePhrase("monthly on the 1st")).toEqual({
      rrule: "FREQ=MONTHLY;BYMONTHDAY=1",
      label: "Monthly on the 1st",
    });
  });

  it("returns null for non-recurrence segments", () => {
    expect(parseRecurrencePhrase("tomorrow")).toBeNull();
    expect(parseRecurrencePhrase("relationships")).toBeNull();
  });
});
