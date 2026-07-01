import { describe, expect, it } from "vitest";

import { expandOccurrences } from "./expand";
import type { OccurrenceOverrideInput } from "./types";
import {
  defaultRepeatPickerState,
  parseRruleToPickerState,
  serializePickerStateToRrule,
} from "./picker";

describe("repeat picker serialization", () => {
  it("round-trips a weekly BYDAY rule", () => {
    const startDate = "2026-06-24";
    const rrule = "FREQ=WEEKLY;BYDAY=TU";
    const state = parseRruleToPickerState(rrule, startDate);
    expect(serializePickerStateToRrule(state, startDate)).toBe(rrule);
  });

  it("serializes daily with interval", () => {
    const startDate = "2026-06-24";
    const state = {
      ...defaultRepeatPickerState(startDate),
      frequency: "DAILY" as const,
      interval: 3,
      ends: { kind: "never" as const },
    };
    expect(serializePickerStateToRrule(state, startDate)).toBe("FREQ=DAILY;INTERVAL=3");
  });

  it("serializes weekly with COUNT end", () => {
    const startDate = "2026-06-24";
    const state = {
      ...defaultRepeatPickerState(startDate),
      frequency: "WEEKLY" as const,
      byWeekday: ["MO", "WE", "FR"] as Array<"MO" | "WE" | "FR">,
      ends: { kind: "count" as const, count: 10 },
    };
    expect(serializePickerStateToRrule(state, startDate)).toBe(
      "FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=10"
    );
  });

  it("serializes monthly with UNTIL end", () => {
    const startDate = "2026-06-24";
    const state = {
      ...defaultRepeatPickerState(startDate),
      frequency: "MONTHLY" as const,
      monthDay: 15,
      ends: { kind: "until" as const, until: "2026-12-31" },
    };
    expect(serializePickerStateToRrule(state, startDate)).toBe(
      "FREQ=MONTHLY;BYMONTHDAY=15;UNTIL=20261231T120000"
    );
  });

  it("parses COUNT and UNTIL ends from stored rules", () => {
    const startDate = "2026-06-24";
    expect(parseRruleToPickerState("FREQ=DAILY;COUNT=5", startDate).ends).toEqual({
      kind: "count",
      count: 5,
    });
    expect(parseRruleToPickerState("FREQ=DAILY;UNTIL=20260630T120000", startDate).ends).toEqual({
      kind: "until",
      until: "2026-06-30",
    });
  });
});

describe("edit-this vs edit-all-future", () => {
  const startDate = "2026-06-23";

  it("keeps edit-this override when the series rule changes (edit all future)", () => {
    const editedDate = "2026-06-24"; // Wednesday
    const override: OccurrenceOverrideInput = {
      occurrenceDate: editedDate,
      status: "edited",
      movedToDate: null,
      patch: { title: "Water plants (one-off)" },
      completedAt: null,
    };
    const before = expandOccurrences(
      "FREQ=WEEKLY;BYDAY=WE",
      startDate,
      { start: "2026-06-23", end: "2026-06-30" },
      [override]
    );
    const after = expandOccurrences(
      "FREQ=WEEKLY;BYDAY=WE,FR",
      startDate,
      { start: "2026-06-23", end: "2026-06-30" },
      [override]
    );

    expect(before.find((r) => r.occurrenceDate === editedDate)?.patch).toEqual({
      title: "Water plants (one-off)",
    });
    expect(after.find((r) => r.occurrenceDate === editedDate)?.patch).toEqual({
      title: "Water plants (one-off)",
    });
  });

  it("respects completed override after rule change", () => {
    const completedOverride: OccurrenceOverrideInput = {
      occurrenceDate: "2026-06-24",
      status: "completed",
      movedToDate: null,
      patch: null,
      completedAt: new Date("2026-06-24T18:00:00"),
    };
    const rows = expandOccurrences(
      "FREQ=WEEKLY;BYDAY=TU",
      startDate,
      { start: "2026-06-23", end: "2026-07-07" },
      [completedOverride]
    );
    expect(rows.map((r) => r.occurrenceDate)).not.toContain("2026-06-24");
  });
});
