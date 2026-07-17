import { findPhaseByName, type PhaseRef } from "@/lib/projects/find-phase-by-name";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function resolveParentByName(
  parentName: string,
  phaseRows: PhaseRef[]
): { ok: true; parentPhaseId: string; parentPhaseName: string } | { ok: false; error: string } {
  const match = findPhaseByName(phaseRows, parentName);
  if (match.kind === "ambiguous") {
    return {
      ok: false,
      error: `Multiple phases named "${parentName}" — pass parentPhaseId.`,
    };
  }
  if (match.kind === "not_found") {
    return { ok: false, error: `Parent phase "${parentName}" not found.` };
  }

  const parent = phaseRows.find((p) => p.id === match.phaseId);
  if (!parent) {
    return { ok: false, error: `Parent phase "${parentName}" not found.` };
  }
  return { ok: true, parentPhaseId: parent.id, parentPhaseName: parent.name };
}

/**
 * Resolve nest parent for create_phase. Tolerates model quirks: non-UUID
 * parentPhaseId treated as a name, and a bad UUID falls back to parentPhaseName.
 */
export function resolveCreatePhaseParent(
  row: {
    parentPhaseId?: string | null;
    parentPhaseName?: string | null;
  },
  phaseRows: PhaseRef[]
):
  | { ok: true; parentPhaseId: string | null; parentPhaseName: string | null }
  | { ok: false; error: string } {
  const rawId = row.parentPhaseId?.trim() || null;
  const parentName = row.parentPhaseName?.trim() || null;

  if (rawId && UUID.test(rawId)) {
    const parent = phaseRows.find((p) => p.id === rawId);
    if (parent) {
      return { ok: true, parentPhaseId: parent.id, parentPhaseName: parent.name };
    }
    if (parentName) return resolveParentByName(parentName, phaseRows);
    return { ok: false, error: `Parent phase ${rawId} not found in project.` };
  }

  // Model often passes a phase name in parentPhaseId when context lacks UUIDs.
  if (rawId) return resolveParentByName(rawId, phaseRows);

  if (!parentName) {
    return { ok: true, parentPhaseId: null, parentPhaseName: null };
  }

  return resolveParentByName(parentName, phaseRows);
}
