import { describe, expect, it } from "vitest";

import { getProjectComposerAssist, projectSegmentMatchesProperty } from "./project-composer-assist";

const ctx = {
  currentProjectSlug: "flowstate",
  phases: [
    { id: "p1", name: "Design" },
    { id: "p2", name: "Build" },
  ],
};

function assist(line: string, cursor: number) {
  return getProjectComposerAssist(line, cursor, ctx);
}

describe("projectSegmentMatchesProperty", () => {
  it("matches positional property tokens", () => {
    expect(projectSegmentMatchesProperty("today", "due")).toBe(true);
    expect(projectSegmentMatchesProperty("!!", "priority")).toBe(true);
    expect(projectSegmentMatchesProperty("#flowstate", "project")).toBe(true);
    expect(projectSegmentMatchesProperty("Design", "parentDir")).toBe(true);
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

  it("priority active after due segment", () => {
    const line = "walk dog; today; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBe("!");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("project active after priority segment", () => {
    const line = "walk dog; today; !!; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("#flowstate");
    expect(state.properties.find((p) => p.key === "priority")?.status).toBe("filled");
  });

  it("parentDir active after project segment", () => {
    const line = "walk dog; today; !!; #flowstate; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("parentDir");
    expect(state.suggestion).toBe("Design");
    expect(state.properties.find((p) => p.key === "project")?.status).toBe("filled");
  });
});
