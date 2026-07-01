import { describe, expect, it } from "vitest";

import { GARDEN_DORMANCY_DAYS, gardenLifeState } from "./garden-dormancy";

describe("garden-dormancy", () => {
  const now = new Date("2026-07-01T12:00:00Z");

  it("stays active within the dormancy window", () => {
    const lastActiveAt = new Date(now.getTime() - 2 * 86_400_000);
    expect(gardenLifeState({ lastActiveAt, now })).toBe("active");
  });

  it("goes dormant after the lapse threshold", () => {
    const lastActiveAt = new Date(now.getTime() - (GARDEN_DORMANCY_DAYS + 3) * 86_400_000);
    expect(gardenLifeState({ lastActiveAt, now })).toBe("dormant");
  });

  it("revives on the first tend after dormancy", () => {
    const lastActiveAt = new Date(now.getTime() - (GARDEN_DORMANCY_DAYS + 0.5) * 86_400_000);
    expect(gardenLifeState({ lastActiveAt, now })).toBe("reviving");
  });
});
