/**
 * Builds the phase/task tree consumed by the project workspace views.
 *
 * Generic over the concrete phase/task row shapes so it stays decoupled from
 * the tRPC router output types (and from any framework). Callers pass whatever
 * row objects they have; the builder only reads the structural fields below and
 * preserves the full objects on each node.
 */

type PhaseShape = {
  id: string;
  parentPhaseId: string | null;
  sortOrder: number;
  name: string;
};

type TaskShape = {
  phaseId: string | null;
  sortOrder: number;
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

type DatedPhase = { startDate: string | null; endDate: string | null };

/**
 * Derives a phase's effective date range. A leaf phase uses its own manually
 * set dates; a parent spans the min start / max end of all descendants that
 * have dates. ISO date strings (YYYY-MM-DD) compare correctly lexicographically.
 */
export function derivePhaseRange<P extends PhaseShape & DatedPhase, T extends TaskShape>(
  node: PhaseTreeNode<P, T>
): { start: string | null; end: string | null } {
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
