import { describe, expect, it } from "vitest";

import { fuzzyCategorySuggestions, matchCategorySegment } from "./fuzzy-category";

describe("matchCategorySegment", () => {
  it("matches a category key exactly", () => {
    expect(matchCategorySegment("business")).toBe("business");
    expect(matchCategorySegment("personal")).toBe("personal");
  });

  it("matches a display label case-insensitively", () => {
    expect(matchCategorySegment("Business")).toBe("business");
    expect(matchCategorySegment("business")).toBe("business");
  });

  it("normalizes surrounding whitespace and casing", () => {
    expect(matchCategorySegment("  BUSINESS  ")).toBe("business");
    expect(matchCategorySegment("Personal")).toBe("personal");
  });

  it("returns null for a non-category word", () => {
    expect(matchCategorySegment("groceries")).toBeNull();
    expect(matchCategorySegment("")).toBeNull();
  });

  it("does not loosely match a partial as exact", () => {
    expect(matchCategorySegment("busi")).toBeNull();
  });

  it("honours a custom label map", () => {
    const labels = {
      business: "Work",
      personal: "Wellbeing",
    };
    expect(matchCategorySegment("Wellbeing", labels)).toBe("personal");
    expect(matchCategorySegment("Work", labels)).toBe("business");
    // The stable key still matches regardless of label overrides.
    expect(matchCategorySegment("personal", labels)).toBe("personal");
  });
});

describe("fuzzyCategorySuggestions", () => {
  it("ranks an exact-ish prefix first", () => {
    const [top] = fuzzyCategorySuggestions("bus");
    expect(top.category).toBe("business");
  });

  it("returns all categories for an empty query", () => {
    expect(fuzzyCategorySuggestions("")).toHaveLength(2);
  });

  it("tolerates a typo", () => {
    const [top] = fuzzyCategorySuggestions("bussiness");
    expect(top.category).toBe("business");
  });
});
