import { describe, expect, it } from "vitest";

import { resolveEodUiState } from "./resolve-eod-ui-state";

const base = {
  pathname: "/plan",
  reviewDue: true,
  savedReviewExists: false,
  modalOpen: false,
  skippedForToday: false,
  snoozed: false,
  modalShownForDate: null,
  localDate: "2026-05-26",
  initialPlanVisitAfterDue: false,
  crossedThresholdOnPage: false,
};

describe("resolveEodUiState", () => {
  it("hidden before review due", () => {
    expect(resolveEodUiState({ ...base, reviewDue: false })).toBe("hidden");
  });

  it("hidden when skipped", () => {
    expect(resolveEodUiState({ ...base, skippedForToday: true })).toBe("hidden");
  });

  it("hidden when snoozed", () => {
    expect(resolveEodUiState({ ...base, snoozed: true })).toBe("hidden");
  });

  it("modal when crossing threshold on page", () => {
    expect(
      resolveEodUiState({
        ...base,
        crossedThresholdOnPage: true,
      })
    ).toBe("modal");
  });

  it("banner on initial visit after due", () => {
    expect(
      resolveEodUiState({
        ...base,
        initialPlanVisitAfterDue: true,
      })
    ).toBe("banner");
  });

  it("banner when saved review exists and review is due", () => {
    expect(
      resolveEodUiState({
        ...base,
        savedReviewExists: true,
      })
    ).toBe("banner");
  });

  it("hidden when saved review exists but before review due", () => {
    expect(
      resolveEodUiState({
        ...base,
        savedReviewExists: true,
        reviewDue: false,
      })
    ).toBe("hidden");
  });

  it("modal when modalOpen", () => {
    expect(resolveEodUiState({ ...base, modalOpen: true })).toBe("modal");
  });
});
