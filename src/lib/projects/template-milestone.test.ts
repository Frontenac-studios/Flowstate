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
    expect(isSimilarCategoryAllowed("relationships", "relationships")).toBe(true);
  });

  it("allows professional ↔ personal_projects cross-suggest", () => {
    expect(isSimilarCategoryAllowed("professional", "personal_projects")).toBe(true);
    expect(isSimilarCategoryAllowed("personal_projects", "professional")).toBe(true);
  });

  it("blocks other cross-category pairs", () => {
    expect(isSimilarCategoryAllowed("professional", "adulting")).toBe(false);
    expect(isSimilarCategoryAllowed("relationships", "body_mind")).toBe(false);
    expect(isSimilarCategoryAllowed("personal_projects", "adulting")).toBe(false);
  });
});
