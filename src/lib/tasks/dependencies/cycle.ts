/**
 * Cycle prevention for dependency inserts (Phase 3.2 / 3.j).
 *
 * Adding `blocker → blocked` ("blocker must finish before blocked") closes a cycle
 * iff `blocked` can already reach `blocker` by following existing "blocks" edges.
 * The caller passes the **active** (non-expired) edge set of both kinds combined.
 * Pure + offline-safe; a `seen` set guards against any pre-existing loops in data.
 */
export function wouldCreateCycle(
  activeEdges: ReadonlyArray<{ blockerTaskId: string; blockedTaskId: string }>,
  blockerTaskId: string,
  blockedTaskId: string
): boolean {
  // A self-link is a trivial cycle.
  if (blockerTaskId === blockedTaskId) return true;

  // Adjacency over the "blocks" graph: blocker -> [blocked, ...].
  const blocks = new Map<string, string[]>();
  for (const edge of activeEdges) {
    const list = blocks.get(edge.blockerTaskId);
    if (list) list.push(edge.blockedTaskId);
    else blocks.set(edge.blockerTaskId, [edge.blockedTaskId]);
  }

  // DFS from `blocked`; if we can reach `blocker`, the new edge closes a loop.
  const stack = [blockedTaskId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (node === blockerTaskId) return true;
    if (seen.has(node)) continue;
    seen.add(node);
    const next = blocks.get(node);
    if (next) stack.push(...next);
  }
  return false;
}
