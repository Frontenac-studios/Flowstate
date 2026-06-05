import { isScheduledDateToken, suggestScheduledDateToken } from "@/lib/dates/scheduled-date-input";

import { findProjectBySlug, fuzzyProjectSuggestions, type ProjectRef } from "./fuzzy-project";

export const COMPOSER_PROPERTY_ORDER = ["title", "due", "priority", "project"] as const;

export type ComposerProperty = (typeof COMPOSER_PROPERTY_ORDER)[number];

export type PropertyStatus = "active" | "filled" | "pending";

export type ComposerAssistState = {
  properties: Array<{ key: ComposerProperty; status: PropertyStatus }>;
  activeProperty: ComposerProperty;
  suggestion: string | null;
  suggestionSuffix: string | null;
  segmentIndex: number;
  inSemicolonMode: boolean;
};

export type ComposerAssistContext = {
  projects: ProjectRef[];
  lastProjectSlug?: string | null;
};

const PRIORITY_PATTERN = /^!{1,3}$/;

function stripOptionalHash(segment: string): string {
  return segment.trim().replace(/^#/, "");
}

function matchesProjectToken(segment: string, projects: ProjectRef[]): boolean {
  const stripped = stripOptionalHash(segment);
  if (!/^[a-z0-9_-]+$/i.test(stripped)) return false;
  return findProjectBySlug(stripped, projects) !== null;
}

export function getLineAtCursor(
  value: string,
  cursor: number
): { lineText: string; lineStart: number; cursorInLine: number } {
  const safeCursor = Math.max(0, Math.min(cursor, value.length));
  const before = value.slice(0, safeCursor);
  const lineStart = before.lastIndexOf("\n") + 1;
  const nextNewline = value.indexOf("\n", safeCursor);
  const lineEnd = nextNewline === -1 ? value.length : nextNewline;
  return {
    lineText: value.slice(lineStart, lineEnd),
    lineStart,
    cursorInLine: safeCursor - lineStart,
  };
}

function matchesDateToken(segment: string): boolean {
  return isScheduledDateToken(segment);
}

function matchesPriorityToken(segment: string): boolean {
  return PRIORITY_PATTERN.test(segment.trim());
}

export function segmentMatchesProperty(
  segment: string,
  property: ComposerProperty,
  projects: ProjectRef[] = []
): boolean {
  const trimmed = segment.trim();
  switch (property) {
    case "title":
      return trimmed.length > 0;
    case "due":
      return matchesDateToken(trimmed);
    case "project":
      return matchesProjectToken(trimmed, projects);
    case "priority":
      return matchesPriorityToken(trimmed);
  }
}

function propertyForSegmentIndex(index: number): ComposerProperty | null {
  if (index <= 0) return "title";
  if (index === 1) return "due";
  if (index === 2) return "priority";
  if (index === 3) return "project";
  return null;
}

function nextProperty(property: ComposerProperty): ComposerProperty | null {
  const idx = COMPOSER_PROPERTY_ORDER.indexOf(property);
  if (idx < 0 || idx >= COMPOSER_PROPERTY_ORDER.length - 1) return null;
  return COMPOSER_PROPERTY_ORDER[idx + 1] ?? null;
}

function splitLineSegments(lineText: string): string[] {
  return lineText.split(";").map((s) => s.trim());
}

function getSegmentIndexAtCursor(lineText: string, cursorInLine: number): number {
  let segmentIndex = 0;
  for (let i = 0; i < cursorInLine; i += 1) {
    if (lineText[i] === ";") segmentIndex += 1;
  }
  return segmentIndex;
}

function getCurrentSegmentRaw(lineText: string, cursorInLine: number): string {
  const prevSemi = lineText.lastIndexOf(";", cursorInLine - 1);
  const segmentStart = prevSemi + 1;
  return lineText.slice(segmentStart, cursorInLine);
}

function getProjectSuggestion(partial: string, ctx: ComposerAssistContext): string | null {
  const stripped = stripOptionalHash(partial);
  if (stripped) {
    const exact = findProjectBySlug(stripped, ctx.projects);
    if (exact) return exact.slug;

    const suggestions = fuzzyProjectSuggestions(stripped, ctx.projects, 1);
    const top = suggestions[0];
    if (top && top.slug.toLowerCase().startsWith(stripped.toLowerCase())) {
      return top.slug;
    }
    return null;
  }

  if (ctx.lastProjectSlug) {
    const match = ctx.projects.find((p) => p.slug === ctx.lastProjectSlug);
    if (match) return match.slug;
  }
  return ctx.projects[0]?.slug ?? null;
}

function getDefaultSuggestion(
  property: ComposerProperty,
  ctx: ComposerAssistContext,
  partial = ""
): string | null {
  switch (property) {
    case "title":
      return null;
    case "due":
      return suggestScheduledDateToken(partial);
    case "project":
      return getProjectSuggestion(partial, ctx);
    case "priority":
      return "!";
  }
}

function computeSuggestionSuffix(partial: string, suggestion: string): string | null {
  if (!suggestion) return null;
  const normalizedPartial = stripOptionalHash(partial);
  if (!normalizedPartial) return suggestion;
  if (suggestion.toLowerCase().startsWith(normalizedPartial.toLowerCase())) {
    return suggestion.slice(normalizedPartial.length);
  }
  return null;
}

function isPropertyFilled(
  segments: string[],
  property: ComposerProperty,
  projects: ProjectRef[]
): boolean {
  const index = COMPOSER_PROPERTY_ORDER.indexOf(property);
  const segment = segments[index];
  if (segment === undefined) return false;
  return segmentMatchesProperty(segment, property, projects);
}

function buildPropertyStatuses(
  segments: string[],
  activeProperty: ComposerProperty | null,
  inSemicolonMode: boolean,
  projects: ProjectRef[]
): Array<{ key: ComposerProperty; status: PropertyStatus }> {
  return COMPOSER_PROPERTY_ORDER.map((key) => {
    if (activeProperty && key === activeProperty) {
      return { key, status: "active" as const };
    }
    if (key === "title") {
      const filled = inSemicolonMode
        ? isPropertyFilled(segments, "title", projects)
        : segments[0]?.trim().length > 0;
      return { key, status: filled ? ("filled" as const) : ("pending" as const) };
    }
    if (!inSemicolonMode) {
      return { key, status: "pending" as const };
    }
    return {
      key,
      status: isPropertyFilled(segments, key, projects)
        ? ("filled" as const)
        : ("pending" as const),
    };
  });
}

export function getComposerAssist(
  lineText: string,
  cursorInLine: number,
  ctx: ComposerAssistContext
): ComposerAssistState {
  const inSemicolonMode = lineText.includes(";");
  const segments = splitLineSegments(lineText);
  const segmentIndex = getSegmentIndexAtCursor(lineText, cursorInLine);
  const segmentRaw = getCurrentSegmentRaw(lineText, cursorInLine);
  const segmentTrimmed = segmentRaw.trim();

  let activeProperty: ComposerProperty = "title";
  let suggestion: string | null = null;
  let suggestionSuffix: string | null = null;

  if (inSemicolonMode) {
    const segmentProperty = propertyForSegmentIndex(segmentIndex);

    if (segmentProperty === null) {
      const properties = buildPropertyStatuses(segments, null, inSemicolonMode, ctx.projects);
      return {
        properties,
        activeProperty: "project",
        suggestion: null,
        suggestionSuffix: null,
        segmentIndex,
        inSemicolonMode,
      };
    }

    activeProperty = segmentProperty;

    if (
      segmentProperty !== "title" &&
      segmentMatchesProperty(segmentTrimmed, segmentProperty, ctx.projects)
    ) {
      const advanced = nextProperty(segmentProperty);
      if (advanced) activeProperty = advanced;
    }

    const editingProperty =
      segmentProperty !== "title" &&
      !segmentMatchesProperty(segmentTrimmed, segmentProperty, ctx.projects)
        ? segmentProperty
        : activeProperty !== segmentProperty &&
            segmentIndex >= 1 &&
            segmentIndex <= 3 &&
            !segmentTrimmed
          ? activeProperty
          : null;

    const suggestFor =
      editingProperty ??
      (segmentProperty !== "title" &&
      !segmentMatchesProperty(segmentTrimmed, segmentProperty, ctx.projects)
        ? segmentProperty
        : null);

    const propertyToSuggest = suggestFor && suggestFor !== "title" ? suggestFor : null;

    if (propertyToSuggest) {
      const partial =
        propertyToSuggest === "project" || propertyToSuggest === "due" ? segmentTrimmed : "";
      suggestion = getDefaultSuggestion(propertyToSuggest, ctx, partial);
      if (suggestion) {
        suggestionSuffix = computeSuggestionSuffix(segmentTrimmed, suggestion);
      }
    }

    if (
      segmentProperty !== "title" &&
      segmentMatchesProperty(segmentTrimmed, segmentProperty, ctx.projects) &&
      !suggestionSuffix
    ) {
      suggestion = null;
      suggestionSuffix = null;
    }
  }

  const properties = buildPropertyStatuses(segments, activeProperty, inSemicolonMode, ctx.projects);

  return {
    properties,
    activeProperty,
    suggestion,
    suggestionSuffix,
    segmentIndex,
    inSemicolonMode,
  };
}

export function getComposerAssistFromValue(
  value: string,
  cursor: number,
  ctx: ComposerAssistContext
): ComposerAssistState {
  const { lineText, cursorInLine } = getLineAtCursor(value, cursor);
  return getComposerAssist(lineText, cursorInLine, ctx);
}

/** Text to insert when accepting a suggestion (suffix only). */
export function getAcceptInsertText(state: ComposerAssistState): string | null {
  if (!state.suggestionSuffix) return null;
  return state.suggestionSuffix;
}

/** Whether accepting should append `; ` to advance to the next property segment. */
export function shouldAppendSemicolonAfterAccept(
  lineText: string,
  cursorInLine: number,
  state: ComposerAssistState
): boolean {
  if (!state.suggestion || state.activeProperty === "title") return false;
  if (nextProperty(state.activeProperty) === null) return false;
  const afterInsert = lineText.slice(cursorInLine);
  const trimmedAfter = afterInsert.trimStart();
  if (trimmedAfter.startsWith(";")) return false;
  return true;
}

export const LAST_PROJECT_SLUG_KEY = "kash:last-project-slug";

export function readLastProjectSlug(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(LAST_PROJECT_SLUG_KEY);
  } catch {
    return null;
  }
}

export function writeLastProjectSlug(slug: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LAST_PROJECT_SLUG_KEY, slug);
  } catch {
    // ignore quota / private mode
  }
}
