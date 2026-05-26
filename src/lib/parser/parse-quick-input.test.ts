import { describe, expect, it } from "vitest";

import {
  parseQuickInput,
  parseQuickInputLines,
  removeComposerLineAtIndex,
  replaceComposerLineAtIndex,
} from "./parse-quick-input";

const wed = new Date(2026, 4, 27); // Wed May 27 2026

const ctx = {
  today: wed,
  projects: [{ slug: "rdm", name: "RDM" }],
};

describe("parseQuickInput", () => {
  it("parses bare title as today with priority 0", () => {
    const result = parseQuickInput("ship onboarding", ctx);
    expect(result.title).toBe("ship onboarding");
    expect(result.scheduledDate).toBe("2026-05-27");
    expect(result.priority).toBe(0);
    expect(result.projectSlug).toBeNull();
    expect(result.warnings).toHaveLength(0);
  });

  it("parses tomorrow", () => {
    const result = parseQuickInput("standup tomorrow", ctx);
    expect(result.title).toBe("standup");
    expect(result.scheduledDate).toBe("2026-05-28");
  });

  it("parses today keyword", () => {
    const result = parseQuickInput("today standup", ctx);
    expect(result.scheduledDate).toBe("2026-05-27");
    expect(result.title).toBe("standup");
  });

  it("parses weekday fri", () => {
    const result = parseQuickInput("demo fri", ctx);
    expect(result.scheduledDate).toBe("2026-05-29");
    expect(result.title).toBe("demo");
  });

  it("parses known #project", () => {
    const result = parseQuickInput("fix bug #rdm", ctx);
    expect(result.projectSlug).toBe("rdm");
    expect(result.warnings).toHaveLength(0);
    expect(result.title).toBe("fix bug");
  });

  it("warns on unknown #project with suggestions", () => {
    const result = parseQuickInput("task #rdn", {
      ...ctx,
      projects: [
        { slug: "rdm", name: "RDM" },
        { slug: "flow", name: "Flow" },
      ],
    });
    expect(result.warnings).toEqual([{ code: "project_not_found", slug: "rdn" }]);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]?.slug).toBe("rdm");
  });

  it("parses priority bangs", () => {
    expect(parseQuickInput("urgent !!!", ctx).priority).toBe(3);
    expect(parseQuickInput("high !!", ctx).priority).toBe(2);
    expect(parseQuickInput("med !", ctx).priority).toBe(1);
  });

  it("parses combined tokens", () => {
    const result = parseQuickInput("review PR tomorrow #rdm !!", ctx);
    expect(result.title).toBe("review PR");
    expect(result.scheduledDate).toBe("2026-05-28");
    expect(result.projectSlug).toBe("rdm");
    expect(result.priority).toBe(2);
  });

  it("parses later bucket override", () => {
    const result = parseQuickInput("someday later", ctx);
    expect(result.bucketOverride).toBe("later");
    expect(result.scheduledDate).toBeNull();
    expect(result.title).toBe("someday");
  });
});

describe("parseQuickInputLines", () => {
  it("returns empty array for empty or whitespace-only input", () => {
    expect(parseQuickInputLines("", ctx)).toEqual([]);
    expect(parseQuickInputLines("  \n\n  ", ctx)).toEqual([]);
  });

  it("skips blank lines and assigns sequential lineIndex", () => {
    const lines = parseQuickInputLines("task one\n\n  task two  \n", ctx);
    expect(lines).toHaveLength(2);
    expect(lines[0]?.lineIndex).toBe(0);
    expect(lines[0]?.raw).toBe("task one");
    expect(lines[0]?.parse.title).toBe("task one");
    expect(lines[1]?.lineIndex).toBe(1);
    expect(lines[1]?.raw).toBe("task two");
  });

  it("parses each line independently", () => {
    const lines = parseQuickInputLines("today standup\nreview PR tomorrow #rdm !!", ctx);
    expect(lines[0]?.parse.title).toBe("standup");
    expect(lines[0]?.parse.scheduledDate).toBe("2026-05-27");
    expect(lines[1]?.parse.title).toBe("review PR");
    expect(lines[1]?.parse.scheduledDate).toBe("2026-05-28");
    expect(lines[1]?.parse.projectSlug).toBe("rdm");
    expect(lines[1]?.parse.priority).toBe(2);
  });

  it("flags unknown project per line without affecting other lines", () => {
    const lines = parseQuickInputLines("ok task\nbad #rdn", ctx);
    expect(lines[0]?.parse.warnings).toHaveLength(0);
    expect(lines[1]?.parse.warnings).toEqual([{ code: "project_not_found", slug: "rdn" }]);
  });
});

describe("composer line index helpers", () => {
  it("replaceComposerLineAtIndex updates only the targeted duplicate line", () => {
    const value = "dup #rdn\ndup #rdn\nother";
    expect(replaceComposerLineAtIndex(value, 1, "dup #rdm")).toBe("dup #rdn\ndup #rdm\nother");
  });

  it("removeComposerLineAtIndex removes only the targeted line", () => {
    const value = "keep\ndup #rdn\ndup #rdn";
    expect(removeComposerLineAtIndex(value, 1)).toBe("keep\ndup #rdn");
  });

  it("preserves blank lines when replacing by index", () => {
    const value = "a\n\nb";
    expect(replaceComposerLineAtIndex(value, 1, "c")).toBe("a\n\nc");
  });
});
