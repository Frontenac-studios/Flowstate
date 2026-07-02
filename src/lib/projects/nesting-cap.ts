/**
 * P5 — UI + template nesting cap (schema allows deeper self-reference).
 *
 * Supported shape: project → phase → subphase → task.
 * Root phases (`parentPhaseId === null`) may have one child tier only; deeper
 * phase directories are rejected in the API and should not appear in templates.
 */
export const MAX_UI_PHASE_DEPTH = 2;

export type PhaseParentRef = { id: string; parentPhaseId: string | null };

/** 1 = root phase, 2 = subphase; null when parent id is unknown. */
export function phaseDepth(phaseId: string, phases: readonly PhaseParentRef[]): number | null {
  const byId = new Map(phases.map((p) => [p.id, p]));
  let depth = 0;
  let current: string | null = phaseId;
  while (current) {
    depth += 1;
    const row = byId.get(current);
    if (!row) return null;
    current = row.parentPhaseId;
  }
  return depth;
}

/** Throws when nesting a new phase under `parentPhaseId` would exceed the cap. */
export function assertPhaseNestAllowed(
  parentPhaseId: string | null | undefined,
  phases: readonly PhaseParentRef[]
): void {
  if (!parentPhaseId) return;
  const parentDepth = phaseDepth(parentPhaseId, phases);
  if (parentDepth === null) {
    throw new Error("Parent phase not found.");
  }
  if (parentDepth >= MAX_UI_PHASE_DEPTH) {
    throw new Error(
      "Phases nest at most two levels (phase → subphase). Add tasks instead of another directory."
    );
  }
}
