import { normalizePhaseName } from "@/lib/projects/find-phase-by-name";

export type ParentDirPathSegment = { name: string; create: boolean };

export type ParsedParentDirPath = {
  segments: ParentDirPathSegment[];
  pathKey: string;
  displayPath: string;
};

export function parseParentDirSegment(segment: string): {
  name: string | null;
  create: boolean;
  emptyCreate: boolean;
} {
  const trimmed = segment.trim();
  if (!trimmed) {
    return { name: null, create: false, emptyCreate: false };
  }
  if (trimmed.startsWith("+")) {
    const name = trimmed.slice(1).trim();
    if (!name) {
      return { name: null, create: true, emptyCreate: true };
    }
    return { name, create: true, emptyCreate: false };
  }
  return { name: trimmed, create: false, emptyCreate: false };
}

export function buildPathKey(segmentNames: string[]): string {
  return segmentNames.map((n) => normalizePhaseName(n)).join("//");
}

export function buildDisplayPath(segmentNames: string[]): string {
  return segmentNames.join(" // ");
}

export type ParseParentDirPathResult =
  | { ok: true; path: ParsedParentDirPath }
  | { ok: false; emptySegment: true };

export function parseParentDirPath(segment4: string): ParseParentDirPathResult {
  const rawParts = segment4.split("//");
  const segments: ParentDirPathSegment[] = [];

  for (const part of rawParts) {
    const parsed = parseParentDirSegment(part);
    if (parsed.emptyCreate) {
      return { ok: false, emptySegment: true };
    }
    if (!parsed.name) {
      return { ok: false, emptySegment: true };
    }
    segments.push({ name: parsed.name, create: parsed.create });
  }

  if (segments.length === 0) {
    return { ok: false, emptySegment: true };
  }

  const names = segments.map((s) => s.name);
  return {
    ok: true,
    path: {
      segments,
      pathKey: buildPathKey(names),
      displayPath: buildDisplayPath(names),
    },
  };
}

/** True when any segment in the path is marked with +. */
export function pathHasCreate(path: ParsedParentDirPath): boolean {
  return path.segments.some((s) => s.create);
}
