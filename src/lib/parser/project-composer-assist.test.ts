import { describe, expect, it } from "vitest";

import { getProjectComposerAssist, projectSegmentMatchesProperty } from "./project-composer-assist";

const ctx = {
  phases: [
    { id: "p1", name: "Design", parentPhaseId: null },
    { id: "p2", name: "Build", parentPhaseId: null },
    { id: "p3", name: "Mom", parentPhaseId: "p1" },
  ],
  parentPhaseId: null as string | null,
};

function assist(line: string, cursor: number) {
  return getProjectComposerAssist(line, cursor, ctx);
}

describe("projectSegmentMatchesProperty", () => {
  it("matches positional property tokens", () => {
    expect(projectSegmentMatchesProperty("today", "due")).toBe(true);
    expect(projectSegmentMatchesProperty("!!", "priority")).toBe(true);
    expect(projectSegmentMatchesProperty("Design", "parentDir", ctx)).toBe(true);
    expect(projectSegmentMatchesProperty("Des", "parentDir", ctx)).toBe(false);
  });
});

describe("getProjectComposerAssist", () => {
  it("title active with no suggestion before semicolon", () => {
    const state = assist("walk dog", 8);
    expect(state.activeProperty).toBe("title");
    expect(state.suggestion).toBeNull();
    expect(state.inSemicolonMode).toBe(false);
  });

  it("due active with today suggestion after first semicolon", () => {
    const line = "walk dog; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestion).toBe("today");
    expect(state.suggestionSuffix).toBe("today");
  });

  it("partial due completes tomorrow", () => {
    const line = "walk dog; Tomorro";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestion).toBe("tomorrow");
    expect(state.suggestionSuffix).toBe("w");
  });

  it("priority active after due segment", () => {
    const line = "walk dog; today; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBe("!");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("parentDir active after priority segment", () => {
    const line = "walk dog; today; !!; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("parentDir");
    expect(state.suggestion).toBe("Design");
    expect(state.properties.find((p) => p.key === "priority")?.status).toBe("filled");
  });

  it("partial parentDir completes sibling phase name", () => {
    const line = "walk dog; today; !; Des";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("parentDir");
    expect(state.suggestion).toBe("Design");
    expect(state.suggestionSuffix).toBe("ign");
  });

  it("no parentDir suggestion when segment contains +", () => {
    const line = "walk dog; today; !; Parent//+ Ch";
    const state = assist(line, line.length);
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
  });
});
