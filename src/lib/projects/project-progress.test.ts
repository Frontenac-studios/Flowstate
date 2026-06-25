import { describe, expect, it } from "vitest";

import { projectProgress } from "./project-progress";

describe("projectProgress", () => {
  it("returns 0% for a project with no tasks", () => {
    expect(projectProgress(0, 0)).toEqual({ percent: 0, completed: 0, total: 0 });
  });

  it("rounds the percentage to a whole number", () => {
    expect(projectProgress(1, 3).percent).toBe(33);
    expect(projectProgress(2, 3).percent).toBe(67);
  });

  it("reads 100% when every task is complete", () => {
    expect(projectProgress(25, 25)).toEqual({ percent: 100, completed: 25, total: 25 });
  });

  it("clamps completed above total down to total", () => {
    expect(projectProgress(30, 25)).toEqual({ percent: 100, completed: 25, total: 25 });
  });

  it("floors negative inputs to zero", () => {
    expect(projectProgress(-5, -2)).toEqual({ percent: 0, completed: 0, total: 0 });
  });

  it("truncates fractional counts before dividing", () => {
    expect(projectProgress(1.9, 4.2)).toEqual({ percent: 25, completed: 1, total: 4 });
  });
});
