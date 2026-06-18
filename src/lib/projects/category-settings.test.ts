import { describe, expect, it } from "vitest";

import { PROJECT_CATEGORIES } from "./categories";
import {
  defaultCategoryLabel,
  defaultCategorySortOrder,
  effectiveCategoryLabel,
} from "./category-settings";

describe("category-settings defaults", () => {
  it("default sort order follows the declared category order", () => {
    PROJECT_CATEGORIES.forEach((category, index) => {
      expect(defaultCategorySortOrder(category)).toBe(index);
    });
  });

  it("default label matches the seed meta label", () => {
    expect(defaultCategoryLabel("body_mind")).toBe("Body & Mind");
    expect(defaultCategoryLabel("professional")).toBe("Professional");
  });
});

describe("effectiveCategoryLabel", () => {
  it("uses a trimmed override when present", () => {
    expect(effectiveCategoryLabel("body_mind", "  Wellbeing  ")).toBe("Wellbeing");
  });

  it("falls back to the seed label when the override is null", () => {
    expect(effectiveCategoryLabel("body_mind", null)).toBe("Body & Mind");
  });

  it("treats a blank override as no override", () => {
    expect(effectiveCategoryLabel("professional", "   ")).toBe("Professional");
  });
});
