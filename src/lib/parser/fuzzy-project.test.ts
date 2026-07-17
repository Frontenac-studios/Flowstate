import { describe, expect, it } from "vitest";

import {
  findProjectBySlug,
  fuzzyProjectSuggestions,
  normalizeProjectSlugInput,
} from "./fuzzy-project";

describe("normalizeProjectSlugInput", () => {
  it("strips leading hashes and lowercases", () => {
    expect(normalizeProjectSlugInput("#Flowstate-x-Kash")).toBe("flowstate-x-kash");
  });
});

describe("findProjectBySlug", () => {
  const projects = [
    { slug: "rdm", name: "RDM" },
    { slug: "flowstate-x-kash", name: "Flowstate x Kash" },
  ];

  it("matches a slug even when the model includes a leading #", () => {
    expect(findProjectBySlug("#flowstate-x-kash", projects)?.slug).toBe("flowstate-x-kash");
  });
});

describe("fuzzyProjectSuggestions", () => {
  const projects = [
    { slug: "rdm", name: "RDM" },
    { slug: "flow", name: "Flowstate" },
  ];

  it("ranks close slug matches first", () => {
    const suggestions = fuzzyProjectSuggestions("rdn", projects);
    expect(suggestions[0]?.slug).toBe("rdm");
  });

  it("ranks prefix slug matches for partial project input", () => {
    const withLongSlug = [
      ...projects,
      { slug: "great-white-client-build", name: "Great White Client Build" },
    ];
    const suggestions = fuzzyProjectSuggestions("gr", withLongSlug);
    expect(suggestions[0]?.slug).toBe("great-white-client-build");
  });
});
