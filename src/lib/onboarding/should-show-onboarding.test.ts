import { describe, expect, it } from "vitest";

import { shouldShowOnboarding } from "./should-show-onboarding";

describe("shouldShowOnboarding", () => {
  it("shows for a fresh empty-day client", () => {
    expect(shouldShowOnboarding({ completed: false, eligible: true })).toBe(true);
  });

  it("hides once completed", () => {
    expect(shouldShowOnboarding({ completed: true, eligible: true })).toBe(false);
  });

  it("hides while eligibility is unresolved", () => {
    expect(shouldShowOnboarding({ completed: false, eligible: null })).toBe(false);
  });

  it("hides when the client already had work (ineligible)", () => {
    expect(shouldShowOnboarding({ completed: false, eligible: false })).toBe(false);
  });

  it("yields to another blocking ritual", () => {
    expect(
      shouldShowOnboarding({ completed: false, eligible: true, blockedByOtherRitual: true })
    ).toBe(false);
  });
});
