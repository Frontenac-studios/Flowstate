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
});
