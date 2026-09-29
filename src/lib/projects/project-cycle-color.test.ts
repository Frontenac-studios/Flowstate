import { describe, expect, it } from "vitest";
import {
  projectCalendarSolidVar,
  projectCycleSolidVar,
  PROJECT_CYCLE_SOLIDS,
} from "./project-cycle-color";

describe("projectCycleSolidVar", () => {
  it("cycles the eight project solids", () => {
    expect(PROJECT_CYCLE_SOLIDS).toHaveLength(8);
    expect(projectCycleSolidVar(8)).toBe(PROJECT_CYCLE_SOLIDS[0]);
    expect(projectCycleSolidVar(-1)).toBe(PROJECT_CYCLE_SOLIDS[7]);
  });

  it("keeps personal purple out of the cycle", () => {
    expect(PROJECT_CYCLE_SOLIDS).not.toContain("var(--project-personal-solid)");
  });
});

describe("projectCalendarSolidVar", () => {
  it("dodges the business stripe's hue (--project-1)", () => {
    expect(projectCalendarSolidVar(0, "business")).toBe(projectCycleSolidVar(1));
    expect(projectCalendarSolidVar(8, "business")).toBe(projectCycleSolidVar(9));
  });

  it("keeps the plain cycle color when there is no collision", () => {
    for (let index = 0; index < PROJECT_CYCLE_SOLIDS.length; index += 1) {
      expect(projectCalendarSolidVar(index, "personal")).toBe(projectCycleSolidVar(index));
    }
    expect(projectCalendarSolidVar(3, "business")).toBe(projectCycleSolidVar(3));
  });
});
