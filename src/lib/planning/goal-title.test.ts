import { describe, expect, it } from "vitest";

import normalizeGoalTitle from "@/lib/planning/goal-title";

describe("normalizeGoalTitle", () => {
  it("lowercases the first letter only", () => {
    expect(normalizeGoalTitle("Launch Frontenac Studios website")).toBe(
      "launch Frontenac Studios website"
    );
    expect(normalizeGoalTitle("File LLC")).toBe("file LLC");
  });

  it("strips trailing sentence punctuation", () => {
    expect(normalizeGoalTitle("Read 5 books.")).toBe("read 5 books");
    expect(normalizeGoalTitle("finish a new art piece!!")).toBe("finish a new art piece");
    expect(normalizeGoalTitle("go on a retreat…")).toBe("go on a retreat");
  });

  it("keeps non-sentence trailing characters", () => {
    expect(normalizeGoalTitle("learn to paint 8 objects (birds, flowers, etc.)")).toBe(
      "learn to paint 8 objects (birds, flowers, etc.)"
    );
    expect(normalizeGoalTitle("See Nadia <3")).toBe("see Nadia <3");
  });

  it("trims and collapses whitespace", () => {
    expect(normalizeGoalTitle("  make   a canvas  ")).toBe("make a canvas");
  });

  it("falls back to the trimmed input when stripping would empty the title", () => {
    expect(normalizeGoalTitle("!!!")).toBe("!!!");
  });
});
