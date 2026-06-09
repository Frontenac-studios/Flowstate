import { describe, expect, it } from "vitest";

import {
  isEligibleForPhraseTracking,
  matchesBuiltInPhrase,
  normalizeChatPhrase,
  shouldPromote,
  truncateSuggestionLabel,
} from "./chat-phrase-promotion";

describe("chat-phrase-promotion", () => {
  describe("normalizeChatPhrase", () => {
    it("trims, lowercases, and collapses whitespace", () => {
      expect(normalizeChatPhrase("  What's   Next?  ")).toBe("what's next?");
    });
  });

  describe("isEligibleForPhraseTracking", () => {
    it("accepts phrases within length bounds", () => {
      expect(isEligibleForPhraseTracking("Summarize my week")).toBe(true);
    });

    it("rejects empty or too-short phrases", () => {
      expect(isEligibleForPhraseTracking("   ")).toBe(false);
      expect(isEligibleForPhraseTracking("hi")).toBe(false);
    });

    it("rejects phrases over 200 characters", () => {
      expect(isEligibleForPhraseTracking("a".repeat(201))).toBe(false);
    });
  });

  describe("matchesBuiltInPhrase", () => {
    it("matches the work_on built-in phrase", () => {
      expect(matchesBuiltInPhrase(normalizeChatPhrase("What should I work on"))).toBe(true);
    });

    it("does not match unrelated phrases", () => {
      expect(matchesBuiltInPhrase(normalizeChatPhrase("Summarize my week"))).toBe(false);
    });
  });

  describe("truncateSuggestionLabel", () => {
    it("returns short text unchanged", () => {
      expect(truncateSuggestionLabel("Summarize my week")).toBe("Summarize my week");
    });

    it("truncates long text with ellipsis", () => {
      const long = "a".repeat(60);
      const result = truncateSuggestionLabel(long);
      expect(result.length).toBeLessThanOrEqual(48);
      expect(result.endsWith("…")).toBe(true);
    });
  });

  describe("shouldPromote", () => {
    it("promotes at 3 sends", () => {
      expect(shouldPromote(2)).toBe(false);
      expect(shouldPromote(3)).toBe(true);
      expect(shouldPromote(4)).toBe(true);
    });
  });
});
