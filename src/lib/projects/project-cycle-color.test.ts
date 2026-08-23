import { describe, expect, it } from "vitest";
import {
  projectCalendarSolidVar,
  projectCycleSolidVar,
  PROJECT_CYCLE_SOLIDS,
} from "./project-cycle-color";
import { categorySolidVar } from "./category-tokens";

describe("projectCycleSolidVar", () => {
  it("cycles palette solids", () => {
    expect(projectCycleSolidVar(6)).toBe(PROJECT_CYCLE_SOLIDS[0]);
  });
});

describe("projectCalendarSolidVar", () => {
  it("offsets when cycle matches category stripe", () => {
    // The personal solid is part of the cycle palette, so a bar landing on it would
    // collide with the project's own category stripe → the +1 dodge kicks in.
    const index = PROJECT_CYCLE_SOLIDS.findIndex((solid) => solid === categorySolidVar("personal"));
    expect(projectCalendarSolidVar(index, "personal")).toBe(projectCycleSolidVar(index + 1));
  });

  it("keeps the plain cycle color when the category solid is not in the palette", () => {
    // The business solid is not one of the cycle hues, so no collision → no dodge.
    expect(PROJECT_CYCLE_SOLIDS).not.toContain(categorySolidVar("business"));
    for (let index = 0; index < PROJECT_CYCLE_SOLIDS.length; index += 1) {
      expect(projectCalendarSolidVar(index, "business")).toBe(projectCycleSolidVar(index));
    }
  });
});
