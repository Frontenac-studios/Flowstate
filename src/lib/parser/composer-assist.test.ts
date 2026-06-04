import { describe, expect, it } from "vitest";

import {
  getComposerAssist,
  getComposerAssistFromValue,
  getLineAtCursor,
  segmentMatchesProperty,
} from "./composer-assist";

const projects = [
  { slug: "rdm", name: "RDM" },
  { slug: "inbox", name: "Inbox" },
];

const ctx = { projects, lastProjectSlug: "rdm" };

function assist(line: string, cursor: number) {
  return getComposerAssist(line, cursor, ctx);
}

describe("getLineAtCursor", () => {
  it("returns active line and offset for multiline value", () => {
    const value = "line one\nwalk dog; today";
    const cursor = value.length;
    const { lineText, cursorInLine } = getLineAtCursor(value, cursor);
    expect(lineText).toBe("walk dog; today");
    expect(cursorInLine).toBe(lineText.length);
  });
});

describe("segmentMatchesProperty", () => {
  it("matches date, project, and priority tokens", () => {
    expect(segmentMatchesProperty("today", "due")).toBe(true);
    expect(segmentMatchesProperty("2026-05-30", "due")).toBe(true);
    expect(segmentMatchesProperty("#rdm", "project")).toBe(true);
    expect(segmentMatchesProperty("!!", "priority")).toBe(true);
    expect(segmentMatchesProperty("tod", "due")).toBe(false);
    expect(segmentMatchesProperty("2026-02-30", "due")).toBe(false);
  });
});

describe("getComposerAssist", () => {
  it("title active with no suggestion before semicolon", () => {
    const state = assist("walk dog", 8);
    expect(state.activeProperty).toBe("title");
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
    expect(state.inSemicolonMode).toBe(false);
  });

  it("due active with full today suggestion after first semicolon", () => {
    const line = "walk dog; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestion).toBe("today");
    expect(state.suggestionSuffix).toBe("today");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("active");
  });

  it("partial due shows suffix ay", () => {
    const line = "walk dog; tod";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestionSuffix).toBe("ay");
  });

  it("project active after due segment complete with trailing semicolon", () => {
    const line = "walk dog; today; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("#rdm");
    expect(state.suggestionSuffix).toBe("#rdm");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("priority active after project segment", () => {
    const line = "walk dog; today; #rdm; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBe("!");
    expect(state.properties.find((p) => p.key === "project")?.status).toBe("filled");
  });

  it("no suggestion when due token is complete without trailing semicolon", () => {
    const line = "walk dog; today";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("marks filled properties in the bar", () => {
    const line = "walk dog; today; #rdm";
    const state = assist(line, line.length);
    expect(state.properties.find((p) => p.key === "title")?.status).toBe("filled");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
    expect(state.properties.find((p) => p.key === "project")?.status).toBe("filled");
  });

  it("getComposerAssistFromValue uses cursor line in multiline input", () => {
    const value = "other task\nwalk dog; ";
    const cursor = value.length;
    const state = getComposerAssistFromValue(value, cursor, ctx);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestionSuffix).toBe("today");
  });
});
