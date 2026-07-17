/**
 * Phase nesting — Miller columns treat phases as directories of arbitrary depth.
 *
 * Schema: self-referential `parentPhaseId`. UI + API allow unlimited depth;
 * `assertPhaseNestAllowed` only verifies the parent exists in the project.
 */

export type PhaseParentRef = { id: string; parentPhaseId: string | null };

/** 1 = root phase; null when parent id is unknown / broken chain. */
export function phaseDepth(phaseId: string, phases: readonly PhaseParentRef[]): number | null {
  const byId = new Map(phases.map((p) => [p.id, p]));
  let depth = 0;
  let current: string | null = phaseId;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current)) return null;
    seen.add(current);
    depth += 1;
    const row = byId.get(current);
    if (!row) return null;
    current = row.parentPhaseId;
  }
  return depth;
}

/** Throws when `parentPhaseId` is set but not found in `phases`. */
export function assertPhaseNestAllowed(
  parentPhaseId: string | null | undefined,
  phases: readonly PhaseParentRef[]
): void {
  if (!parentPhaseId) return;
  if (!phases.some((p) => p.id === parentPhaseId)) {
    throw new Error("Parent phase not found.");
  }
}
