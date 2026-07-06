import { describe, expect, it } from "vitest";

import {
  getComposerAssist,
  getComposerAssistFromValue,
  getLineAtCursor,
  segmentMatchesProperty,
  shouldAppendSemicolonAfterAccept,
} from "./composer-assist";

const projects = [
  { slug: "rdm", name: "RDM" },
  { slug: "inbox", name: "Inbox" },
  { slug: "great-white-client-build", name: "Great White Client Build" },
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
    expect(segmentMatchesProperty("rdm", "project", projects)).toBe(true);
    expect(segmentMatchesProperty("#rdm", "project", projects)).toBe(true);
    expect(segmentMatchesProperty("!!", "priority")).toBe(true);
    expect(segmentMatchesProperty("tod", "due")).toBe(false);
    expect(segmentMatchesProperty("2026-02-30", "due")).toBe(false);
    expect(segmentMatchesProperty("gr", "project", projects)).toBe(false);
    expect(segmentMatchesProperty("#gr", "project", projects)).toBe(false);
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

  it("partial due shows suffix ay for today", () => {
    const line = "walk dog; tod";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestionSuffix).toBe("ay");
  });

  it("partial due shows suffix w for tomorrow", () => {
    const line = "walk dog; Tomorro";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestion).toBe("tomorrow");
    expect(state.suggestionSuffix).toBe("w");
  });

  it("priority active after due segment complete with trailing semicolon (no default ghost)", () => {
    const line = "walk dog; today; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("completes a partial priority word", () => {
    const line = "walk dog; today; hi";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBe("high");
    expect(state.suggestionSuffix).toBe("gh");
  });

  it("project active after priority segment", () => {
    const line = "walk dog; today; !; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("rdm");
    expect(state.suggestionSuffix).toBe("rdm");
    expect(state.properties.find((p) => p.key === "priority")?.status).toBe("filled");
  });

  it("partial project shows prefix completion suffix", () => {
    const line = "walk dog; today; !; gr";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("great-white-client-build");
    expect(state.suggestionSuffix).toBe("eat-white-client-build");
  });

  it("no suggestion when due token is complete without trailing semicolon", () => {
    const line = "walk dog; today";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("priority");
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
  });

  it("marks filled properties in the bar and advances to category", () => {
    const line = "walk dog; today; !; rdm";
    const state = assist(line, line.length);
    expect(state.properties.find((p) => p.key === "title")?.status).toBe("filled");
    expect(state.properties.find((p) => p.key === "due")?.status).toBe("filled");
    expect(state.properties.find((p) => p.key === "priority")?.status).toBe("filled");
    // A complete project is now filled; the cursor advances to the category slot.
    expect(state.properties.find((p) => p.key === "project")?.status).toBe("filled");
    expect(state.properties.find((p) => p.key === "category")?.status).toBe("active");
  });

  it("getComposerAssistFromValue uses cursor line in multiline input", () => {
    const value = "other task\nwalk dog; ";
    const cursor = value.length;
    const state = getComposerAssistFromValue(value, cursor, ctx);
    expect(state.activeProperty).toBe("due");
    expect(state.suggestionSuffix).toBe("today");
  });

  it("category is the fifth property after project with trailing semicolon", () => {
    const line = "walk dog; today; !; rdm; ";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("category");
    expect(state.properties.find((p) => p.key === "project")?.status).toBe("filled");
  });

  it("does not suggest a sixth property after category", () => {
    const line = "walk dog; today; !; rdm; relationships; ";
    const state = assist(line, line.length);
    expect(state.suggestion).toBeNull();
    expect(state.suggestionSuffix).toBeNull();
    expect(state.properties.every((p) => p.status === "filled")).toBe(true);
  });

  it("completes a partial category to its label", () => {
    const line = "walk dog; today; !; rdm; rel";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("category");
    expect(state.suggestion).toBe("Relationships");
    expect(state.suggestionSuffix).toBe("ationships");
  });

  it("marks a completed category segment as filled once the cursor moves past it", () => {
    const line = "walk dog; today; !; rdm; relationships; ";
    const state = assist(line, line.length);
    expect(state.properties.find((p) => p.key === "category")?.status).toBe("filled");
  });

  it("does not append semicolon after accepting category (the last property)", () => {
    const line = "walk dog; today; !; rdm; rel";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("category");
    expect(shouldAppendSemicolonAfterAccept(line, line.length, state)).toBe(false);
  });

  it("appends a semicolon after accepting project (no longer the last property)", () => {
    const line = "walk dog; today; !; gr";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(shouldAppendSemicolonAfterAccept(line, line.length, state)).toBe(true);
  });

  it("still appends semicolon after accepting non-final properties", () => {
    const line = "walk dog; tod";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("due");
    expect(shouldAppendSemicolonAfterAccept(line, line.length, state)).toBe(true);
  });

  it("suggests project when slug is typed in the due slot (flexible segment order)", () => {
    const line = "walk dog; r";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("rdm");
    expect(state.suggestionSuffix).toBe("dm");
  });

  it("suggests project when slug is typed in the priority slot", () => {
    const line = "walk dog; today; r";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("rdm");
    expect(state.suggestionSuffix).toBe("dm");
  });

  it("completes a partial project name to its slug", () => {
    const line = "walk dog; today; !; great";
    const state = assist(line, line.length);
    expect(state.activeProperty).toBe("project");
    expect(state.suggestion).toBe("great-white-client-build");
    expect(state.suggestionSuffix).toBe("-white-client-build");
  });

  it("prefers tag suggestions over project when both could match in extra segments", () => {
    const line = "walk dog; today; !; rdm; relationships; urg";
    const state = getComposerAssist(line, line.length, {
      ...ctx,
      tagVocabulary: ["urgent", "waiting"],
    });
    expect(state.suggestion).toBe("urgent");
    expect(state.suggestionSuffix).toBe("ent");
  });
});
