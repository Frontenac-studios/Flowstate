import type { DependencyEdge } from "./types";

/** Per-task dependency state derived live (3.j) for the incomplete-task read path. */
export type DependencyState = {
  /** Has ≥1 active edge whose blocker is still incomplete. */
  isBlocked: boolean;
  /** The incomplete blocker task ids (treatment-C "waiting on X"). */
  blockedByIds: string[];
  /** Incomplete tasks directly blocked by this task — feeds blocker weight (3.d). */
  unblocksCount: number;
};

/** A window edge counts only until its expiry; project edges (null) always count. */
export function isActiveEdge(edge: Pick<DependencyEdge, "expiresAt">, now: Date): boolean {
  return edge.expiresAt === null || edge.expiresAt.getTime() > now.getTime();
}

/**
 * Compute `{ isBlocked, blockedByIds, unblocksCount }` for every incomplete task.
 *
 * Both endpoints of an edge must be incomplete to count: a completed blocker no
 * longer blocks (its task drops out of `incompleteTaskIds`), and we only annotate
 * the incomplete tasks that actually render. Expired window edges are ignored.
 */
export function computeDependencyState(
  edges: ReadonlyArray<DependencyEdge>,
  incompleteTaskIds: Iterable<string>,
  now: Date = new Date()
): Map<string, DependencyState> {
  const ids = Array.from(incompleteTaskIds);
  const incomplete = new Set(ids);
  const state = new Map<string, DependencyState>();
  for (const id of ids) {
    state.set(id, { isBlocked: false, blockedByIds: [], unblocksCount: 0 });
  }

  for (const edge of edges) {
    if (!isActiveEdge(edge, now)) continue;
    if (!incomplete.has(edge.blockerTaskId) || !incomplete.has(edge.blockedTaskId)) continue;

    const blocked = state.get(edge.blockedTaskId)!;
    blocked.isBlocked = true;
    blocked.blockedByIds.push(edge.blockerTaskId);

    state.get(edge.blockerTaskId)!.unblocksCount += 1;
  }

  return state;
}
