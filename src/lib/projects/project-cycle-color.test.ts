import { describe, expect, it } from "vitest";
import { projectCycleSolidVar, PROJECT_CYCLE_SOLIDS } from "./project-cycle-color";

describe("projectCycleSolidVar", () => {
  it("cycles palette solids", () => {
    expect(projectCycleSolidVar(6)).toBe(PROJECT_CYCLE_SOLIDS[0]);
  });
});
