import { describe, expect, it } from "vitest";

import { isMorningHandoffBlocked } from "./ritual-priority";

describe("isMorningHandoffBlocked", () => {
  it("blocks when Monday entry is pending", () => {
    expect(isMorningHandoffBlocked({ mondayBlocked: true })).toBe(true);
  });

  it("blocks when onboarding is active", () => {
    expect(isMorningHandoffBlocked({ mondayBlocked: false, onboardingActive: true })).toBe(true);
  });

  it("allows morning hand-off when no higher-priority ritual is active", () => {
    expect(isMorningHandoffBlocked({ mondayBlocked: false, onboardingActive: false })).toBe(false);
  });
});
