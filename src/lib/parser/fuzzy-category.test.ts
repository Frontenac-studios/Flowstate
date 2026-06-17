import { describe, expect, it } from "vitest";

import { fuzzyCategorySuggestions, matchCategorySegment } from "./fuzzy-category";

describe("matchCategorySegment", () => {
  it("matches a category key exactly", () => {
    expect(matchCategorySegment("relationships")).toBe("relationships");
    expect(matchCategorySegment("personal_projects")).toBe("personal_projects");
  });

  it("matches a display label case-insensitively", () => {
    expect(matchCategorySegment("Professional")).toBe("professional");
    expect(matchCategorySegment("professional")).toBe("professional");
  });

  it("normalizes ampersand and spacing for Body & Mind", () => {
    expect(matchCategorySegment("Body & Mind")).toBe("body_mind");
    expect(matchCategorySegment("body and mind")).toBe("body_mind");
  });

  it("matches the key for a multi-word label", () => {
    expect(matchCategorySegment("Personal Projects")).toBe("personal_projects");
  });

  it("returns null for a non-category word", () => {
    expect(matchCategorySegment("groceries")).toBeNull();
    expect(matchCategorySegment("")).toBeNull();
  });

  it("does not loosely match a partial as exact", () => {
    expect(matchCategorySegment("rel")).toBeNull();
  });

  it("honours a custom label map", () => {
    const labels = {
      professional: "Work",
      personal_projects: "Side Projects",
      relationships: "People",
      body_mind: "Wellbeing",
      adulting: "Life Admin",
    };
    expect(matchCategorySegment("Wellbeing", labels)).toBe("body_mind");
    // The old label (which isn't also the key) no longer matches once renamed.
    expect(matchCategorySegment("Body & Mind", labels)).toBeNull();
    // The stable key still matches regardless of label overrides.
    expect(matchCategorySegment("body_mind", labels)).toBe("body_mind");
  });
});

describe("fuzzyCategorySuggestions", () => {
  it("ranks an exact-ish prefix first", () => {
    const [top] = fuzzyCategorySuggestions("rel");
    expect(top.category).toBe("relationships");
  });

  it("returns all five for an empty query", () => {
    expect(fuzzyCategorySuggestions("")).toHaveLength(5);
  });

  it("tolerates a typo", () => {
    const [top] = fuzzyCategorySuggestions("professonal");
    expect(top.category).toBe("professional");
  });
});
