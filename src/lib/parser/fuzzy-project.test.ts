import { describe, expect, it } from "vitest";

import { fuzzyProjectSuggestions } from "./fuzzy-project";

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
