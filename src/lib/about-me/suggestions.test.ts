import { describe, expect, it } from "vitest";

import { parseSuggestionPayload } from "./suggestions";

describe("parseSuggestionPayload", () => {
  it("validates a value payload", () => {
    expect(parseSuggestionPayload("values", { label: "Rest" })).toEqual({ label: "Rest" });
    expect(() => parseSuggestionPayload("values", { label: "" })).toThrow();
  });

  it("validates a prose payload for work/life", () => {
    expect(parseSuggestionPayload("work", { text: "Declines late Friday meetings." })).toEqual({
      text: "Declines late Friday meetings.",
    });
    expect(() => parseSuggestionPayload("life", { text: "   " })).toThrow();
  });

  it("validates a constraint payload", () => {
    const payload = {
      type: "commitment",
      label: "School run",
      schedule: { days: [1, 2, 3, 4, 5], startMin: 900, endMin: 945 },
      severity: "hard",
    };
    expect(parseSuggestionPayload("constraints", payload)).toMatchObject({
      type: "commitment",
      severity: "hard",
    });
  });

  it("rejects a constraint payload with a bad severity", () => {
    expect(() =>
      parseSuggestionPayload("constraints", {
        type: "preference",
        label: "No late meetings",
        severity: "maybe",
      })
    ).toThrow();
  });
});
