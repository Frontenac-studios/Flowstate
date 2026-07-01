import { describe, expect, it } from "vitest";

import { resolveEowUiState } from "./resolve-eow-ui-state";

const base = {
  pathname: "/this-week",
  reviewDue: true,
  dismissedForWeek: false,
  skippedForWeek: false,
  snoozed: false,
  initialVisitAfterDue: false,
  crossedThresholdOnPage: false,
};

describe("resolveEowUiState", () => {
  it("hidden off /this-week", () => {
    expect(resolveEowUiState({ ...base, pathname: "/today" })).toBe("hidden");
  });

  it("hidden before week wind-down", () => {
    expect(resolveEowUiState({ ...base, reviewDue: false })).toBe("hidden");
  });

  it("hidden when dismissed for this week", () => {
    expect(resolveEowUiState({ ...base, dismissedForWeek: true })).toBe("hidden");
  });

  it("chip on first visit after due", () => {
    expect(resolveEowUiState({ ...base, initialVisitAfterDue: true })).toBe("chip");
  });

  it("chip when user crossed wind-down on page", () => {
    expect(resolveEowUiState({ ...base, crossedThresholdOnPage: true })).toBe("chip");
  });
});
