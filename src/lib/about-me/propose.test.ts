import { describe, expect, it } from "vitest";

import { aboutMeSuggestionPayloadKey } from "./propose";

describe("aboutMeSuggestionPayloadKey", () => {
  it("dedupes by section and stable JSON payload", () => {
    const key = aboutMeSuggestionPayloadKey("values", { label: "Rest" });
    expect(key).toBe('values:{"label":"Rest"}');
    expect(aboutMeSuggestionPayloadKey("values", { label: "Rest" })).toBe(key);
    expect(aboutMeSuggestionPayloadKey("work", { label: "Rest" })).not.toBe(key);
  });
});
