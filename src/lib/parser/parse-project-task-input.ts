import { resolveScheduledDateToken } from "@/lib/dates/scheduled-date-input";
import {
  parseParentDirPath,
  pathHasCreate,
  type ParentDirPathSegment,
  type ParsedParentDirPath,
} from "@/lib/parser/parse-parent-dir-path";
import {
  findPhaseAmongSiblings,
  findPhaseByName,
  type PhaseRef,
} from "@/lib/projects/find-phase-by-name";

export { parseParentDirSegment } from "@/lib/parser/parse-parent-dir-path";
export type { ParentDirPathSegment, ParsedParentDirPath } from "@/lib/parser/parse-parent-dir-path";

export type ProjectParseWarning =
  | { code: "invalid_property"; property: string; field: "due" | "priority" }
  | { code: "phase_not_found"; name: string; pathDisplay?: string; underParent?: string }
  | { code: "phase_ambiguous"; name: string; matches: string[]; pathDisplay?: string }
  | { code: "empty_phase_name" };

export type ParseProjectTaskContext = {
  today?: Date;
  phases: PhaseRef[];
  /** Normalized full paths (a//b) declared with + in this paste. */
  batchPlusPaths?: ReadonlySet<string>;
  parentPhaseId?: string | null;
};

export type ParseProjectTaskResult = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  priority: 0 | 1 | 2 | 3;
  /** Display path for chips (e.g. "A // B"). */
  parentDirName: string | null;
  parentDirPath: ParentDirPathSegment[] | null;
  pathKey: string | null;
  parentDirCreate: boolean;
  warnings: ProjectParseWarning[];
};

const PRIORITY_PATTERN = /^!{1,3}$/;

function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function parsePriority(token: string): 0 | 1 | 2 | 3 | null {
  if (!token) return 0;
  if (!PRIORITY_PATTERN.test(token)) return null;
  return token.length as 1 | 2 | 3;
}

function laterDefaults(): Pick<
  ParseProjectTaskResult,
  "scheduledDate" | "bucketOverride" | "parentDirCreate" | "parentDirPath" | "pathKey"
> {
  return {
    scheduledDate: null,
    bucketOverride: "later",
    parentDirCreate: false,
    parentDirPath: null,
    pathKey: null,
  };
}

/** Raw segment 4 from a semicolon-mode line (for batch + scan). */
export function extractParentDirSegmentRaw(line: string): string | null {
  if (!line.includes(";")) return null;
  const parts = line.split(";");
  const segment = parts[3]?.trim() ?? "";
  return segment || null;
}

function lookupPhaseAmongParent(
  ctx: ParseProjectTaskContext,
  name: string,
  parentPhaseId: string | null
): ReturnType<typeof findPhaseByName> {
  if (ctx.parentPhaseId !== undefined) {
    return findPhaseAmongSiblings(ctx.phases, name, parentPhaseId);
  }
  return findPhaseByName(ctx.phases, name);
}

function validateParentDirPath(
  ctx: ParseProjectTaskContext,
  path: ParsedParentDirPath,
  warnings: ProjectParseWarning[]
): void {
  if (ctx.batchPlusPaths?.has(path.pathKey)) return;

  const { segments, displayPath } = path;
  let parentPhaseId: string | null = ctx.parentPhaseId ?? null;
  let parentResolvedInDb = true;

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]!;
    const underParent = i > 0 ? (segments[i - 1]?.name ?? undefined) : undefined;

    if (seg.create) {
      parentResolvedInDb = false;
      continue;
    }

    if (!parentResolvedInDb) {
      warnings.push({
        code: "phase_not_found",
        name: seg.name,
        pathDisplay: displayPath,
        underParent,
      });
      continue;
    }

    const phaseResult = lookupPhaseAmongParent(ctx, seg.name, parentPhaseId);
    if (phaseResult.kind === "not_found") {
      warnings.push({
        code: "phase_not_found",
        name: seg.name,
        pathDisplay: displayPath,
        underParent,
      });
    } else if (phaseResult.kind === "ambiguous") {
      warnings.push({
        code: "phase_ambiguous",
        name: seg.name,
        matches: phaseResult.names,
        pathDisplay: displayPath,
      });
    } else {
      parentPhaseId = phaseResult.phaseId;
      parentResolvedInDb = true;
    }
  }
}

function applyParentDirSegment(
  parentDirSegment: string,
  ctx: ParseProjectTaskContext,
  warnings: ProjectParseWarning[]
): Pick<ParseProjectTaskResult, "parentDirName" | "parentDirPath" | "pathKey" | "parentDirCreate"> {
  const pathResult = parseParentDirPath(parentDirSegment);
  if (!pathResult.ok) {
    warnings.push({ code: "empty_phase_name" });
    return {
      parentDirName: null,
      parentDirPath: null,
      pathKey: null,
      parentDirCreate: false,
    };
  }

  const { path } = pathResult;
  validateParentDirPath(ctx, path, warnings);

  return {
    parentDirName: path.displayPath,
    parentDirPath: path.segments,
    pathKey: path.pathKey,
    parentDirCreate: pathHasCreate(path),
  };
}

function parsePositionalSegments(
  raw: string,
  ctx: ParseProjectTaskContext
): ParseProjectTaskResult {
  const today = ctx.today ?? new Date();
  const warnings: ProjectParseWarning[] = [];

  const parts = raw.split(";");
  const segments = [
    parts[0]?.trim() ?? "",
    parts[1]?.trim() ?? "",
    parts[2]?.trim() ?? "",
    parts[3]?.trim() ?? "",
  ];

  const title = collapseWhitespace(segments[0]) || "Untitled";

  let scheduledDate: string | null = null;
  let bucketOverride: "later" | null = "later";
  let priority: 0 | 1 | 2 | 3 = 0;
  let parentDirName: string | null = null;
  let parentDirPath: ParentDirPathSegment[] | null = null;
  let pathKey: string | null = null;
  let parentDirCreate = false;

  const dueSegment = segments[1];
  if (dueSegment) {
    const dateResult = resolveScheduledDateToken(dueSegment, today);
    if (dateResult) {
      scheduledDate = dateResult.scheduledDate;
      bucketOverride = dateResult.bucketOverride;
    } else {
      warnings.push({ code: "invalid_property", property: dueSegment, field: "due" });
    }
  }

  const prioritySegment = segments[2];
  if (prioritySegment) {
    const priorityResult = parsePriority(prioritySegment);
    if (priorityResult === null) {
      warnings.push({ code: "invalid_property", property: prioritySegment, field: "priority" });
    } else {
      priority = priorityResult;
    }
  }

  const parentDirSegment = segments[3];
  if (parentDirSegment) {
    const parentFields = applyParentDirSegment(parentDirSegment, ctx, warnings);
    parentDirName = parentFields.parentDirName;
    parentDirPath = parentFields.parentDirPath;
    pathKey = parentFields.pathKey;
    parentDirCreate = parentFields.parentDirCreate;
  }

  return {
    title,
    scheduledDate,
    bucketOverride,
    priority,
    parentDirName,
    parentDirPath,
    pathKey,
    parentDirCreate,
    warnings,
  };
}

export function isProjectTaskLineValid(parse: ParseProjectTaskResult): boolean {
  return !parse.warnings.some(
    (w) =>
      w.code === "invalid_property" ||
      w.code === "phase_not_found" ||
      w.code === "phase_ambiguous" ||
      w.code === "empty_phase_name"
  );
}

export function parseProjectTaskInput(
  raw: string,
  ctx: ParseProjectTaskContext
): ParseProjectTaskResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      title: "",
      ...laterDefaults(),
      priority: 0,
      parentDirName: null,
      warnings: [],
    };
  }

  if (!trimmed.includes(";")) {
    return {
      title: collapseWhitespace(trimmed) || "Untitled",
      ...laterDefaults(),
      priority: 0,
      parentDirName: null,
      warnings: [],
    };
  }

  return parsePositionalSegments(trimmed, ctx);
}

export {
  MAX_COMPOSER_LINES,
  replaceComposerLineAtIndex,
  removeComposerLineAtIndex,
} from "./parse-quick-input";

export type ParsedProjectLine = {
  lineIndex: number;
  raw: string;
  parse: ParseProjectTaskResult;
};

function collectBatchPlusPaths(rawLines: string[]): Set<string> {
  const paths = new Set<string>();
  for (const line of rawLines) {
    const segment = extractParentDirSegmentRaw(line);
    if (!segment) continue;
    const pathResult = parseParentDirPath(segment);
    if (!pathResult.ok) continue;
    if (pathHasCreate(pathResult.path)) {
      paths.add(pathResult.path.pathKey);
    }
  }
  return paths;
}

export function parseProjectTaskInputLines(
  raw: string,
  ctx: ParseProjectTaskContext
): ParsedProjectLine[] {
  const trimmedLines: string[] = [];
  for (const part of raw.split("\n")) {
    const trimmed = part.trim();
    if (trimmed) trimmedLines.push(trimmed);
  }

  const batchPlusPaths = collectBatchPlusPaths(trimmedLines);
  const batchCtx: ParseProjectTaskContext = {
    ...ctx,
    batchPlusPaths: batchPlusPaths.size > 0 ? batchPlusPaths : ctx.batchPlusPaths,
  };

  const lines: ParsedProjectLine[] = [];
  let lineIndex = 0;

  for (const trimmed of trimmedLines) {
    lines.push({
      lineIndex,
      raw: trimmed,
      parse: parseProjectTaskInput(trimmed, batchCtx),
    });
    lineIndex += 1;
  }

  return lines;
}
