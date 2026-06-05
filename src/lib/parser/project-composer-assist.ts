import { isScheduledDateToken, suggestScheduledDateToken } from "@/lib/dates/scheduled-date-input";
import { getLineAtCursor } from "@/lib/parser/composer-assist";
import type { PhaseRef } from "@/lib/projects/find-phase-by-name";

export const PROJECT_COMPOSER_PROPERTY_ORDER = ["title", "due", "priority", "parentDir"] as const;

export type ProjectComposerProperty = (typeof PROJECT_COMPOSER_PROPERTY_ORDER)[number];

export type PropertyStatus = "active" | "filled" | "pending";

export type ProjectComposerAssistState = {
  properties: Array<{ key: ProjectComposerProperty; status: PropertyStatus }>;
  activeProperty: ProjectComposerProperty;
  suggestion: string | null;
  suggestionSuffix: string | null;
  segmentIndex: number;
  inSemicolonMode: boolean;
};

export type ProjectComposerAssistContext = {
  phases: PhaseRef[];
  parentPhaseId?: string | null;
};

const PRIORITY_PATTERN = /^!{1,3}$/;

function matchesDateToken(segment: string): boolean {
  return isScheduledDateToken(segment);
}

function matchesPriorityToken(segment: string): boolean {
  return PRIORITY_PATTERN.test(segment.trim());
}

function matchesParentDirToken(segment: string, ctx: ProjectComposerAssistContext): boolean {
  const trimmed = segment.trim();
  if (!trimmed) return false;
  if (trimmed.includes("//") || trimmed.includes("+")) return true;

  const siblings = getSiblingPhases(ctx);
  return siblings.some((phase) => phase.name.toLowerCase() === trimmed.toLowerCase());
}

export function projectSegmentMatchesProperty(
  segment: string,
  property: ProjectComposerProperty,
  ctx?: ProjectComposerAssistContext
): boolean {
  const trimmed = segment.trim();
  switch (property) {
    case "title":
      return trimmed.length > 0;
    case "due":
      return matchesDateToken(trimmed);
    case "priority":
      return matchesPriorityToken(trimmed);
    case "parentDir":
      return ctx ? matchesParentDirToken(segment, ctx) : trimmed.length > 0;
  }
}

function propertyForSegmentIndex(index: number): ProjectComposerProperty | null {
  if (index <= 0) return "title";
  if (index === 1) return "due";
  if (index === 2) return "priority";
  if (index === 3) return "parentDir";
  return null;
}

function nextProperty(property: ProjectComposerProperty): ProjectComposerProperty | null {
  const idx = PROJECT_COMPOSER_PROPERTY_ORDER.indexOf(property);
  if (idx < 0 || idx >= PROJECT_COMPOSER_PROPERTY_ORDER.length - 1) return null;
  return PROJECT_COMPOSER_PROPERTY_ORDER[idx + 1] ?? null;
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

function getSiblingPhases(ctx: ProjectComposerAssistContext): PhaseRef[] {
  const parentPhaseId = ctx.parentPhaseId ?? null;
  return ctx.phases.filter((phase) => phase.parentPhaseId === parentPhaseId);
}

function getParentDirSuggestion(partial: string, ctx: ProjectComposerAssistContext): string | null {
  const siblings = getSiblingPhases(ctx);
  if (siblings.length === 0) return null;

  const trimmed = partial.trim();
  if (!trimmed) return siblings[0]?.name ?? null;

  const lower = trimmed.toLowerCase();
  const matches = siblings.filter((phase) => phase.name.toLowerCase().startsWith(lower));
  return matches[0]?.name ?? null;
}

function parentDirSegmentSupportsCompletion(lineText: string): boolean {
  const segment = lineText.split(";")[3]?.trim() ?? "";
  return segment.length === 0 || (!segment.includes("//") && !segment.includes("+"));
}

function getDefaultSuggestion(
  property: ProjectComposerProperty,
  ctx: ProjectComposerAssistContext,
  partial = ""
): string | null {
  switch (property) {
    case "title":
      return null;
    case "due":
      return suggestScheduledDateToken(partial);
    case "priority":
      return "!";
    case "parentDir":
      return getParentDirSuggestion(partial, ctx);
  }
}

function computeSuggestionSuffix(partial: string, suggestion: string): string | null {
  if (!suggestion) return null;
  if (!partial) return suggestion;
  if (suggestion.toLowerCase().startsWith(partial.toLowerCase())) {
    return suggestion.slice(partial.length);
  }
  return null;
}

function isPropertyFilled(
  segments: string[],
  property: ProjectComposerProperty,
  ctx: ProjectComposerAssistContext
): boolean {
  const index = PROJECT_COMPOSER_PROPERTY_ORDER.indexOf(property);
  const segment = segments[index];
  if (segment === undefined) return false;
  if (property === "due" || property === "priority") {
    if (!segment.trim()) return false;
  }
  return projectSegmentMatchesProperty(segment, property, ctx);
}

function buildPropertyStatuses(
  segments: string[],
  activeProperty: ProjectComposerProperty | null,
  inSemicolonMode: boolean,
  ctx: ProjectComposerAssistContext
): Array<{ key: ProjectComposerProperty; status: PropertyStatus }> {
  return PROJECT_COMPOSER_PROPERTY_ORDER.map((key) => {
    if (activeProperty && key === activeProperty) {
      return { key, status: "active" as const };
    }
    if (key === "title") {
      const filled = inSemicolonMode
        ? isPropertyFilled(segments, "title", ctx)
        : segments[0]?.trim().length > 0;
      return { key, status: filled ? ("filled" as const) : ("pending" as const) };
    }
    if (!inSemicolonMode) {
      return { key, status: "pending" as const };
    }
    return {
      key,
      status: isPropertyFilled(segments, key, ctx) ? ("filled" as const) : ("pending" as const),
    };
  });
}

export function getProjectComposerAssistFromValue(
  value: string,
  cursor: number,
  ctx: ProjectComposerAssistContext
): ProjectComposerAssistState {
  const { lineText, cursorInLine } = getLineAtCursor(value, cursor);
  return getProjectComposerAssist(lineText, cursorInLine, ctx);
}

export function getProjectComposerAssist(
  lineText: string,
  cursorInLine: number,
  ctx: ProjectComposerAssistContext
): ProjectComposerAssistState {
  const inSemicolonMode = lineText.includes(";");
  const segments = splitLineSegments(lineText);
  const segmentIndex = getSegmentIndexAtCursor(lineText, cursorInLine);
  const segmentRaw = getCurrentSegmentRaw(lineText, cursorInLine);
  const segmentTrimmed = segmentRaw.trim();

  let activeProperty: ProjectComposerProperty = "title";
  let suggestion: string | null = null;
  let suggestionSuffix: string | null = null;

  if (inSemicolonMode) {
    const segmentProperty = propertyForSegmentIndex(segmentIndex);

    if (segmentProperty === null) {
      const properties = buildPropertyStatuses(segments, null, inSemicolonMode, ctx);
      return {
        properties,
        activeProperty: "parentDir",
        suggestion: null,
        suggestionSuffix: null,
        segmentIndex,
        inSemicolonMode,
      };
    }

    activeProperty = segmentProperty;

    if (
      segmentProperty !== "title" &&
      projectSegmentMatchesProperty(segmentTrimmed, segmentProperty, ctx)
    ) {
      const advanced = nextProperty(segmentProperty);
      if (advanced) activeProperty = advanced;
    }

    const editingProperty =
      segmentProperty !== "title" &&
      !projectSegmentMatchesProperty(segmentTrimmed, segmentProperty, ctx)
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
      !projectSegmentMatchesProperty(segmentTrimmed, segmentProperty, ctx)
        ? segmentProperty
        : null);

    const propertyToSuggest = suggestFor && suggestFor !== "title" ? suggestFor : null;

    if (propertyToSuggest) {
      const skipParentDir =
        propertyToSuggest === "parentDir" && !parentDirSegmentSupportsCompletion(lineText);
      if (!skipParentDir) {
        const partial =
          propertyToSuggest === "due" || propertyToSuggest === "parentDir" ? segmentTrimmed : "";
        suggestion = getDefaultSuggestion(propertyToSuggest, ctx, partial);
        if (suggestion) {
          suggestionSuffix = computeSuggestionSuffix(segmentTrimmed, suggestion);
        }
      }
    }

    if (
      segmentProperty !== "title" &&
      projectSegmentMatchesProperty(segmentTrimmed, segmentProperty, ctx) &&
      !suggestionSuffix
    ) {
      suggestion = null;
      suggestionSuffix = null;
    }
  }

  const properties = buildPropertyStatuses(segments, activeProperty, inSemicolonMode, ctx);

  return {
    properties,
    activeProperty,
    suggestion,
    suggestionSuffix,
    segmentIndex,
    inSemicolonMode,
  };
}

/** Text to insert when accepting a suggestion (suffix only). */
export function getProjectAcceptInsertText(state: ProjectComposerAssistState): string | null {
  if (!state.suggestionSuffix) return null;
  return state.suggestionSuffix;
}

/** Whether accepting should append `; ` to advance to the next property segment. */
export function shouldAppendSemicolonAfterProjectAccept(
  lineText: string,
  cursorInLine: number,
  state: ProjectComposerAssistState
): boolean {
  if (!state.suggestion || state.activeProperty === "title") return false;
  if (nextProperty(state.activeProperty) === null) return false;
  const afterInsert = lineText.slice(cursorInLine);
  const trimmedAfter = afterInsert.trimStart();
  if (trimmedAfter.startsWith(";")) return false;
  return true;
}
