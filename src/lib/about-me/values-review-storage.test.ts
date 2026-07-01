import { describe, expect, it } from "vitest";

import { VALUES_MIN } from "./constants";
import {
  isValuesReviewSnoozed,
  isValuesYearlyReviewDue,
  type ValuesReviewStorageSnapshot,
} from "./values-review-storage";

const jan2026 = new Date("2026-01-15T12:00:00");

describe("isValuesYearlyReviewDue", () => {
  it("is false when the user has fewer than the minimum values", () => {
    const storage: ValuesReviewStorageSnapshot = { lastReviewedYear: null, snoozeUntil: null };
    expect(isValuesYearlyReviewDue(jan2026, storage, VALUES_MIN - 1, VALUES_MIN)).toBe(false);
  });

  it("is true for a full set that has never been reviewed", () => {
    const storage: ValuesReviewStorageSnapshot = { lastReviewedYear: null, snoozeUntil: null };
    expect(isValuesYearlyReviewDue(jan2026, storage, VALUES_MIN, VALUES_MIN)).toBe(true);
  });

  it("is false when already reviewed this calendar year", () => {
    const storage: ValuesReviewStorageSnapshot = { lastReviewedYear: 2026, snoozeUntil: null };
    expect(isValuesYearlyReviewDue(jan2026, storage, VALUES_MIN, VALUES_MIN)).toBe(false);
  });

  it("is true when last review was a prior year", () => {
    const storage: ValuesReviewStorageSnapshot = { lastReviewedYear: 2025, snoozeUntil: null };
    expect(isValuesYearlyReviewDue(jan2026, storage, VALUES_MIN, VALUES_MIN)).toBe(true);
  });

  it("respects snooze", () => {
    const storage: ValuesReviewStorageSnapshot = {
      lastReviewedYear: null,
      snoozeUntil: "2026-06-01T00:00:00.000Z",
    };
    expect(isValuesYearlyReviewDue(jan2026, storage, VALUES_MIN, VALUES_MIN)).toBe(false);
  });
});

describe("isValuesReviewSnoozed", () => {
  it("returns false for expired snooze", () => {
    expect(isValuesReviewSnoozed(jan2026, "2026-01-01T00:00:00.000Z")).toBe(false);
  });
});
