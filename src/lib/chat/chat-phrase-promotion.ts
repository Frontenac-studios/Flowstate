import { CHAT_SUGGESTION_DEFS } from "./chat-suggestion-defs";

export const PROMOTION_SEND_THRESHOLD = 3;
export const MAX_CUSTOM_SUGGESTIONS = 8;
export const MIN_NORMALIZED_PHRASE_LENGTH = 5;
export const MAX_TRACKED_PHRASE_LENGTH = 200;
export const SUGGESTION_LABEL_MAX_LENGTH = 48;

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

export function shouldPromote(sendCount: number): boolean {
  return sendCount >= PROMOTION_SEND_THRESHOLD;
}
