// Shared skeleton for the semicolon-segment composer assist engines.
//
// Both the Plan composer (`composer-assist.ts`) and the Projects composer
// (`project-composer-assist.ts`) drive the same ghost-text + Tab-accept model
// over `title; due; priority; …` segments. They differ only in *which*
// properties they expose and how each property matches/suggests — so that
// per-engine variation is expressed through `AssistConfig`, and the control
// flow lives here once. Keeping the skeleton single-sourced is what stops the
// two engines from drifting (the failure mode the E2E audit flagged).

export type PropertyStatus = "active" | "filled" | "pending";

export type AssistPropertyState<P extends string> = { key: P; status: PropertyStatus };

export type AssistState<P extends string> = {
  properties: Array<AssistPropertyState<P>>;
  activeProperty: P;
  suggestion: string | null;
  suggestionSuffix: string | null;
  segmentIndex: number;
  inSemicolonMode: boolean;
};

/** A suggestion that overrides the positional property for the active segment. */
export type FallbackSuggestion<P extends string> = {
  property: P;
  suggestion: string;
  suggestionSuffix: string;
};

export type AssistConfig<P extends string> = {
  /** Property order; `order[0]` is the title/free-text segment. */
  order: readonly P[];
  /** Does `segment` satisfy `property` (used for both status + advance logic)? */
  matchProperty: (segment: string, property: P) => boolean;
  /** Ghost suggestion for `property` given the partial segment text. */
  suggest: (property: P, partial: string) => string | null;
  /** Which properties consume the partial text (vs. suggesting from empty). */
  usesPartial: (property: P) => boolean;
  /** Normalize a partial before computing the accept-suffix (e.g. strip a leading `#`). */
  normalizeForSuffix?: (partial: string) => string;
  /** Suggestion for segments beyond the last known property (e.g. free tags). */
  extraSegmentSuggestion?: (segmentTrimmed: string) => string | null;
  /** Cross-slot fallback (e.g. offer a project slug in any non-title segment). */
  fallbackSuggestion?: (segmentTrimmed: string) => FallbackSuggestion<P> | null;
  /** Suppress a suggestion for `property` given the whole line (e.g. `//`/`+` paths). */
  suppressSuggestion?: (property: P, lineText: string) => boolean;
};

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

export function splitLineSegments(lineText: string): string[] {
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

export function computeSuggestionSuffix(
  partial: string,
  suggestion: string,
  normalize: (s: string) => string = (s) => s
): string | null {
  if (!suggestion) return null;
  const normalizedPartial = normalize(partial);
  if (!normalizedPartial) return suggestion;
  if (suggestion.toLowerCase().startsWith(normalizedPartial.toLowerCase())) {
    return suggestion.slice(normalizedPartial.length);
  }
  return null;
}

function propertyForSegmentIndex<P extends string>(order: readonly P[], index: number): P | null {
  if (index <= 0) return order[0] ?? null;
  return index < order.length ? (order[index] ?? null) : null;
}

export function nextProperty<P extends string>(order: readonly P[], property: P): P | null {
  const idx = order.indexOf(property);
  if (idx < 0 || idx >= order.length - 1) return null;
  return order[idx + 1] ?? null;
}

function isPropertyFilled<P extends string>(
  order: readonly P[],
  segments: string[],
  property: P,
  matchProperty: (segment: string, property: P) => boolean
): boolean {
  const index = order.indexOf(property);
  const segment = segments[index];
  if (segment === undefined) return false;
  return matchProperty(segment, property);
}

function buildPropertyStatuses<P extends string>(
  order: readonly P[],
  segments: string[],
  activeProperty: P | null,
  inSemicolonMode: boolean,
  matchProperty: (segment: string, property: P) => boolean
): Array<AssistPropertyState<P>> {
  const titleKey = order[0];
  return order.map((key) => {
    if (activeProperty && key === activeProperty) {
      return { key, status: "active" as const };
    }
    if (key === titleKey) {
      const filled = inSemicolonMode
        ? isPropertyFilled(order, segments, titleKey, matchProperty)
        : (segments[0]?.trim().length ?? 0) > 0;
      return { key, status: filled ? ("filled" as const) : ("pending" as const) };
    }
    if (!inSemicolonMode) {
      return { key, status: "pending" as const };
    }
    return {
      key,
      status: isPropertyFilled(order, segments, key, matchProperty)
        ? ("filled" as const)
        : ("pending" as const),
    };
  });
}

export function computeAssist<P extends string>(
  lineText: string,
  cursorInLine: number,
  config: AssistConfig<P>
): AssistState<P> {
  const { order, matchProperty } = config;
  const titleKey = order[0];
  const lastKey = order[order.length - 1];
  const normalize = config.normalizeForSuffix;

  const inSemicolonMode = lineText.includes(";");
  const segments = splitLineSegments(lineText);
  const segmentIndex = getSegmentIndexAtCursor(lineText, cursorInLine);
  const segmentTrimmed = getCurrentSegmentRaw(lineText, cursorInLine).trim();

  let activeProperty: P = titleKey;
  let suggestion: string | null = null;
  let suggestionSuffix: string | null = null;

  if (inSemicolonMode) {
    const segmentProperty = propertyForSegmentIndex(order, segmentIndex);

    // Beyond the last positional property: offer a cross-slot fallback (project
    // slug), then a free-segment suggestion (tags), else just report statuses.
    if (segmentProperty === null) {
      const properties = buildPropertyStatuses(
        order,
        segments,
        null,
        inSemicolonMode,
        matchProperty
      );
      const fallback = config.fallbackSuggestion?.(segmentTrimmed) ?? null;
      if (fallback) {
        return {
          properties,
          activeProperty: fallback.property,
          suggestion: fallback.suggestion,
          suggestionSuffix: fallback.suggestionSuffix,
          segmentIndex,
          inSemicolonMode,
        };
      }
      const extra = config.extraSegmentSuggestion?.(segmentTrimmed) ?? null;
      const extraSuffix = extra ? computeSuggestionSuffix(segmentTrimmed, extra, normalize) : null;
      return {
        properties,
        activeProperty: lastKey,
        suggestion: extra,
        suggestionSuffix: extraSuffix,
        segmentIndex,
        inSemicolonMode,
      };
    }

    activeProperty = segmentProperty;
    const matchesHere = matchProperty(segmentTrimmed, segmentProperty);

    if (segmentProperty !== titleKey && matchesHere) {
      const advanced = nextProperty(order, segmentProperty);
      if (advanced) activeProperty = advanced;
    }

    const editingProperty =
      segmentProperty !== titleKey && !matchesHere
        ? segmentProperty
        : activeProperty !== segmentProperty &&
            segmentIndex >= 1 &&
            segmentIndex <= 3 &&
            !segmentTrimmed
          ? activeProperty
          : null;

    const suggestFor =
      editingProperty ?? (segmentProperty !== titleKey && !matchesHere ? segmentProperty : null);

    const propertyToSuggest = suggestFor && suggestFor !== titleKey ? suggestFor : null;

    if (propertyToSuggest && !config.suppressSuggestion?.(propertyToSuggest, lineText)) {
      const partial = config.usesPartial(propertyToSuggest) ? segmentTrimmed : "";
      suggestion = config.suggest(propertyToSuggest, partial);
      if (suggestion) {
        suggestionSuffix = computeSuggestionSuffix(segmentTrimmed, suggestion, normalize);
      }
    }

    if (segmentProperty !== titleKey && matchesHere && !suggestionSuffix) {
      suggestion = null;
      suggestionSuffix = null;
    }

    // Cross-slot fallback (project slug) when nothing else completed here.
    if (config.fallbackSuggestion && !suggestionSuffix && segmentProperty !== titleKey) {
      const fallback = config.fallbackSuggestion(segmentTrimmed);
      if (fallback) {
        suggestion = fallback.suggestion;
        suggestionSuffix = fallback.suggestionSuffix;
        activeProperty = fallback.property;
      }
    }
  }

  const properties = buildPropertyStatuses(
    order,
    segments,
    activeProperty,
    inSemicolonMode,
    matchProperty
  );

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
export function getAcceptInsertText<P extends string>(state: AssistState<P>): string | null {
  if (!state.suggestionSuffix) return null;
  return state.suggestionSuffix;
}

/** Whether accepting should append `; ` to advance to the next property segment. */
export function shouldAppendSemicolonAfterAccept<P extends string>(
  order: readonly P[],
  lineText: string,
  cursorInLine: number,
  state: AssistState<P>
): boolean {
  if (!state.suggestion || state.activeProperty === order[0]) return false;
  if (nextProperty(order, state.activeProperty) === null) return false;
  const afterInsert = lineText.slice(cursorInLine);
  const trimmedAfter = afterInsert.trimStart();
  if (trimmedAfter.startsWith(";")) return false;
  return true;
}
