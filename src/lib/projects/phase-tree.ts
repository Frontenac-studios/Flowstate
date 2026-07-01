/**
 * Builds the phase/task tree consumed by the project workspace views.
 *
 * Generic over the concrete phase/task row shapes so it stays decoupled from
 * the tRPC router output types (and from any framework). Callers pass whatever
 * row objects they have; the builder only reads the structural fields below and
 * preserves the full objects on each node.
 */

import {
  endOfIsoWeekSunday,
  parseISODateString,
  startOfIsoWeekMonday,
  toISODateString,
} from "@/lib/dates/local-day";

export type PhaseShape = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
};

export type TaskShape = {
  phaseId: string | null;
  sortOrder: number;
  scheduledDate?: string | null;
  completedAt?: Date | null;
};

export type PhaseTreeNode<P extends PhaseShape, T extends TaskShape> = {
  phase: P;
  children: PhaseTreeNode<P, T>[];
  tasks: T[];
};

export type ProjectTree<P extends PhaseShape, T extends TaskShape> = {
  rootPhases: PhaseTreeNode<P, T>[];
  /** Tasks attached directly to the project (phaseId === null). */
  looseTasks: T[];
};

export type PhaseDateRange = { start: string | null; end: string | null };

type DatedPhase = { startDate: string | null; endDate: string | null };

type SchedulableTask = {
  scheduledDate?: string | null;
  completedAt?: Date | null;
};

function bySortThenName(a: PhaseShape, b: PhaseShape): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.name.localeCompare(b.name);
}

export function buildPhaseTree<P extends PhaseShape, T extends TaskShape>(
  phases: P[],
  tasks: T[]
): ProjectTree<P, T> {
  const childPhasesByParent = new Map<string, P[]>();
  const rootPhases: P[] = [];
  for (const phase of phases) {
    if (phase.parentPhaseId === null) {
      rootPhases.push(phase);
    } else {
      const list = childPhasesByParent.get(phase.parentPhaseId) ?? [];
      list.push(phase);
      childPhasesByParent.set(phase.parentPhaseId, list);
    }
  }

  const tasksByPhase = new Map<string, T[]>();
  const looseTasks: T[] = [];
  for (const task of tasks) {
    if (task.phaseId === null) {
      looseTasks.push(task);
    } else {
      const list = tasksByPhase.get(task.phaseId) ?? [];
      list.push(task);
      tasksByPhase.set(task.phaseId, list);
    }
  }

  const sortTasks = (list: T[]) => [...list].sort((a, b) => a.sortOrder - b.sortOrder);

  const buildNode = (phase: P): PhaseTreeNode<P, T> => ({
    phase,
    children: (childPhasesByParent.get(phase.id) ?? []).sort(bySortThenName).map(buildNode),
    tasks: sortTasks(tasksByPhase.get(phase.id) ?? []),
  });

  return {
    rootPhases: rootPhases.sort(bySortThenName).map(buildNode),
    looseTasks: sortTasks(looseTasks),
  };
}

/** True when the user has set at least one manual date on the phase. */
export function hasManualPhaseDate(phase: DatedPhase): boolean {
  return phase.startDate !== null || phase.endDate !== null;
}

/**
 * Week-snapped min/max from incomplete tasks with a scheduledDate.
 * Returns null when no qualifying tasks exist.
 */
export function derivePhaseRangeFromTasks<T extends SchedulableTask>(
  tasks: T[]
): { start: string; end: string } | null {
  let minIso: string | null = null;
  let maxIso: string | null = null;

  for (const task of tasks) {
    if (task.completedAt !== null && task.completedAt !== undefined) continue;
    const iso = task.scheduledDate;
    if (iso == null) continue;
    if (minIso === null || iso < minIso) minIso = iso;
    if (maxIso === null || iso > maxIso) maxIso = iso;
  }

  if (minIso === null || maxIso === null) return null;

  return {
    start: toISODateString(startOfIsoWeekMonday(parseISODateString(minIso))),
    end: toISODateString(endOfIsoWeekSunday(parseISODateString(maxIso))),
  };
}

function mergeLeafPhaseRange(
  phase: DatedPhase,
  taskSnap: { start: string; end: string } | null
): PhaseDateRange {
  const start = phase.startDate ?? taskSnap?.start ?? null;
  const end = phase.endDate ?? taskSnap?.end ?? null;
  if (start === null || end === null) return { start: null, end: null };
  return { start, end };
}

/**
 * Effective display range for a phase: per-side manual DB dates merged with
 * week-snapped task schedules on leaves; parents span child effective ranges.
 */
export function resolveEffectivePhaseRange<P extends PhaseShape & DatedPhase, T extends TaskShape>(
  node: PhaseTreeNode<P, T>
): PhaseDateRange {
  if (node.children.length === 0) {
    return mergeLeafPhaseRange(node.phase, derivePhaseRangeFromTasks(node.tasks));
  }

  let start: string | null = null;
  let end: string | null = null;

  for (const child of node.children) {
    const range = resolveEffectivePhaseRange(child);
    if (range.start !== null && (start === null || range.start < start)) start = range.start;
    if (range.end !== null && (end === null || range.end > end)) end = range.end;
  }

  return { start, end };
}

/**
 * Derives a phase's stored date range from DB columns only. A parent spans the
 * min start / max end of all descendants that have stored dates.
 */
export function derivePhaseRange<P extends PhaseShape & DatedPhase, T extends TaskShape>(
  node: PhaseTreeNode<P, T>
): PhaseDateRange {
  let start: string | null = null;
  let end: string | null = null;

  const visit = (n: PhaseTreeNode<P, T>) => {
    const { startDate, endDate } = n.phase;
    if (startDate !== null && (start === null || startDate < start)) start = startDate;
    if (endDate !== null && (end === null || endDate > end)) end = endDate;
    n.children.forEach(visit);
  };
  visit(node);

  return { start, end };
}

/**
 * Splits items into active vs completed, preserving the incoming order within
 * each group. Used to sink completed phases/tasks to the bottom of a column.
 */
export function partitionByCompletion<T extends { completedAt: Date | null }>(
  items: T[]
): { active: T[]; completed: T[] } {
  const active: T[] = [];
  const completed: T[] = [];
  for (const item of items) {
    if (item.completedAt === null) active.push(item);
    else completed.push(item);
  }
  return { active, completed };
}

/** All tasks in a phase subtree (this node + descendants), in tree-walk order. */
export function collectSubtreeTasks<P extends PhaseShape, T extends TaskShape>(
  node: PhaseTreeNode<P, T>
): T[] {
  const collected: T[] = [...node.tasks];
  for (const child of node.children) {
    collected.push(...collectSubtreeTasks(child));
  }
  return collected;
}
