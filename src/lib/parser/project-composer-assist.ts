import { isScheduledDateToken, suggestScheduledDateToken } from "@/lib/dates/scheduled-date-input";
import type { PhaseRef } from "@/lib/projects/find-phase-by-name";

import {
  type AssistConfig,
  type AssistState,
  computeAssist,
  getAcceptInsertText as coreGetAcceptInsertText,
  getLineAtCursor,
  type PropertyStatus,
  shouldAppendSemicolonAfterAccept as coreShouldAppendSemicolonAfterAccept,
} from "./composer-assist-core";

export type { PropertyStatus };

export const PROJECT_COMPOSER_PROPERTY_ORDER = ["title", "due", "priority", "parentDir"] as const;

export type ProjectComposerProperty = (typeof PROJECT_COMPOSER_PROPERTY_ORDER)[number];

export type ProjectComposerAssistState = AssistState<ProjectComposerProperty>;

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

function getSiblingPhases(ctx: ProjectComposerAssistContext): PhaseRef[] {
  const parentPhaseId = ctx.parentPhaseId ?? null;
  return ctx.phases.filter((phase) => phase.parentPhaseId === parentPhaseId);
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

function buildConfig(ctx: ProjectComposerAssistContext): AssistConfig<ProjectComposerProperty> {
  return {
    order: PROJECT_COMPOSER_PROPERTY_ORDER,
    matchProperty: (segment, property) => projectSegmentMatchesProperty(segment, property, ctx),
    suggest: (property, partial) => getDefaultSuggestion(property, ctx, partial),
    usesPartial: (property) => property === "due" || property === "parentDir",
    suppressSuggestion: (property, lineText) =>
      property === "parentDir" && !parentDirSegmentSupportsCompletion(lineText),
  };
}

export function getProjectComposerAssist(
  lineText: string,
  cursorInLine: number,
  ctx: ProjectComposerAssistContext
): ProjectComposerAssistState {
  return computeAssist(lineText, cursorInLine, buildConfig(ctx));
}

export function getProjectComposerAssistFromValue(
  value: string,
  cursor: number,
  ctx: ProjectComposerAssistContext
): ProjectComposerAssistState {
  const { lineText, cursorInLine } = getLineAtCursor(value, cursor);
  return getProjectComposerAssist(lineText, cursorInLine, ctx);
}

/** Text to insert when accepting a suggestion (suffix only). */
export function getProjectAcceptInsertText(state: ProjectComposerAssistState): string | null {
  return coreGetAcceptInsertText(state);
}

/** Whether accepting should append `; ` to advance to the next property segment. */
export function shouldAppendSemicolonAfterProjectAccept(
  lineText: string,
  cursorInLine: number,
  state: ProjectComposerAssistState
): boolean {
  return coreShouldAppendSemicolonAfterAccept(
    PROJECT_COMPOSER_PROPERTY_ORDER,
    lineText,
    cursorInLine,
    state
  );
}
