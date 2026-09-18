import { describe, expect, it } from "vitest";

import { ONBOARDING_RESUME_WINDOW_MS, isResumableStart } from "./onboarding-storage";

const NOW = Date.UTC(2026, 8, 18, 12, 0, 0);

describe("isResumableStart", () => {
  it("resumes a flow started moments ago", () => {
    expect(isResumableStart(String(NOW - 60_000), NOW)).toBe(true);
  });

  it("forgets a flow abandoned beyond the window", () => {
    expect(isResumableStart(String(NOW - ONBOARDING_RESUME_WINDOW_MS - 1), NOW)).toBe(false);
  });

  it("forgets the legacy untimed marker, which otherwise resumed forever", () => {
    expect(isResumableStart("1", NOW)).toBe(false);
  });

  it("ignores absent or unparseable markers", () => {
    expect(isResumableStart(null, NOW)).toBe(false);
    expect(isResumableStart("not-a-number", NOW)).toBe(false);
    expect(isResumableStart("0", NOW)).toBe(false);
  });

  it("ignores a clock that ran backwards", () => {
    expect(isResumableStart(String(NOW + 60_000), NOW)).toBe(false);
  });
});
