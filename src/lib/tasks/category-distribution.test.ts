import { describe, expect, it } from "vitest";

import { DEFAULT_CLASSIFIER_CONFIG } from "./category-classifier";
import { inferCategoryFromDistribution } from "./category-distribution";

// Hosted-model output is a JSON probability map; these exercise the parse + floor/margin
// gate (1.AIc) without any network or model. Floor 0.7, margin 0.1 (DEFAULT_CLASSIFIER_CONFIG).

describe("inferCategoryFromDistribution", () => {
  it("returns the top category when it clears floor + margin", () => {
    const text = JSON.stringify({
      business: 0.85,
      personal: 0.15,
    });
    expect(inferCategoryFromDistribution(text)).toEqual({
      category: "business",
      confidence: 0.85,
    });
  });

  it("abstains (null) when the top is below the floor", () => {
    const text = JSON.stringify({
      business: 0.6,
      personal: 0.4,
    });
    expect(inferCategoryFromDistribution(text)).toBeNull();
  });

  it("abstains (null) when the top doesn't beat the runner-up by the margin", () => {
    // With floor 0.7 the margin can never bind (top ≥ 0.7 ⇒ runner-up ≤ 0.3), so isolate
    // the margin gate with a lower floor: top 0.52, runner-up 0.48 → margin 0.04 < 0.1.
    const config = { ...DEFAULT_CLASSIFIER_CONFIG, floor: 0.4 };
    const text = JSON.stringify({
      business: 0.52,
      personal: 0.48,
    });
    expect(inferCategoryFromDistribution(text, config)).toBeNull();
    // Same floor, but a clear margin → confident.
    const clear = JSON.stringify({
      business: 0.6,
      personal: 0.4,
    });
    expect(inferCategoryFromDistribution(clear, config)).toEqual({
      category: "business",
      confidence: 0.6,
    });
  });

  it("renormalizes unknown/garbage keys away before gating", () => {
    const text = JSON.stringify({
      business: 0.9,
      personal: 0.1,
      not_a_category: 0.8,
    });
    // Known keys renormalize to 0.9 / (0.9 + 0.1) = 0.9 → still confident.
    expect(inferCategoryFromDistribution(text)).toEqual({
      category: "business",
      confidence: 0.9,
    });
  });

  it("extracts the JSON object from surrounding prose", () => {
    const text = 'Here you go: {"personal": 0.95, "business": 0.05} — hope that helps!';
    expect(inferCategoryFromDistribution(text)).toEqual({
      category: "personal",
      confidence: 0.95,
    });
  });

  it("returns null for no JSON, invalid JSON, or all-zero scores", () => {
    expect(inferCategoryFromDistribution("no json here")).toBeNull();
    expect(inferCategoryFromDistribution("{ not valid json }")).toBeNull();
    expect(inferCategoryFromDistribution(JSON.stringify({ business: 0 }))).toBeNull();
  });
});
