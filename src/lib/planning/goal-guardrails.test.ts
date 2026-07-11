import { describe, expect, it } from "vitest";

import { evaluateGoalSuggestion, GOAL_TITLE_MAX_CHARS } from "./goal-guardrails";

describe("evaluateGoalSuggestion", () => {
  it("passes concrete, binary goals", () => {
    for (const title of [
      "Run a 10k",
      "Take a solo trip abroad",
      "Host 4 dinner parties",
      "Learn to sail",
      "Read 12 books",
    ]) {
      expect(evaluateGoalSuggestion(title)).toEqual({ ok: true, title });
    }
  });

  it("rejects recurring / habit language", () => {
    for (const title of [
      "Meditate every morning",
      "Go to the gym 3x a week",
      "Journal daily",
      "Build a weekly running routine",
      "Make exercise a habit",
    ]) {
      expect(evaluateGoalSuggestion(title)).toEqual({ ok: false, reason: "recurring" });
    }
  });

  it("rejects vague, non-binary aspirations", () => {
    for (const title of [
      "Exercise more",
      "Travel more",
      "Get fitter",
      "Be more present",
      "Improve my Spanish",
      "Be present",
    ]) {
      const result = evaluateGoalSuggestion(title);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.reason).toBe("not_binary");
    }
  });

  it("rejects empty and over-long titles", () => {
    expect(evaluateGoalSuggestion("   ")).toEqual({ ok: false, reason: "empty" });
    expect(evaluateGoalSuggestion("x".repeat(GOAL_TITLE_MAX_CHARS + 1))).toEqual({
      ok: false,
      reason: "too_long",
    });
  });

  it("normalizes whitespace on pass", () => {
    expect(evaluateGoalSuggestion("  Run   a  10k  ")).toEqual({ ok: true, title: "Run a 10k" });
  });
});
