import { describe, expect, it } from "vitest";

import { extraPlantCount, gardenGrowthTier } from "./garden-growth";

describe("garden-growth", () => {
  it("maps nourish counts to growth tiers", () => {
    expect(gardenGrowthTier(0)).toBe(0);
    expect(gardenGrowthTier(1)).toBe(1);
    expect(gardenGrowthTier(3)).toBe(2);
    expect(gardenGrowthTier(6)).toBe(3);
  });

  it("caps extra plant markers", () => {
    expect(extraPlantCount(0)).toBe(0);
    expect(extraPlantCount(3)).toBe(3);
    expect(extraPlantCount(99)).toBe(5);
  });
});
