import { describe, expect, it } from "vitest";

import { checkInScopeKey } from "./check-in";
import {
  isCheckInCadenceDue,
  isCheckInSnoozed,
  type CheckInStorageSnapshot,
} from "./check-in-storage";

describe("checkInScopeKey", () => {
  it("keys week scope by weekStart", () => {
    expect(
      checkInScopeKey({ depth: "week", year: 2026, weekStart: "2026-06-29", month: 6, quarter: 2 })
    ).toBe("week:2026-06-29");
  });

  it("keys month and quarter scopes", () => {
    expect(checkInScopeKey({ depth: "month", year: 2026, month: 6 })).toBe("month:2026-6");
    expect(checkInScopeKey({ depth: "quarter", year: 2026, quarter: 3 })).toBe("quarter:2026-Q3");
    expect(checkInScopeKey({ depth: "year", year: 2026 })).toBe("year:2026");
  });
});

describe("check-in cadence", () => {
  const base: CheckInStorageSnapshot = {
    cadence: "weekly",
    snoozeUntil: null,
    lastCompletedAt: null,
  };

  it("is due when cadence enabled and never completed", () => {
    expect(isCheckInCadenceDue(new Date("2026-07-01T12:00:00Z"), base)).toBe(true);
  });

  it("respects snooze", () => {
    const snoozed: CheckInStorageSnapshot = {
      ...base,
      snoozeUntil: "2026-07-10T00:00:00.000Z",
    };
    expect(isCheckInSnoozed(new Date("2026-07-01T12:00:00Z"), snoozed.snoozeUntil)).toBe(true);
    expect(isCheckInCadenceDue(new Date("2026-07-01T12:00:00Z"), snoozed)).toBe(false);
  });

  it("is off when cadence disabled", () => {
    expect(isCheckInCadenceDue(new Date(), { ...base, cadence: "off" })).toBe(false);
  });
});
