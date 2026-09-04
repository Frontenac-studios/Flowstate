/**
 * Flatten the project tree into the row list Plan mode renders (Kash 3.2, 2D).
 *
 * Plan mode is the second view of the same board, not a second source of truth: the
 * Miller columns show one parent's children at a time, and this shows the whole tree
 * at once with dates and hours in fixed columns. Both read `buildPhaseTree`, so they
 * cannot disagree about structure.
 *
 * Kept pure and framework-free so the row shape can be tested without React, and so
 * the editable version (Tab to indent) can reuse it unchanged.
 */

import type { PhaseShape, ProjectTree, TaskShape } from "@/lib/projects/phase-tree";

export type PlanOutlineRow = {
  kind: "phase" | "task";
  id: string;
  /** 0 for a root phase or a loose task; +1 per level of nesting. */
  depth: number;
  title: string;
  completed: boolean;
  /** Phase end date, or a task's scheduled date. `YYYY-MM-DD`, or null. */
  due: string | null;
  /**
   * Hours estimated. For a phase this is the subtree total, so a parent tells you
   * what the whole branch is meant to cost. Null when nothing under it is estimated.
   */
  estimateHours: number | null;
  /** Hours logged, or null when the row has no time against it. */
  actualHours: number | null;
  /** Budget is ahead of the work on this row. Only ever set on estimated phases. */
  hot: boolean;
};

type OutlinePhase = PhaseShape & {
  endDate: string | null;
  estimateHours: number | null;
  completedAt: Date | null;
};

type OutlineTask = TaskShape & {
  id: string;
  title: string;
};

export type FlattenPlanOutlineParams<P extends OutlinePhase, T extends OutlineTask> = {
  tree: ProjectTree<P, T>;
  /** Seconds logged per phase, already rolled up through the subtree. */
  secondsByPhaseId: Record<string, number>;
  /** Seconds logged per task. */
  secondsByTaskId: Record<string, number>;
  /** Phase ids whose budget is running ahead of their work. */
  hotPhaseIds?: ReadonlySet<string>;
};

function hours(seconds: number | undefined): number | null {
  if (!seconds || seconds <= 0) return null;
  return Math.round((seconds / 3600) * 10) / 10;
}

/** Estimated hours for a phase and everything beneath it. Null when none is set. */
function subtreeEstimateHours<P extends OutlinePhase, T extends OutlineTask>(node: {
  phase: P;
  children: { phase: P; children: unknown[]; tasks: T[] }[];
}): number | null {
  let total: number | null = node.phase.estimateHours ?? null;
  for (const child of node.children) {
    const childTotal = subtreeEstimateHours(
      child as unknown as { phase: P; children: { phase: P; children: unknown[]; tasks: T[] }[] }
    );
    if (childTotal === null) continue;
    total = (total ?? 0) + childTotal;
  }
  return total;
}

export function flattenPlanOutline<P extends OutlinePhase, T extends OutlineTask>({
  tree,
  secondsByPhaseId,
  secondsByTaskId,
  hotPhaseIds,
}: FlattenPlanOutlineParams<P, T>): PlanOutlineRow[] {
  const rows: PlanOutlineRow[] = [];

  const pushTask = (task: T, depth: number) => {
    rows.push({
      kind: "task",
      id: task.id,
      depth,
      title: task.title,
      completed: task.completedAt != null,
      due: task.scheduledDate ?? null,
      // Tasks carry no estimate of their own in the current schema; the estimate
      // lives on the phase. Showing a dash here is honest rather than a zero.
      estimateHours: null,
      actualHours: hours(secondsByTaskId[task.id]),
      hot: false,
    });
  };

  const walk = (node: { phase: P; children: (typeof node)[]; tasks: T[] }, depth: number): void => {
    const estimateHours = subtreeEstimateHours(
      node as unknown as { phase: P; children: { phase: P; children: unknown[]; tasks: T[] }[] }
    );
    rows.push({
      kind: "phase",
      id: node.phase.id,
      depth,
      title: node.phase.name,
      completed: node.phase.completedAt != null,
      due: node.phase.endDate ?? null,
      estimateHours,
      actualHours: hours(secondsByPhaseId[node.phase.id]),
      hot: hotPhaseIds?.has(node.phase.id) ?? false,
    });

    for (const task of node.tasks) pushTask(task, depth + 1);
    for (const child of node.children) walk(child, depth + 1);
  };

  for (const node of tree.rootPhases) {
    walk(node as unknown as { phase: P; children: never[]; tasks: T[] }, 0);
  }

  // Tasks attached straight to the project, with no phase above them.
  for (const task of tree.looseTasks) pushTask(task, 0);

  return rows;
}
