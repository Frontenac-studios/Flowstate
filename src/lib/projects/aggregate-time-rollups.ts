/**
 * Time-spent roll-ups for project workspace surfaces (P4).
 * Mirrors aggregate-week entry duration rules — running entries count to `now`.
 */

export type TimeEntryRow = {
  taskId: string;
  startedAt: Date;
  endedAt: Date | null;
};

export type TaskPhaseRow = {
  id: string;
  phaseId: string | null;
};

export type PhaseParentRow = {
  id: string;
  parentPhaseId: string | null;
};

export function entrySeconds(
  entry: Pick<TimeEntryRow, "startedAt" | "endedAt">,
  now: Date = new Date()
): number {
  const end = entry.endedAt ?? now;
  const deltaMs = end.getTime() - entry.startedAt.getTime();
  return Math.max(0, Math.floor(deltaMs / 1000));
}

/** Sum seconds per task id. */
export function aggregateSecondsByTask(
  entries: TimeEntryRow[],
  now: Date = new Date()
): Map<string, number> {
  const byTask = new Map<string, number>();
  for (const entry of entries) {
    const seconds = entrySeconds(entry, now);
    if (seconds <= 0) continue;
    byTask.set(entry.taskId, (byTask.get(entry.taskId) ?? 0) + seconds);
  }
  return byTask;
}

function collectSubtreePhaseIds(rootId: string, childrenByParent: Map<string, string[]>): string[] {
  const result: string[] = [];
  const stack = [rootId];
  while (stack.length > 0) {
    const id = stack.pop()!;
    result.push(id);
    for (const childId of childrenByParent.get(id) ?? []) {
      stack.push(childId);
    }
  }
  return result;
}

/**
 * Roll task seconds up to phases (subtree sums) and project total.
 * Tasks with `phaseId === null` count only toward `projectSeconds`.
 */
export function rollupProjectPhaseTime(params: {
  tasks: TaskPhaseRow[];
  phases: PhaseParentRow[];
  byTaskSeconds: Map<string, number>;
}): { projectSeconds: number; byPhaseId: Record<string, number> } {
  const childrenByParent = new Map<string, string[]>();
  for (const phase of params.phases) {
    if (!phase.parentPhaseId) continue;
    const list = childrenByParent.get(phase.parentPhaseId) ?? [];
    list.push(phase.id);
    childrenByParent.set(phase.parentPhaseId, list);
  }

  const directByPhase = new Map<string, number>();
  let projectSeconds = 0;

  for (const task of params.tasks) {
    const seconds = params.byTaskSeconds.get(task.id) ?? 0;
    if (seconds <= 0) continue;
    projectSeconds += seconds;
    if (task.phaseId) {
      directByPhase.set(task.phaseId, (directByPhase.get(task.phaseId) ?? 0) + seconds);
    }
  }

  const byPhaseId: Record<string, number> = {};
  for (const phase of params.phases) {
    const subtreeIds = collectSubtreePhaseIds(phase.id, childrenByParent);
    let total = 0;
    for (const phaseId of subtreeIds) {
      total += directByPhase.get(phaseId) ?? 0;
    }
    if (total > 0) byPhaseId[phase.id] = total;
  }

  return { projectSeconds, byPhaseId };
}
