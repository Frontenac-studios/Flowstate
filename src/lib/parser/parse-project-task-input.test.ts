import { describe, expect, it } from "vitest";

import { isProjectTaskLineValid, parseProjectTaskInput } from "./parse-project-task-input";

const wed = new Date(2026, 4, 27); // Wed May 27 2026

const ctx = {
  today: wed,
  currentProjectSlug: "flowstate",
  phases: [
    { id: "phase-design", name: "Design" },
    { id: "phase-build", name: "Build" },
  ],
};

describe("parseProjectTaskInput", () => {
  it("parses bare title with later bucket default", () => {
    const result = parseProjectTaskInput("ship onboarding", ctx);
    expect(result.title).toBe("ship onboarding");
    expect(result.scheduledDate).toBeNull();
    expect(result.bucketOverride).toBe("later");
    expect(result.priority).toBe(0);
    expect(result.parentDirName).toBeNull();
    expect(result.warnings).toHaveLength(0);
    expect(isProjectTaskLineValid(result)).toBe(true);
  });

  it("parses full positional line", () => {
    const result = parseProjectTaskInput("Wireframes; fri; !!; ; Design", ctx);
    expect(result.title).toBe("Wireframes");
    expect(result.scheduledDate).toBe("2026-05-29");
    expect(result.bucketOverride).toBeNull();
    expect(result.priority).toBe(2);
    expect(result.projectSlug).toBeNull();
    expect(result.parentDirName).toBe("Design");
    expect(result.warnings).toHaveLength(0);
  });

  it("allows empty optional segments", () => {
    const result = parseProjectTaskInput("Task only; ; ; ;", ctx);
    expect(result.title).toBe("Task only");
    expect(result.scheduledDate).toBeNull();
    expect(result.bucketOverride).toBe("later");
    expect(result.priority).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns on invalid due and priority segments", () => {
    const result = parseProjectTaskInput("broken; notadate; maybe; ;", ctx);
    expect(result.warnings).toEqual([
      { code: "invalid_property", property: "notadate", field: "due" },
      { code: "invalid_property", property: "maybe", field: "priority" },
    ]);
    expect(isProjectTaskLineValid(result)).toBe(false);
  });

  it("warns when parent dir phase is not found", () => {
    const result = parseProjectTaskInput("Task; ; ; ; Missing", ctx);
    expect(result.warnings).toEqual([{ code: "phase_not_found", name: "Missing" }]);
    expect(isProjectTaskLineValid(result)).toBe(false);
  });

  it("warns when parent dir phase name is ambiguous", () => {
    const ambiguousCtx = {
      ...ctx,
      phases: [
        { id: "p1", name: "Design" },
        { id: "p2", name: "design" },
      ],
    };
    const result = parseProjectTaskInput("Task; ; ; ; design", ambiguousCtx);
    expect(result.warnings).toEqual([
      { code: "phase_ambiguous", name: "design", matches: ["Design", "design"] },
    ]);
    expect(isProjectTaskLineValid(result)).toBe(false);
  });

  it("soft-warns on project mismatch but remains valid", () => {
    const result = parseProjectTaskInput("Task; ; ; #other; Design", ctx);
    expect(result.warnings).toEqual([{ code: "project_mismatch", slug: "other" }]);
    expect(isProjectTaskLineValid(result)).toBe(true);
  });

  it("warns on invalid project segment format", () => {
    const result = parseProjectTaskInput("Task; ; ; badslug; ", ctx);
    expect(result.warnings).toEqual([
      { code: "invalid_property", property: "badslug", field: "project" },
    ]);
    expect(isProjectTaskLineValid(result)).toBe(false);
  });
});
