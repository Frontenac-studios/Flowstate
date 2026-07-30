import { describe, expect, it } from "vitest";

import { occurrenceRef } from "./occurrence-ref";

describe("occurrenceRef", () => {
  it("returns the recurrence ref for a recurring occurrence", () => {
    expect(
      occurrenceRef({
        isRecurringOccurrence: true,
        recurrenceId: "rec-1",
        occurrenceDate: "2026-07-29",
      })
    ).toEqual({ recurrenceId: "rec-1", occurrenceDate: "2026-07-29" });
  });

  it("returns null for an ordinary task", () => {
    expect(occurrenceRef({ isRecurringOccurrence: false })).toBeNull();
    expect(occurrenceRef({})).toBeNull();
  });

  it("returns null when occurrence fields are incomplete (never a broken half-ref)", () => {
    // A malformed occurrence must fall back to the by-id path rather than call the
    // recurrence router with a missing recurrenceId/occurrenceDate.
    expect(occurrenceRef({ isRecurringOccurrence: true, recurrenceId: "rec-1" })).toBeNull();
    expect(occurrenceRef({ isRecurringOccurrence: true, occurrenceDate: "2026-07-29" })).toBeNull();
    expect(
      occurrenceRef({
        isRecurringOccurrence: false,
        recurrenceId: "rec-1",
        occurrenceDate: "2026-07-29",
      })
    ).toBeNull();
  });
});
