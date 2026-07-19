import { CHAT_SUGGESTION_DEFS } from "./chat-suggestion-defs";

export const PROMOTION_SEND_THRESHOLD = 6;
export const MAX_CUSTOM_SUGGESTIONS = 8;
export const MIN_NORMALIZED_PHRASE_LENGTH = 5;
export const MAX_TRACKED_PHRASE_LENGTH = 200;
export const SUGGESTION_LABEL_MAX_LENGTH = 48;
export const MAX_GENERALIZED_COMMAND_WORDS = 12;

/**
 * Verbs that mutate data. A phrase carrying one is an instruction about specific
 * rows ("add these subphases"), not a reusable command, so it never becomes a chip.
 */
const MUTATION_VERBS = [
  "add",
  "assign",
  "create",
  "delete",
  "make",
  "mark",
  "move",
  "new",
  "remove",
  "rename",
  "schedule",
  "set",
] as const;

const MUTATION_VERB_PATTERN = new RegExp(`\\b(${MUTATION_VERBS.join("|")})\\b`);

/** Markers that pin a phrase to specific rows, dates, or a one-off enumeration. */
const SPECIFICITY_PATTERNS = [
  /#[a-z0-9-]+/, // project or phase slug
  /\d/, // any digit — dates, counts, times
  /["'“”‘’]/, // quoted literal
  /:/, // "For Today: a, b, c" enumeration
  /,.*,/, // three-or-more-item list
] as const;

const BUILTIN_NORMALIZED_PHRASES = CHAT_SUGGESTION_DEFS.map((def) =>
  normalizeChatPhrase(def.userText)
);

export function normalizeChatPhrase(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function truncateSuggestionLabel(
  text: string,
  maxLen = SUGGESTION_LABEL_MAX_LENGTH
): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1).trimEnd()}…`;
}

export function isEligibleForPhraseTracking(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_TRACKED_PHRASE_LENGTH) return false;

  const normalized = normalizeChatPhrase(trimmed);
  return normalized.length >= MIN_NORMALIZED_PHRASE_LENGTH;
}

export function matchesBuiltInPhrase(normalized: string): boolean {
  return BUILTIN_NORMALIZED_PHRASES.includes(normalized);
}

/**
 * Chips are reusable general commands ("what should I work on?", "walk through my
 * week ahead") — never one-off instructions to create or edit specific rows. This
 * gates promotion only; sends are still counted so the underlying data stays honest.
 */
export function isGeneralizedCommand(text: string): boolean {
  const normalized = normalizeChatPhrase(text);
  if (!normalized) return false;

  if (normalized.split(" ").length > MAX_GENERALIZED_COMMAND_WORDS) return false;
  if (MUTATION_VERB_PATTERN.test(normalized)) return false;

  return !SPECIFICITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function shouldPromote(sendCount: number): boolean {
  return sendCount >= PROMOTION_SEND_THRESHOLD;
}

/** Full promotion test: enough repeats, and general enough to be worth a chip. */
export function qualifiesForPromotion(text: string, sendCount: number): boolean {
  return shouldPromote(sendCount) && isGeneralizedCommand(text);
}
