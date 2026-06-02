import {
  addDays,
  parseWeekdayToken,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";
import { findPhaseByName, type PhaseRef } from "@/lib/projects/find-phase-by-name";

export type ProjectParseWarning =
  | { code: "invalid_property"; property: string; field: "due" | "priority" }
  | { code: "phase_not_found"; name: string }
  | { code: "phase_ambiguous"; name: string; matches: string[] };

export type ParseProjectTaskContext = {
  today?: Date;
  phases: PhaseRef[];
};

export type ParseProjectTaskResult = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  priority: 0 | 1 | 2 | 3;
  parentDirName: string | null;
  warnings: ProjectParseWarning[];
};

const WEEKDAY_PATTERN = /^(sun|mon|tue|wed|thu|fri|sat)$/i;
const PRIORITY_PATTERN = /^!{1,3}$/;

function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function parsePriority(token: string): 0 | 1 | 2 | 3 | null {
  if (!token) return 0;
  if (!PRIORITY_PATTERN.test(token)) return null;
  return token.length as 1 | 2 | 3;
}

function resolveDateKeyword(
  token: string,
  today: Date
): { scheduledDate: string | null; bucketOverride: "later" | null } | null {
  const lower = token.toLowerCase();

  if (lower === "later") {
    return { scheduledDate: null, bucketOverride: "later" };
  }

  if (lower === "today") {
    return { scheduledDate: toISODateString(startOfLocalDay(today)), bucketOverride: null };
  }

  if (lower === "tomorrow") {
    return {
      scheduledDate: toISODateString(addDays(startOfLocalDay(today), 1)),
      bucketOverride: null,
    };
  }

  if (WEEKDAY_PATTERN.test(lower)) {
    const day = parseWeekdayToken(lower, today);
    if (!day) return null;
    return { scheduledDate: toISODateString(day), bucketOverride: null };
  }

  return null;
}

function laterDefaults(): Pick<ParseProjectTaskResult, "scheduledDate" | "bucketOverride"> {
  return { scheduledDate: null, bucketOverride: "later" };
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

  const dueSegment = segments[1];
  if (dueSegment) {
    const dateResult = resolveDateKeyword(dueSegment, today);
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
    parentDirName = parentDirSegment;
    const phaseResult = findPhaseByName(ctx.phases, parentDirSegment);
    if (phaseResult.kind === "not_found") {
      warnings.push({ code: "phase_not_found", name: parentDirSegment });
    } else if (phaseResult.kind === "ambiguous") {
      warnings.push({
        code: "phase_ambiguous",
        name: parentDirSegment,
        matches: phaseResult.names,
      });
    }
  }

  return {
    title,
    scheduledDate,
    bucketOverride,
    priority,
    parentDirName,
    warnings,
  };
}

export function isProjectTaskLineValid(parse: ParseProjectTaskResult): boolean {
  return !parse.warnings.some(
    (w) =>
      w.code === "invalid_property" || w.code === "phase_not_found" || w.code === "phase_ambiguous"
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

export function parseProjectTaskInputLines(
  raw: string,
  ctx: ParseProjectTaskContext
): ParsedProjectLine[] {
  const lines: ParsedProjectLine[] = [];
  let lineIndex = 0;

  for (const part of raw.split("\n")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    lines.push({
      lineIndex,
      raw: trimmed,
      parse: parseProjectTaskInput(trimmed, ctx),
    });
    lineIndex += 1;
  }

  return lines;
}
