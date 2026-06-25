import { resolveScheduledDateToken } from "@/lib/dates/scheduled-date-input";
import { startOfLocalDay, toISODateString } from "@/lib/dates/local-day";
import { type ProjectCategory } from "@/lib/projects/categories";
import { parsePriorityWord } from "@/lib/tasks/priority";

import { matchCategorySegment } from "./fuzzy-category";
import { findProjectBySlug, fuzzyProjectSuggestions, type ProjectRef } from "./fuzzy-project";
import { parseRecurrencePhrase } from "@/lib/recurrence/parse-phrase";

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
  /** Explicit category from a `;` segment (1.4b layer 1). null = let the resolver decide. */
  category: ProjectCategory | null;
  /** RRULE body when a recurrence phrase is parsed (Phase 4). */
  rrule: string | null;
  /** Chip label for recurrence preview (Phase 4). */
  recurrenceLabel: string | null;
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
  return parse.warnings.length === 0 && parse.title.trim().length > 0;
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

const PROJECT_SLUG_PATTERN = /^#?([a-z0-9_-]+)$/i;
const PRIORITY_PATTERN = /^!{1,3}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function extractProjectSlugToken(token: string): string | null {
  const match = token.match(PROJECT_SLUG_PATTERN);
  return match ? match[1].toLowerCase() : null;
}

function collapseWhitespace(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

function parsePriority(token: string): 0 | 1 | 2 | 3 | null {
  if (!PRIORITY_PATTERN.test(token)) return null;
  return token.length as 1 | 2 | 3;
}

function parseSemicolonQuickInput(raw: string, ctx: ParseContext): ParseResult {
  const today = ctx.today ?? new Date();
  const todayIso = toISODateString(startOfLocalDay(today));

  const segments = raw
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  const title = collapseWhitespace(segments[0] ?? "") || "";

  let scheduledDate: string | null = todayIso;
  let bucketOverride: "later" | null = null;
  let projectSlug: string | null = null;
  let priority: 0 | 1 | 2 | 3 = 0;
  let category: ProjectCategory | null = null;
  let rrule: string | null = null;
  let recurrenceLabel: string | null = null;
  const warnings: ParseWarning[] = [];
  let suggestions: ProjectSuggestion[] = [];

  for (const segment of segments.slice(1)) {
    const dateResult = resolveScheduledDateToken(segment, today);
    if (dateResult) {
      scheduledDate = dateResult.scheduledDate;
      bucketOverride = dateResult.bucketOverride;
      continue;
    }

    if (ISO_DATE_PATTERN.test(segment.trim())) {
      warnings.push({ code: "invalid_property", property: segment });
      continue;
    }

    // Priority is a named `;` property — words (low/med/high), with `!`/`!!`/`!!!`
    // kept as a quiet alias for muscle memory. One input language (VF-1).
    const priorityResult = parsePriority(segment) ?? parsePriorityWord(segment);
    if (priorityResult !== null) {
      priority = priorityResult;
      continue;
    }

    // Category must be tried before the project slug — names like "relationships"
    // also satisfy the slug pattern, and an explicit category should win.
    const categoryMatch = matchCategorySegment(segment);
    if (categoryMatch) {
      category = categoryMatch;
      continue;
    }

    const recurrenceMatch = parseRecurrencePhrase(segment);
    if (recurrenceMatch) {
      rrule = recurrenceMatch.rrule;
      recurrenceLabel = recurrenceMatch.label;
      continue;
    }

    const slugCandidate = extractProjectSlugToken(segment);
    if (slugCandidate) {
      projectSlug = slugCandidate;
      continue;
    }

    warnings.push({ code: "invalid_property", property: segment });
  }

  if (projectSlug) {
    const match = findProjectBySlug(projectSlug, ctx.projects);
    if (match) {
      projectSlug = match.slug;
    } else {
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
    category,
    rrule,
    recurrenceLabel,
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
  const titleParts: string[] = [];

  const tokens = raw.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    const dateResult = resolveScheduledDateToken(token, today);
    if (dateResult) {
      scheduledDate = dateResult.scheduledDate;
      bucketOverride = dateResult.bucketOverride;
      continue;
    }

    // VF-1: the inline `!` priority token is retired alongside the `#project`
    // token (Q6). Priority is set only via the `;` property segment — one input
    // language. Anything that isn't a date here is plain title text.
    titleParts.push(token);
  }

  const title = collapseWhitespace(titleParts.join(" ")) || "";

  return {
    title,
    scheduledDate,
    bucketOverride,
    projectSlug: null,
    priority: 0,
    category: null,
    rrule: null,
    recurrenceLabel: null,
    warnings: [],
    suggestions: [],
  };
}
