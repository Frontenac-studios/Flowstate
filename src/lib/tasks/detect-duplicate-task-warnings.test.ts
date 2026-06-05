import { describe, expect, it } from "vitest";

import {
  detectDuplicateTaskWarnings,
  normalizeTaskTitle,
  type DuplicateLineContext,
  type DuplicateTaskRef,
} from "./detect-duplicate-task-warnings";

const task = (
  overrides: Partial<DuplicateTaskRef> & Pick<DuplicateTaskRef, "id" | "title">
): DuplicateTaskRef => ({
  projectId: null,
  phaseId: null,
  completedAt: null,
  ...overrides,
});

const line = (
  overrides: Partial<DuplicateLineContext> & Pick<DuplicateLineContext, "lineIndex" | "title">
): DuplicateLineContext => ({
  projectId: null,
  phaseId: null,
  ...overrides,
});

describe("normalizeTaskTitle", () => {
  it("trims, collapses whitespace, and lowercases", () => {
    expect(normalizeTaskTitle("  Buy   Milk  ")).toBe("buy milk");
  });
});

describe("detectDuplicateTaskWarnings", () => {
  it("matches existing task by normalized title, project, and phase", () => {
    const existing: DuplicateTaskRef[] = [
      task({ id: "t1", title: "Buy Milk", projectId: "p1", phaseId: "ph1" }),
    ];
    const lines = [line({ lineIndex: 0, title: "buy  milk", projectId: "p1", phaseId: "ph1" })];

    const warnings = detectDuplicateTaskWarnings({ lines, existingTasks: existing });

    expect(warnings).toEqual([
      {
        lineIndex: 0,
        title: "buy  milk",
        existingTaskId: "t1",
        matchKind: "existing",
        phaseId: "ph1",
        projectId: "p1",
      },
    ]);
  });

  it("does not match when project differs", () => {
    const existing: DuplicateTaskRef[] = [task({ id: "t1", title: "Task", projectId: "p1" })];
    const lines = [line({ lineIndex: 0, title: "Task", projectId: "p2" })];

    expect(detectDuplicateTaskWarnings({ lines, existingTasks: existing })).toEqual([]);
  });

  it("does not match when phase differs", () => {
    const existing: DuplicateTaskRef[] = [
      task({ id: "t1", title: "Task", projectId: "p1", phaseId: "ph1" }),
    ];
    const lines = [line({ lineIndex: 0, title: "Task", projectId: "p1", phaseId: "ph2" })];

    expect(detectDuplicateTaskWarnings({ lines, existingTasks: existing })).toEqual([]);
  });

  it("ignores completed tasks", () => {
    const existing: DuplicateTaskRef[] = [
      task({ id: "t1", title: "Task", completedAt: new Date("2026-01-01") }),
    ];
    const lines = [line({ lineIndex: 0, title: "Task" })];

    expect(detectDuplicateTaskWarnings({ lines, existingTasks: existing })).toEqual([]);
  });

  it("warns on in-batch duplicates for the second line", () => {
    const lines = [
      line({ lineIndex: 0, title: "Task", projectId: "p1", phaseId: "ph1" }),
      line({ lineIndex: 1, title: "task", projectId: "p1", phaseId: "ph1" }),
    ];

    const warnings = detectDuplicateTaskWarnings({ lines, existingTasks: [] });

    expect(warnings).toEqual([
      {
        lineIndex: 1,
        title: "task",
        matchKind: "batch",
        phaseId: "ph1",
        projectId: "p1",
      },
    ]);
  });

  it("skips existing check when skipExistingCheck is true", () => {
    const existing: DuplicateTaskRef[] = [task({ id: "t1", title: "Task", projectId: "p1" })];
    const lines = [line({ lineIndex: 0, title: "Task", projectId: "p1", skipExistingCheck: true })];

    expect(detectDuplicateTaskWarnings({ lines, existingTasks: existing })).toEqual([]);
  });

  it("can report both existing and batch warnings for the same line", () => {
    const existing: DuplicateTaskRef[] = [task({ id: "t1", title: "Task", projectId: "p1" })];
    const lines = [
      line({ lineIndex: 0, title: "Task", projectId: "p1" }),
      line({ lineIndex: 1, title: "Task", projectId: "p1" }),
    ];

    const warnings = detectDuplicateTaskWarnings({ lines, existingTasks: existing });

    expect(warnings).toHaveLength(3);
    expect(warnings.filter((w) => w.lineIndex === 0 && w.matchKind === "existing")).toHaveLength(1);
    expect(warnings.filter((w) => w.lineIndex === 1 && w.matchKind === "existing")).toHaveLength(1);
    expect(warnings.filter((w) => w.lineIndex === 1 && w.matchKind === "batch")).toHaveLength(1);
  });
});
