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
    const index = PROJECT_CYCLE_SOLIDS.findIndex(
      (solid) => solid === categorySolidVar("professional")
    );
    expect(projectCalendarSolidVar(index, "professional")).toBe(projectCycleSolidVar(index + 1));
  });
});
