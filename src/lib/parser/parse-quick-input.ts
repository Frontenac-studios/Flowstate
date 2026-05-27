import {
  addDays,
  parseWeekdayToken,
  startOfLocalDay,
  toISODateString,
} from "@/lib/dates/local-day";

import { findProjectBySlug, fuzzyProjectSuggestions, type ProjectRef } from "./fuzzy-project";

export type ParseWarning =
  | {
      code: "project_not_found";
      slug: string;
    }
  | {
      code: "invalid_property";
      property: string;
    };

export type ProjectSuggestion = {
  slug: string;
  name: string;
};

export type ParseContext = {
  today?: Date;
  projects: ProjectRef[];
};

export type ParseResult = {
  title: string;
  scheduledDate: string | null;
  bucketOverride: "later" | null;
  projectSlug: string | null;
  priority: 0 | 1 | 2 | 3;
  warnings: ParseWarning[];
  suggestions: ProjectSuggestion[];
};

export type ParsedLine = {
  lineIndex: number;
  raw: string;
  parse: ParseResult;
};

export const MAX_COMPOSER_LINES = 50;

export function isLineProjectValid(parse: ParseResult): boolean {
  // A "valid" line must have zero warnings (missing projects, invalid semicolon properties, etc.).
  return parse.warnings.length === 0;
}

export function parseQuickInputLines(raw: string, ctx: ParseContext): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let lineIndex = 0;

  for (const part of raw.split("\n")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    lines.push({
      lineIndex,
      raw: trimmed,
      parse: parseQuickInput(trimmed, ctx),
    });
    lineIndex += 1;
  }

  return lines;
}

/** Update one non-empty line by its parseQuickInputLines index (not raw string match). */
export function replaceComposerLineAtIndex(
  value: string,
  lineIndex: number,
  newRaw: string
): string {
  let idx = 0;
  return value
    .split("\n")
    .map((line) => {
      if (!line.trim()) return line;
      if (idx === lineIndex) {
        idx += 1;
        return newRaw;
      }
      idx += 1;
      return line;
    })
    .join("\n");
}

/** Remove one non-empty line by its parseQuickInputLines index. */
export function removeComposerLineAtIndex(value: string, lineIndex: number): string {
  let idx = 0;
  const parts: string[] = [];
  for (const line of value.split("\n")) {
    if (!line.trim()) {
      parts.push(line);
      continue;
    }
    if (idx === lineIndex) {
      idx += 1;
      continue;
    }
    idx += 1;
    parts.push(line);
  }
  return parts.join("\n");
}

const WEEKDAY_PATTERN = /^(sun|mon|tue|wed|thu|fri|sat)$/i;
const PROJECT_PATTERN = /^#([a-z0-9_-]+)$/i;
const PRIORITY_PATTERN = /^!{1,3}$/;

function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function parsePriority(token: string): 0 | 1 | 2 | 3 | null {
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

function parseSemicolonQuickInput(raw: string, ctx: ParseContext): ParseResult {
  const today = ctx.today ?? new Date();
  const todayIso = toISODateString(startOfLocalDay(today));

  const segments = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const title = collapseWhitespace(segments[0] ?? "") || "Untitled";

  let scheduledDate: string | null = todayIso;
  let bucketOverride: "later" | null = null;
  let projectSlug: string | null = null;
  let priority: 0 | 1 | 2 | 3 = 0;
  const warnings: ParseWarning[] = [];
  let suggestions: ProjectSuggestion[] = [];

  for (const segment of segments.slice(1)) {
    const dateResult = resolveDateKeyword(segment, today);
    if (dateResult) {
      scheduledDate = dateResult.scheduledDate;
      bucketOverride = dateResult.bucketOverride;
      continue;
    }

    const priorityResult = parsePriority(segment);
    if (priorityResult !== null) {
      priority = priorityResult;
      continue;
    }

    const projectMatch = segment.match(PROJECT_PATTERN);
    if (projectMatch) {
      projectSlug = projectMatch[1].toLowerCase();
      continue;
    }

    warnings.push({ code: "invalid_property", property: segment });
  }

  if (projectSlug) {
    const match = findProjectBySlug(projectSlug, ctx.projects);
    if (!match) {
      warnings.push({ code: "project_not_found", slug: projectSlug });
      suggestions = fuzzyProjectSuggestions(projectSlug, ctx.projects).map((s) => ({
        slug: s.slug,
        name: s.name,
      }));
    }
  }

  return {
    title,
    scheduledDate,
    bucketOverride,
    projectSlug,
    priority,
    warnings,
    suggestions,
  };
}

export function parseQuickInput(raw: string, ctx: ParseContext): ParseResult {
  if (raw.includes(";")) {
    return parseSemicolonQuickInput(raw, ctx);
  }

  const today = ctx.today ?? new Date();
  const todayIso = toISODateString(startOfLocalDay(today));

  let scheduledDate: string | null = todayIso;
  let bucketOverride: "later" | null = null;
  let projectSlug: string | null = null;
  let priority: 0 | 1 | 2 | 3 = 0;
  const titleParts: string[] = [];

  const tokens = raw.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const dateResult = resolveDateKeyword(token, today);
    if (dateResult) {
      scheduledDate = dateResult.scheduledDate;
      bucketOverride = dateResult.bucketOverride;
      continue;
    }

    const priorityResult = parsePriority(token);
    if (priorityResult !== null) {
      priority = priorityResult;
      continue;
    }

    const projectMatch = token.match(PROJECT_PATTERN);
    if (projectMatch) {
      projectSlug = projectMatch[1].toLowerCase();
      continue;
    }

    titleParts.push(token);
  }

  const title = collapseWhitespace(titleParts.join(" ")) || "Untitled";
  const warnings: ParseWarning[] = [];
  let suggestions: ProjectSuggestion[] = [];

  if (projectSlug) {
    const match = findProjectBySlug(projectSlug, ctx.projects);
    if (!match) {
      warnings.push({ code: "project_not_found", slug: projectSlug });
      suggestions = fuzzyProjectSuggestions(projectSlug, ctx.projects).map((s) => ({
        slug: s.slug,
        name: s.name,
      }));
    }
  }

  return {
    title,
    scheduledDate,
    bucketOverride,
    projectSlug,
    priority,
    warnings,
    suggestions,
  };
}
