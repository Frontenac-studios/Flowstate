import { describe, expect, it } from "vitest";

import { buildPhaseTree } from "./phase-tree";
import { flattenPlanOutline } from "./flatten-plan-outline";

type P = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
  startDate: string | null;
  endDate: string | null;
  estimateHours: number | null;
  completedAt: Date | null;
};

type T = {
  id: string;
  title: string;
  phaseId: string | null;
  sortOrder: number;
  scheduledDate: string | null;
  completedAt: Date | null;
};

function phase(over: Partial<P> & Pick<P, "id" | "name">): P {
  return {
    parentPhaseId: null,
    sortOrder: 0,
    startDate: null,
    endDate: null,
    estimateHours: null,
    completedAt: null,
    ...over,
  };
}

function task(over: Partial<T> & Pick<T, "id" | "title">): T {
  return {
    phaseId: null,
    sortOrder: 0,
    scheduledDate: null,
    completedAt: null,
    ...over,
  };
}

const PHASES: P[] = [
  phase({
    id: "p1",
    name: "Data model rebuild",
    sortOrder: 0,
    endDate: "2026-09-19",
    estimateHours: 12,
  }),
  phase({
    id: "p1a",
    name: "Cutover",
    parentPhaseId: "p1",
    sortOrder: 0,
    endDate: "2026-10-03",
    estimateHours: 5,
  }),
  phase({ id: "p2", name: "Reporting layer", sortOrder: 1, estimateHours: 6 }),
];

const TASKS: T[] = [
  task({
    id: "t1",
    title: "Audit the current schema",
    phaseId: "p1",
    sortOrder: 0,
    scheduledDate: "2026-09-05",
  }),
  task({ id: "t2", title: "Dry run against staging", phaseId: "p1a", sortOrder: 0 }),
  task({
    id: "t3",
    title: "Rebuild the rollup query",
    phaseId: "p2",
    sortOrder: 0,
    scheduledDate: "2026-09-24",
  }),
  task({ id: "t4", title: "Unfiled thought", phaseId: null, sortOrder: 0 }),
];

function flatten(overrides?: {
  secondsByPhaseId?: Record<string, number>;
  secondsByTaskId?: Record<string, number>;
  hotPhaseIds?: Set<string>;
}) {
  return flattenPlanOutline({
    tree: buildPhaseTree(PHASES, TASKS),
    secondsByPhaseId: overrides?.secondsByPhaseId ?? {},
    secondsByTaskId: overrides?.secondsByTaskId ?? {},
    hotPhaseIds: overrides?.hotPhaseIds,
  });
}

describe("flattenPlanOutline", () => {
  it("emits a phase followed by its tasks, then its sub-phases", () => {
    expect(flatten().map((r) => [r.kind, r.title, r.depth])).toEqual([
      ["phase", "Data model rebuild", 0],
      ["task", "Audit the current schema", 1],
      ["phase", "Cutover", 1],
      ["task", "Dry run against staging", 2],
      ["phase", "Reporting layer", 0],
      ["task", "Rebuild the rollup query", 1],
      ["task", "Unfiled thought", 0],
    ]);
  });

  it("rolls a phase's estimate up through its sub-phases", () => {
    const rows = flatten();
    // 12 of its own plus the 5 on Cutover beneath it.
    expect(rows.find((r) => r.id === "p1")?.estimateHours).toBe(17);
    expect(rows.find((r) => r.id === "p1a")?.estimateHours).toBe(5);
    expect(rows.find((r) => r.id === "p2")?.estimateHours).toBe(6);
  });

  it("leaves the estimate null when nothing in the subtree carries one", () => {
    const rows = flattenPlanOutline({
      tree: buildPhaseTree([phase({ id: "x", name: "Unestimated" })], []),
      secondsByPhaseId: {},
      secondsByTaskId: {},
    });
    expect(rows[0]?.estimateHours).toBeNull();
  });

  it("converts logged seconds to rounded hours and treats zero as nothing", () => {
    const rows = flatten({
      secondsByPhaseId: { p1: 50400, p2: 0 },
      secondsByTaskId: { t1: 12600 },
    });
    expect(rows.find((r) => r.id === "p1")?.actualHours).toBe(14);
    expect(rows.find((r) => r.id === "p2")?.actualHours).toBeNull();
    expect(rows.find((r) => r.id === "t1")?.actualHours).toBe(3.5);
  });

  it("marks only the phases named as hot", () => {
    const rows = flatten({ hotPhaseIds: new Set(["p1"]) });
    expect(rows.find((r) => r.id === "p1")?.hot).toBe(true);
    expect(rows.find((r) => r.id === "p2")?.hot).toBe(false);
    expect(rows.find((r) => r.id === "t1")?.hot).toBe(false);
  });

  it("carries phase end dates and task scheduled dates into one Due column", () => {
    const rows = flatten();
    expect(rows.find((r) => r.id === "p1")?.due).toBe("2026-09-19");
    expect(rows.find((r) => r.id === "t3")?.due).toBe("2026-09-24");
    expect(rows.find((r) => r.id === "p2")?.due).toBeNull();
  });
});
