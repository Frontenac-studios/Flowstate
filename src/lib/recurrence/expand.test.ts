import { describe, expect, it } from "vitest";

import { expandOccurrences, nextOccurrence } from "./expand";
import type { OccurrenceOverrideInput } from "./types";

describe("expandOccurrences", () => {
  it("expands weekly BYDAY occurrences in a window", () => {
    const rows = expandOccurrences("FREQ=WEEKLY;BYDAY=TU", "2026-06-24", {
      start: "2026-06-23",
      end: "2026-07-05",
    });
    expect(rows.map((r) => r.displayDate)).toEqual(["2026-06-30"]);
  });

  it("expands daily across a week window", () => {
    const rows = expandOccurrences("FREQ=DAILY", "2026-06-23", {
      start: "2026-06-23",
      end: "2026-06-25",
    });
    expect(rows.map((r) => r.displayDate)).toEqual(["2026-06-23", "2026-06-24", "2026-06-25"]);
  });

  it("drops skipped overrides", () => {
    const overrides: OccurrenceOverrideInput[] = [
      {
        occurrenceDate: "2026-06-24",
        status: "skipped",
        movedToDate: null,
        patch: null,
        completedAt: null,
      },
    ];
    const rows = expandOccurrences(
      "FREQ=DAILY",
      "2026-06-23",
      { start: "2026-06-23", end: "2026-06-25" },
      overrides
    );
    expect(rows.map((r) => r.displayDate)).toEqual(["2026-06-23", "2026-06-25"]);
  });

  it("drops completed overrides", () => {
    const overrides: OccurrenceOverrideInput[] = [
      {
        occurrenceDate: "2026-06-24",
        status: "completed",
        movedToDate: null,
        patch: null,
        completedAt: new Date("2026-06-24T18:00:00"),
      },
    ];
    const rows = expandOccurrences(
      "FREQ=DAILY",
      "2026-06-23",
      { start: "2026-06-23", end: "2026-06-25" },
      overrides
    );
    expect(rows.map((r) => r.displayDate)).toEqual(["2026-06-23", "2026-06-25"]);
  });

  it("moves rescheduled occurrences to moved_to_date", () => {
    const overrides: OccurrenceOverrideInput[] = [
      {
        occurrenceDate: "2026-06-24",
        status: "rescheduled",
        movedToDate: "2026-06-26",
        patch: null,
        completedAt: null,
      },
    ];
    const rows = expandOccurrences(
      "FREQ=DAILY",
      "2026-06-23",
      { start: "2026-06-23", end: "2026-06-26" },
      overrides
    );
    expect(rows.map((r) => r.displayDate)).toEqual([
      "2026-06-23",
      "2026-06-25",
      "2026-06-26",
      "2026-06-26",
    ]);
  });

  it("applies edited patch on the occurrence row", () => {
    const overrides: OccurrenceOverrideInput[] = [
      {
        occurrenceDate: "2026-06-24",
        status: "edited",
        movedToDate: null,
        patch: { title: "Water plants (edited)" },
        completedAt: null,
      },
    ];
    const rows = expandOccurrences(
      "FREQ=DAILY",
      "2026-06-23",
      { start: "2026-06-23", end: "2026-06-25" },
      overrides
    );
    expect(rows.find((r) => r.occurrenceDate === "2026-06-24")?.patch).toEqual({
      title: "Water plants (edited)",
    });
  });

  it("respects UNTIL end in the rule", () => {
    const rows = expandOccurrences("FREQ=DAILY;UNTIL=20260624T120000", "2026-06-22", {
      start: "2026-06-22",
      end: "2026-06-26",
    });
    expect(rows.map((r) => r.displayDate)).toEqual(["2026-06-22", "2026-06-23"]);
  });
});

describe("nextOccurrence", () => {
  it("returns the next pending date on or after fromDate", () => {
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU", "2026-06-24", "2026-06-24", [])).toBe(
      "2026-06-30"
    );
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU", "2026-06-24", "2026-07-01", [])).toBe(
      "2026-07-07"
    );
  });

  it("skips completed dates", () => {
    const overrides: OccurrenceOverrideInput[] = [
      {
        occurrenceDate: "2026-06-30",
        status: "completed",
        movedToDate: null,
        patch: null,
        completedAt: new Date(),
      },
    ];
    expect(nextOccurrence("FREQ=WEEKLY;BYDAY=TU", "2026-06-24", "2026-06-24", overrides)).toBe(
      "2026-07-07"
    );
  });
});
