import { describe, expect, it } from "vitest";

import {
  hasTemplateFeatures,
  isSimilarCategoryAllowed,
  TEMPLATE_FEATURES_MIN_PROJECTS,
} from "./template-milestone";

describe("hasTemplateFeatures", () => {
  it("is false below the milestone", () => {
    expect(hasTemplateFeatures(0)).toBe(false);
    expect(hasTemplateFeatures(TEMPLATE_FEATURES_MIN_PROJECTS - 1)).toBe(false);
  });

  it("is true at and above the milestone", () => {
    expect(hasTemplateFeatures(TEMPLATE_FEATURES_MIN_PROJECTS)).toBe(true);
    expect(hasTemplateFeatures(25)).toBe(true);
  });
});

describe("isSimilarCategoryAllowed", () => {
  it("allows same category", () => {
    expect(isSimilarCategoryAllowed("personal", "personal")).toBe(true);
    expect(isSimilarCategoryAllowed("business", "business")).toBe(true);
  });

  it("allows business ↔ personal cross-suggest", () => {
    expect(isSimilarCategoryAllowed("business", "personal")).toBe(true);
    expect(isSimilarCategoryAllowed("personal", "business")).toBe(true);
  });
});
