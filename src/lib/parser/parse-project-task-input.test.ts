import { describe, expect, it } from "vitest";

import {
  isProjectTaskLineValid,
  parseProjectTaskInput,
  parseProjectTaskInputLines,
} from "./parse-project-task-input";

const wed = new Date(2026, 4, 27); // Wed May 27 2026

const ctx = {
  today: wed,
  phases: [
    { id: "phase-design", name: "Design", parentPhaseId: null },
    { id: "phase-build", name: "Build", parentPhaseId: null },
    { id: "phase-portfolio", name: "Product & Portfolio", parentPhaseId: null },
  ],
  parentPhaseId: null as string | null,
};

describe("parseProjectTaskInput", () => {
  it("parses bare title with later bucket default", () => {
    const result = parseProjectTaskInput("ship onboarding", ctx);
    expect(result.title).toBe("ship onboarding");
    expect(result.parentDirName).toBeNull();
    expect(result.parentDirPath).toBeNull();
    expect(isProjectTaskLineValid(result)).toBe(true);
  });

  it("parses full positional line", () => {
    const result = parseProjectTaskInput("Wireframes; fri; !!; Design", ctx);
    expect(result.parentDirName).toBe("Design");
    expect(result.pathKey).toBe("design");
    expect(result.parentDirPath).toEqual([{ name: "Design", create: false }]);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns when parent dir phase is not found", () => {
    const result = parseProjectTaskInput("Task; ; ; Missing", ctx);
    expect(result.warnings[0]?.code).toBe("phase_not_found");
    expect(isProjectTaskLineValid(result)).toBe(false);
  });

  it("parses nested path with + on leaf when parent exists", () => {
    const result = parseProjectTaskInput(
      "Add rate-limiting; 2026-06-19; !!; Product & Portfolio//+ Magic-Link Gate",
      ctx
    );
    expect(result.parentDirName).toBe("Product & Portfolio // Magic-Link Gate");
    expect(result.pathKey).toBe("product & portfolio//magic-link gate");
    expect(result.parentDirPath).toEqual([
      { name: "Product & Portfolio", create: false },
      { name: "Magic-Link Gate", create: true },
    ]);
    expect(result.warnings).toHaveLength(0);
    expect(isProjectTaskLineValid(result)).toBe(true);
  });

  it("warns when parent segment in path is missing without +", () => {
    const result = parseProjectTaskInput("Task; ; ; Product & Portfolio//Magic-Link Gate", {
      ...ctx,
      phases: [{ id: "phase-portfolio", name: "Product & Portfolio", parentPhaseId: null }],
    });
    expect(
      result.warnings.some((w) => w.code === "phase_not_found" && w.name === "Magic-Link Gate")
    ).toBe(true);
    expect(isProjectTaskLineValid(result)).toBe(false);
  });

  it("parses + on both path segments", () => {
    const result = parseProjectTaskInput("Task; ; ; + Alpha//+ Beta", ctx);
    expect(result.parentDirCreate).toBe(true);
    expect(result.warnings).toHaveLength(0);
  });

  it("warns on empty path segment", () => {
    const result = parseProjectTaskInput("Task; ; ; A//", ctx);
    expect(result.warnings).toEqual([{ code: "empty_phase_name" }]);
  });
});

describe("parseProjectTaskInputLines", () => {
  it("bulk paste: nested path + on leaf, follow-up lines without +", () => {
    const raw = [
      "Task one; 2026-06-05; !; Product & Portfolio//+ Magic-Link Gate",
      "Task two; 2026-06-05; !; Product & Portfolio//Magic-Link Gate",
    ].join("\n");
    const lines = parseProjectTaskInputLines(raw, ctx);
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => isProjectTaskLineValid(l.parse))).toBe(true);
    expect(lines[0]?.parse.pathKey).toBe("product & portfolio//magic-link gate");
    expect(lines[1]?.parse.parentDirPath?.[1]?.create).toBe(false);
  });

  it("bulk paste: flat + on first line still works", () => {
    const raw = [
      "Task one; 2026-06-05; !; + Product & Portfolio",
      "Task two; 2026-06-05; !; Product & Portfolio",
    ].join("\n");
    const lines = parseProjectTaskInputLines(raw, ctx);
    expect(lines.every((l) => isProjectTaskLineValid(l.parse))).toBe(true);
  });
});
