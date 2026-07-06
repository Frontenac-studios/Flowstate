import { isScheduledDateToken, suggestScheduledDateToken } from "@/lib/dates/scheduled-date-input";
import { parsePriorityWord, PRIORITY_WORD_SUGGESTIONS } from "@/lib/tasks/priority";

import {
  type AssistConfig,
  type AssistState,
  computeAssist,
  computeSuggestionSuffix,
  type FallbackSuggestion,
  getAcceptInsertText as coreGetAcceptInsertText,
  getLineAtCursor,
  type PropertyStatus,
  shouldAppendSemicolonAfterAccept as coreShouldAppendSemicolonAfterAccept,
} from "./composer-assist-core";
import { fuzzyCategorySuggestions, matchCategorySegment } from "./fuzzy-category";
import { findProjectBySlug, fuzzyProjectSuggestions, type ProjectRef } from "./fuzzy-project";

export { getLineAtCursor };
export type { PropertyStatus };

export const COMPOSER_PROPERTY_ORDER = ["title", "due", "priority", "project", "category"] as const;

export type ComposerProperty = (typeof COMPOSER_PROPERTY_ORDER)[number];

export type ComposerAssistState = AssistState<ComposerProperty>;

export type ComposerAssistContext = {
  projects: ProjectRef[];
  lastProjectSlug?: string | null;
  /** Existing task tags for autocomplete (Phase 5). */
  tagVocabulary?: readonly string[];
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

function matchesDateToken(segment: string): boolean {
  return isScheduledDateToken(segment);
}

function matchesPriorityToken(segment: string): boolean {
  const trimmed = segment.trim();
  return PRIORITY_PATTERN.test(trimmed) || parsePriorityWord(trimmed) !== null;
}

// Complete a partial priority word to its canonical form (low/med/high). No
// default ghost on an empty segment — priority is opt-in.
function getPrioritySuggestion(partial: string): string | null {
  const typed = partial.trim().toLowerCase();
  if (!typed) return null;
  return PRIORITY_WORD_SUGGESTIONS.find((word) => word.startsWith(typed)) ?? null;
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
    case "category":
      return matchCategorySegment(trimmed) !== null;
  }
}

function getProjectSuggestion(partial: string, ctx: ComposerAssistContext): string | null {
  const stripped = stripOptionalHash(partial);
  if (stripped) {
    const exact = findProjectBySlug(stripped, ctx.projects);
    if (exact) return exact.slug;

    const suggestions = fuzzyProjectSuggestions(stripped, ctx.projects, 1);
    const top = suggestions[0];
    if (!top) return null;
    const lower = stripped.toLowerCase();
    if (top.slug.toLowerCase().startsWith(lower) || top.name.toLowerCase().startsWith(lower)) {
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

function looksLikeProjectPartial(partial: string): boolean {
  return /^#?[a-z0-9_-]*$/i.test(partial.trim());
}

/** When the cursor is on a non-title segment that doesn't match that slot, still offer project completion. */
function tryProjectFallbackSuggestion(
  segmentTrimmed: string,
  ctx: ComposerAssistContext
): FallbackSuggestion<ComposerProperty> | null {
  if (!segmentTrimmed || !looksLikeProjectPartial(segmentTrimmed)) return null;
  if (matchesDateToken(segmentTrimmed)) return null;
  if (matchesPriorityToken(segmentTrimmed) || getPrioritySuggestion(segmentTrimmed) !== null) {
    return null;
  }
  if (matchCategorySegment(segmentTrimmed) !== null) return null;

  const suggestion = getProjectSuggestion(segmentTrimmed, ctx);
  if (!suggestion) return null;
  const suggestionSuffix = computeSuggestionSuffix(segmentTrimmed, suggestion, stripOptionalHash);
  if (!suggestionSuffix) return null;
  return { property: "project", suggestion, suggestionSuffix };
}

// Complete a partial category name to its label (or key) when one is a prefix of
// what's typed. No default ghost on an empty segment — there's no canonical default
// category here (the accent bar already shows the resolver's assumption).
function getCategorySuggestion(partial: string): string | null {
  const typed = partial.trim();
  if (!typed) return null;
  const lower = typed.toLowerCase();
  const [top] = fuzzyCategorySuggestions(typed, undefined, 1);
  if (!top) return null;
  if (top.label.toLowerCase().startsWith(lower)) return top.label;
  if (top.category.toLowerCase().startsWith(lower)) return top.category;
  return null;
}

function getTagSuggestion(partial: string, vocabulary: readonly string[]): string | null {
  const typed = partial.trim().replace(/^#+/, "").toLowerCase();
  if (!typed) return vocabulary[0] ?? null;
  const match = vocabulary.find(
    (tag) => tag.toLowerCase().startsWith(typed) || tag.toLowerCase().includes(typed)
  );
  return match ?? null;
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
      return getPrioritySuggestion(partial);
    case "category":
      return getCategorySuggestion(partial);
  }
}

export type BuildComposerConfigOptions = {
  /** Property segments to expose, in order. Defaults to the full grammar. */
  properties?: readonly ComposerProperty[];
  /** Offer a project-slug completion in any non-title segment. Default true. */
  projectFallback?: boolean;
  /** Offer tag completion in trailing segments past the last property. Default true. */
  tagSegments?: boolean;
};

/**
 * Build an assist config for a composer input. Callers that only support a
 * subset of task properties (e.g. inline edit can't set a due date, backlog
 * capture has no project/priority) pass a reduced `properties` list so the
 * engine never ghosts an affordance the surface can't persist.
 */
export function buildComposerConfig(
  ctx: ComposerAssistContext,
  options: BuildComposerConfigOptions = {}
): AssistConfig<ComposerProperty> {
  const {
    properties = COMPOSER_PROPERTY_ORDER,
    projectFallback = true,
    tagSegments = true,
  } = options;
  return {
    order: properties,
    matchProperty: (segment, property) => segmentMatchesProperty(segment, property, ctx.projects),
    suggest: (property, partial) => getDefaultSuggestion(property, ctx, partial),
    usesPartial: (property) => property !== "title",
    normalizeForSuffix: stripOptionalHash,
    extraSegmentSuggestion: tagSegments
      ? (segmentTrimmed) => getTagSuggestion(segmentTrimmed, ctx.tagVocabulary ?? [])
      : undefined,
    fallbackSuggestion: projectFallback
      ? (segmentTrimmed) => tryProjectFallbackSuggestion(segmentTrimmed, ctx)
      : undefined,
  };
}

export function getComposerAssist(
  lineText: string,
  cursorInLine: number,
  ctx: ComposerAssistContext
): ComposerAssistState {
  return computeAssist(lineText, cursorInLine, buildComposerConfig(ctx));
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
  return coreGetAcceptInsertText(state);
}

/** Whether accepting should append `; ` to advance to the next property segment. */
export function shouldAppendSemicolonAfterAccept(
  lineText: string,
  cursorInLine: number,
  state: ComposerAssistState
): boolean {
  return coreShouldAppendSemicolonAfterAccept(
    COMPOSER_PROPERTY_ORDER,
    lineText,
    cursorInLine,
    state
  );
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
