import { describe, expect, it } from "vitest";

import {
  daysUntilJan31,
  finalizeReminderUrgency,
  isFinalizeReminderDue,
  isLateDecember,
  isNextYearBingoPromptDue,
} from "./bingo-year-rollover";
import type { BingoYearRolloverStorageSnapshot } from "./bingo-year-rollover-storage";

const emptyStorage: BingoYearRolloverStorageSnapshot = {
  nextYearPromptDismissedForYear: null,
  nextYearPromptSnoozeUntil: null,
  finalizeDismissedUrgency: null,
  finalizeDismissedYear: null,
  finalizeSnoozeUntil: null,
};

describe("isLateDecember", () => {
  it("is true from Dec 15 through Dec 31", () => {
    expect(isLateDecember(new Date("2025-12-14T12:00:00"))).toBe(false);
    expect(isLateDecember(new Date("2025-12-15T12:00:00"))).toBe(true);
    expect(isLateDecember(new Date("2025-12-31T12:00:00"))).toBe(true);
  });
});

describe("finalizeReminderUrgency", () => {
  it("escalates as Jan 31 nears", () => {
    expect(finalizeReminderUrgency(new Date("2026-01-05T12:00:00"))).toBe("gentle");
    expect(finalizeReminderUrgency(new Date("2026-01-18T12:00:00"))).toBe("nudge");
    expect(finalizeReminderUrgency(new Date("2026-01-28T12:00:00"))).toBe("urgent");
    expect(finalizeReminderUrgency(new Date("2026-02-01T12:00:00"))).toBeNull();
  });
});

describe("daysUntilJan31", () => {
  it("counts down through January", () => {
    expect(daysUntilJan31(new Date("2026-01-01T12:00:00"))).toBe(30);
    expect(daysUntilJan31(new Date("2026-01-31T12:00:00"))).toBe(0);
  });
});

describe("isNextYearBingoPromptDue", () => {
  const dec20 = new Date("2025-12-20T12:00:00");

  it("is due when no next-year card exists in late December", () => {
    expect(isNextYearBingoPromptDue(dec20, 2026, false, emptyStorage)).toBe(true);
  });

  it("is false when next-year card already exists", () => {
    expect(isNextYearBingoPromptDue(dec20, 2026, true, emptyStorage)).toBe(false);
  });

  it("is false when dismissed for that target year", () => {
    const storage: BingoYearRolloverStorageSnapshot = {
      ...emptyStorage,
      nextYearPromptDismissedForYear: 2026,
    };
    expect(isNextYearBingoPromptDue(dec20, 2026, false, storage)).toBe(false);
  });

  it("respects snooze", () => {
    const storage: BingoYearRolloverStorageSnapshot = {
      ...emptyStorage,
      nextYearPromptSnoozeUntil: "2026-01-01T00:00:00.000Z",
    };
    expect(isNextYearBingoPromptDue(dec20, 2026, false, storage)).toBe(false);
  });
});

describe("isFinalizeReminderDue", () => {
  const jan10 = new Date("2026-01-10T12:00:00");

  it("is due for a draft card in January", () => {
    expect(isFinalizeReminderDue(jan10, 2026, "draft", emptyStorage)).toBe(true);
  });

  it("is false for a finalized card", () => {
    expect(isFinalizeReminderDue(jan10, 2026, "final", emptyStorage)).toBe(false);
  });

  it("is false outside January", () => {
    expect(
      isFinalizeReminderDue(new Date("2026-02-01T12:00:00"), 2026, "draft", emptyStorage)
    ).toBe(false);
  });

  it("respects dismiss at current urgency tier", () => {
    const storage: BingoYearRolloverStorageSnapshot = {
      ...emptyStorage,
      finalizeDismissedUrgency: "gentle",
    };
    expect(isFinalizeReminderDue(jan10, 2026, "draft", storage)).toBe(false);
  });

  it("resurfaces when urgency escalates past dismissed tier", () => {
    const storage: BingoYearRolloverStorageSnapshot = {
      ...emptyStorage,
      finalizeDismissedUrgency: "gentle",
    };
    const jan25 = new Date("2026-01-25T12:00:00");
    expect(isFinalizeReminderDue(jan25, 2026, "draft", storage)).toBe(true);
  });

  it("stays hidden after urgent dismiss for the year", () => {
    const storage: BingoYearRolloverStorageSnapshot = {
      ...emptyStorage,
      finalizeDismissedUrgency: "urgent",
      finalizeDismissedYear: 2026,
    };
    expect(isFinalizeReminderDue(new Date("2026-01-28T12:00:00"), 2026, "draft", storage)).toBe(
      false
    );
  });
});
