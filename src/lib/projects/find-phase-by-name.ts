export type PhaseRef = {
  id: string;
  name: string;
};

export type FindPhaseByNameResult =
  | { kind: "found"; phaseId: string }
  | { kind: "ambiguous"; names: string[] }
  | { kind: "not_found" };

export function findPhaseByName(phases: PhaseRef[], name: string): FindPhaseByNameResult {
  const trimmed = name.trim();
  if (!trimmed) return { kind: "not_found" };

  const lower = trimmed.toLowerCase();
  const matches = phases.filter((p) => p.name.toLowerCase() === lower);

  if (matches.length === 0) return { kind: "not_found" };
  if (matches.length > 1) {
    return { kind: "ambiguous", names: matches.map((p) => p.name) };
  }
  return { kind: "found", phaseId: matches[0]!.id };
}
