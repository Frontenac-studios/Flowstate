import { describe, expect, it, vi } from "vitest";

import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";

import { executeComposerSubmit } from "./execute-composer-submit";

const phases = [
  { id: "parent-id", name: "Product & Portfolio", parentPhaseId: null },
  { id: "existing", name: "Design", parentPhaseId: null },
];

function taskLine(
  raw: string,
  overrides: Partial<ParsedProjectLine["parse"]> = {}
): ParsedProjectLine {
  return {
    lineIndex: 0,
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

describe("executeComposerSubmit", () => {
  it("creates a new flat phase then bulk-creates tasks under it", async () => {
    const createPhase = vi.fn().mockResolvedValue({ id: "new-phase", name: "Product" });
    const bulkCreateTasks = vi.fn().mockResolvedValue(undefined);
    const createTask = vi.fn();

    await executeComposerSubmit({
      projectId: "proj-1",
      parentPhaseId: null,
      phases,
      defaultPhaseId: null,
      lines: [
        taskLine("a", {
          parentDirName: "Product",
          pathKey: "product",
          parentDirPath: [{ name: "Product", create: true }],
          parentDirCreate: true,
        }),
        taskLine("b", {
          parentDirName: "Product",
          pathKey: "product",
          parentDirPath: [{ name: "Product", create: false }],
        }),
      ],
      mutations: { createPhase, createTask, bulkCreateTasks },
    });

    expect(createPhase).toHaveBeenCalledOnce();
    expect(bulkCreateTasks.mock.calls[0]?.[0].tasks).toEqual([
      expect.objectContaining({ phaseId: "new-phase" }),
      expect.objectContaining({ phaseId: "new-phase" }),
    ]);
  });

  it("creates child phase under existing parent for nested path", async () => {
    const createPhase = vi.fn().mockResolvedValue({ id: "child-id", name: "Magic-Link Gate" });
    const createTask = vi.fn().mockResolvedValue(undefined);

    await executeComposerSubmit({
      projectId: "proj-1",
      parentPhaseId: null,
      phases,
      defaultPhaseId: null,
      lines: [
        taskLine("a", {
          pathKey: "product & portfolio//magic-link gate",
          parentDirPath: [
            { name: "Product & Portfolio", create: false },
            { name: "Magic-Link Gate", create: true },
          ],
          parentDirCreate: true,
        }),
      ],
      mutations: {
        createPhase,
        createTask,
        bulkCreateTasks: vi.fn(),
      },
    });

    expect(createPhase).toHaveBeenCalledOnce();
    expect(createPhase).toHaveBeenCalledWith({
      projectId: "proj-1",
      parentPhaseId: "parent-id",
      name: "Magic-Link Gate",
    });
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ phaseId: "child-id" }));
  });

  it("creates parent then child when both segments use +", async () => {
    const createPhase = vi
      .fn()
      .mockResolvedValueOnce({ id: "parent-new", name: "Alpha" })
      .mockResolvedValueOnce({ id: "child-new", name: "Beta" });
    const createTask = vi.fn().mockResolvedValue(undefined);

    await executeComposerSubmit({
      projectId: "proj-1",
      parentPhaseId: null,
      phases: [],
      defaultPhaseId: null,
      lines: [
        taskLine("a", {
          pathKey: "alpha//beta",
          parentDirPath: [
            { name: "Alpha", create: true },
            { name: "Beta", create: true },
          ],
          parentDirCreate: true,
        }),
      ],
      mutations: { createPhase, createTask, bulkCreateTasks: vi.fn() },
    });

    expect(createPhase).toHaveBeenCalledTimes(2);
    expect(createPhase).toHaveBeenNthCalledWith(1, {
      projectId: "proj-1",
      parentPhaseId: null,
      name: "Alpha",
    });
    expect(createPhase).toHaveBeenNthCalledWith(2, {
      projectId: "proj-1",
      parentPhaseId: "parent-new",
      name: "Beta",
    });
    expect(createTask).toHaveBeenCalledWith(expect.objectContaining({ phaseId: "child-new" }));
  });
});
