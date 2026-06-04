export type PhaseRef = {
  id: string;
  name: string;
  parentPhaseId: string | null;
};

export type FindPhaseByNameResult =
  | { kind: "found"; phaseId: string }
  | { kind: "ambiguous"; names: string[] }
  | { kind: "not_found" };

function normalizePhaseName(name: string): string {
  return name.trim().toLowerCase();
}

export function findPhaseByName(phases: PhaseRef[], name: string): FindPhaseByNameResult {
  const trimmed = name.trim();
  if (!trimmed) return { kind: "not_found" };

  const lower = normalizePhaseName(trimmed);
  const matches = phases.filter((p) => p.name.toLowerCase() === lower);

  if (matches.length === 0) return { kind: "not_found" };
  if (matches.length > 1) {
    return { kind: "ambiguous", names: matches.map((p) => p.name) };
  }
  return { kind: "found", phaseId: matches[0]!.id };
}

/** Match phases that share the same parent (sibling scope under a Miller column). */
export function findPhaseAmongSiblings(
  phases: PhaseRef[],
  name: string,
  parentPhaseId: string | null
): FindPhaseByNameResult {
  const trimmed = name.trim();
  if (!trimmed) return { kind: "not_found" };

  const lower = normalizePhaseName(trimmed);
  const siblings = phases.filter((p) => p.parentPhaseId === parentPhaseId);
  const matches = siblings.filter((p) => p.name.toLowerCase() === lower);

  if (matches.length === 0) return { kind: "not_found" };
  if (matches.length > 1) {
    return { kind: "ambiguous", names: matches.map((p) => p.name) };
  }
  return { kind: "found", phaseId: matches[0]!.id };
}

export { normalizePhaseName };
