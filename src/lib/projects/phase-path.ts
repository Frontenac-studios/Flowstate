/**
 * The Miller board shows one phase per column, so revealing a task means
 * selecting every phase above it, root first (W17f).
 *
 * A task with no phase sits at the project root and needs an empty path, which
 * is also the answer when the chain is broken — better to land on the root
 * column than to render nothing.
 */

export type PhaseAncestry = { id: string; parentPhaseId: string | null };

export function phasePathForTask(
  phases: PhaseAncestry[],
  phaseId: string | null | undefined
): string[] {
  if (!phaseId) return [];

  const byId = new Map(phases.map((phase) => [phase.id, phase]));
  const path: string[] = [];
  let current = byId.get(phaseId);
  const seen = new Set<string>();

  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    current = current.parentPhaseId ? byId.get(current.parentPhaseId) : undefined;
  }

  return path;
}
