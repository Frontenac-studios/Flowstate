import { describe, expect, it } from "vitest";

import { VALUES_MAX } from "./constants";
import { canAddValue, isDuplicateValue, normalizeValueLabel, valueLabelSchema } from "./values";

describe("normalizeValueLabel", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeValueLabel("  Deep   Work ")).toBe("deep work");
  });
});

describe("isDuplicateValue", () => {
  it("matches case- and whitespace-insensitively", () => {
    expect(isDuplicateValue("health", ["Health", "Craft"])).toBe(true);
    expect(isDuplicateValue(" FAMILY ", ["Family"])).toBe(true);
    expect(isDuplicateValue("Adventure", ["Health"])).toBe(false);
  });
});

describe("canAddValue", () => {
  it("allows up to the max and blocks beyond it", () => {
    expect(canAddValue(0)).toBe(true);
    expect(canAddValue(VALUES_MAX - 1)).toBe(true);
    expect(canAddValue(VALUES_MAX)).toBe(false);
  });
});

describe("valueLabelSchema", () => {
  it("trims and rejects empty labels", () => {
    expect(valueLabelSchema.parse("  Craft ")).toBe("Craft");
    expect(valueLabelSchema.safeParse("   ").success).toBe(false);
  });

  it("rejects over-long labels", () => {
    expect(valueLabelSchema.safeParse("x".repeat(41)).success).toBe(false);
  });
});
