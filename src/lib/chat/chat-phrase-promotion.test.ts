import { describe, expect, it } from "vitest";

import {
  isEligibleForPhraseTracking,
  isGeneralizedCommand,
  matchesBuiltInPhrase,
  normalizeChatPhrase,
  qualifiesForPromotion,
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
    it("promotes at 6 sends", () => {
      expect(shouldPromote(5)).toBe(false);
      expect(shouldPromote(6)).toBe(true);
      expect(shouldPromote(7)).toBe(true);
    });
  });

  describe("isGeneralizedCommand", () => {
    it("accepts reusable general commands", () => {
      expect(isGeneralizedCommand("What should I work on")).toBe(true);
      expect(isGeneralizedCommand("walk through my week ahead")).toBe(true);
      expect(isGeneralizedCommand("Summarize my week")).toBe(true);
      expect(isGeneralizedCommand("How am I doing on balance?")).toBe(true);
    });

    it("rejects the promoted subphrases typo that prompted this gate", () => {
      expect(
        isGeneralizedCommand(
          "Lets add some subphrases. For Today: morning triage, calendar view, today's review, task list (plus adding/editing/deleting tasks)"
        )
      ).toBe(false);
    });

    it("rejects one-off mutation instructions", () => {
      expect(isGeneralizedCommand("add a task to call the plumber")).toBe(false);
      expect(isGeneralizedCommand("create a phase for onboarding")).toBe(false);
      expect(isGeneralizedCommand("move everything to next week")).toBe(false);
      expect(isGeneralizedCommand("delete the old milestones")).toBe(false);
    });

    it("does not false-positive on words merely containing a mutation verb", () => {
      expect(isGeneralizedCommand("how is the remodel tracking")).toBe(true);
      expect(isGeneralizedCommand("what makes this week heavy")).toBe(true);
    });

    it("rejects phrases pinned to specific rows or dates", () => {
      expect(isGeneralizedCommand("how is #flowstate-x-kash going")).toBe(false);
      expect(isGeneralizedCommand("what happened on July 4")).toBe(false);
      expect(isGeneralizedCommand("plan around triage, review, and inbox")).toBe(false);
    });

    it("rejects long phrases that read as requests rather than commands", () => {
      expect(
        isGeneralizedCommand(
          "could you please walk me through everything I have going on this week"
        )
      ).toBe(false);
    });
  });

  describe("qualifiesForPromotion", () => {
    it("requires both the send threshold and a generalized command", () => {
      expect(qualifiesForPromotion("walk through my week ahead", 5)).toBe(false);
      expect(qualifiesForPromotion("walk through my week ahead", 6)).toBe(true);
      expect(qualifiesForPromotion("add a task to call the plumber", 6)).toBe(false);
    });
  });
});
