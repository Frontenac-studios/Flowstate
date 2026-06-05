import type { ParsedProjectLine } from "@/lib/parser/parse-project-task-input";
import type { ParentDirPathSegment } from "@/lib/parser/parse-parent-dir-path";
import { findPhaseAmongSiblings, type PhaseRef } from "@/lib/projects/find-phase-by-name";

export type ComposerLinePhaseResolution = {
  phaseId: string | null;
  /** Target phase would be newly created — skip matching against existing tasks. */
  skipExistingCheck: boolean;
};

export function mergeComposerPathCreateMasks(
  lines: ParsedProjectLine[],
  pathKey: string
): ParentDirPathSegment[] | null {
  let merged: boolean[] | null = null;
  let segments: ParentDirPathSegment[] | null = null;

  for (const line of lines) {
    if (line.parse.pathKey !== pathKey || !line.parse.parentDirPath) continue;
    segments = line.parse.parentDirPath;
    if (!merged) {
      merged = line.parse.parentDirPath.map((s) => s.create);
    } else {
      for (let i = 0; i < line.parse.parentDirPath.length; i += 1) {
        merged[i] = merged[i] || line.parse.parentDirPath[i]!.create;
      }
    }
  }

  if (!segments || !merged) return null;
  return segments.map((s, i) => ({ name: s.name, create: merged![i] ?? false }));
}

function resolveExistingPathToLeafPhaseId(
  segments: ParentDirPathSegment[],
  anchorParentId: string | null,
  phases: PhaseRef[]
): ComposerLinePhaseResolution {
  let parentId = anchorParentId;

  for (const seg of segments) {
    const existing = findPhaseAmongSiblings(phases, seg.name, parentId);

    if (seg.create) {
      if (existing.kind === "found") {
        parentId = existing.phaseId;
        continue;
      }
      return { phaseId: parentId, skipExistingCheck: true };
    }

    if (existing.kind !== "found") {
      return { phaseId: parentId, skipExistingCheck: false };
    }
    parentId = existing.phaseId;
  }

  return { phaseId: parentId, skipExistingCheck: false };
}

export function buildComposerLeafPhaseIdByPathKey(
  lines: ParsedProjectLine[],
  phases: PhaseRef[],
  parentPhaseId: string | null
): Map<string, ComposerLinePhaseResolution> {
  const pathKeys = new Set<string>();
  for (const line of lines) {
    if (line.parse.pathKey) pathKeys.add(line.parse.pathKey);
  }

  const sortedKeys = Array.from(pathKeys).sort(
    (a, b) => a.split("//").length - b.split("//").length
  );

  const leafPhaseIdByPathKey = new Map<string, ComposerLinePhaseResolution>();

  for (const pathKey of sortedKeys) {
    const segmentsWithMask = mergeComposerPathCreateMasks(lines, pathKey);
    if (!segmentsWithMask) continue;

    leafPhaseIdByPathKey.set(
      pathKey,
      resolveExistingPathToLeafPhaseId(segmentsWithMask, parentPhaseId, phases)
    );
  }

  return leafPhaseIdByPathKey;
}

export type ResolveComposerLinePhaseIdParams = {
  phases: PhaseRef[];
  defaultPhaseId: string | null;
  parentPhaseId: string | null;
  allLines: ParsedProjectLine[];
  leafPhaseIdByPathKey?: Map<string, ComposerLinePhaseResolution>;
};

export function resolveComposerLinePhaseIdSync(
  line: ParsedProjectLine,
  params: ResolveComposerLinePhaseIdParams
): ComposerLinePhaseResolution {
  const leafPhaseIdByPathKey =
    params.leafPhaseIdByPathKey ??
    buildComposerLeafPhaseIdByPathKey(params.allLines, params.phases, params.parentPhaseId);

  const key = line.parse.pathKey;
  if (key) {
    const resolved = leafPhaseIdByPathKey.get(key);
    if (resolved) return resolved;
    return {
      phaseId: params.defaultPhaseId ?? params.parentPhaseId,
      skipExistingCheck: false,
    };
  }

  return {
    phaseId: params.defaultPhaseId ?? params.parentPhaseId,
    skipExistingCheck: false,
  };
}
