import { describe, expect, it } from "vitest";

import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";

import {
  buildComposerLeafPhaseIdByPathKey,
  resolveComposerLinePhaseIdSync,
} from "./resolve-composer-line-phase-id";

const phases = [
  { id: "parent-id", name: "Product & Portfolio", parentPhaseId: null },
  { id: "existing", name: "Design", parentPhaseId: null },
];

function taskLine(
  raw: string,
  overrides: Partial<ParsedProjectLine["parse"]> = {},
  lineIndex = 0
): ParsedProjectLine {
  return {
    lineIndex,
    raw,
    parse: {
      title: "Task",
      scheduledDate: null,
      bucketOverride: "later",
      priority: 0,
      parentDirName: null,
      parentDirPath: null,
      pathKey: null,
      parentDirCreate: false,
      warnings: [],
      ...overrides,
    },
  };
}

describe("resolveComposerLinePhaseIdSync", () => {
  it("uses defaultPhaseId when line has no parent dir", () => {
    const line = taskLine("plain task");
    const result = resolveComposerLinePhaseIdSync(line, {
      phases,
      defaultPhaseId: "existing",
      parentPhaseId: null,
      allLines: [line],
    });

    expect(result).toEqual({ phaseId: "existing", skipExistingCheck: false });
  });

  it("resolves existing phase path without skipExistingCheck", () => {
    const line = taskLine("task", {
      pathKey: "design",
      parentDirPath: [{ name: "Design", create: false }],
    });
    const result = resolveComposerLinePhaseIdSync(line, {
      phases,
      defaultPhaseId: null,
      parentPhaseId: null,
      allLines: [line],
    });

    expect(result).toEqual({ phaseId: "existing", skipExistingCheck: false });
  });

  it("skips existing check when path creates a new phase", () => {
    const line = taskLine("task", {
      pathKey: "product",
      parentDirPath: [{ name: "Product", create: true }],
      parentDirCreate: true,
    });
    const result = resolveComposerLinePhaseIdSync(line, {
      phases,
      defaultPhaseId: null,
      parentPhaseId: null,
      allLines: [line],
    });

    expect(result).toEqual({ phaseId: null, skipExistingCheck: true });
  });

  it("merges create masks across lines for the same path key", () => {
    const lines = [
      taskLine("a", {
        pathKey: "product",
        parentDirPath: [{ name: "Product", create: true }],
        parentDirCreate: true,
      }),
      taskLine("b", {
        pathKey: "product",
        parentDirPath: [{ name: "Product", create: false }],
      }),
    ];

    const map = buildComposerLeafPhaseIdByPathKey(lines, phases, null);
    expect(map.get("product")).toEqual({ phaseId: null, skipExistingCheck: true });
  });
});
