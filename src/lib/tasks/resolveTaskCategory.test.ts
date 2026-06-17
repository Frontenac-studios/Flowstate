import { describe, expect, it, vi } from "vitest";

import {
  AI_CONFIDENCE_THRESHOLD,
  DEFAULT_FALLBACK_CATEGORY,
  type InferCategoryFromTitle,
  resolveTaskCategory,
} from "./resolveTaskCategory";

// A confident inference of "relationships" — strong enough to clear the threshold.
const inferRelationships: InferCategoryFromTitle = () => ({
  category: "relationships",
  confidence: 0.95,
});

// Inference that has an opinion but is below the default threshold.
const inferWeakly: InferCategoryFromTitle = () => ({
  category: "relationships",
  confidence: 0.4,
});

// Inference that always abstains.
const inferNothing: InferCategoryFromTitle = () => null;

describe("resolveTaskCategory", () => {
  it("explicit assignment beats every other layer", () => {
    const result = resolveTaskCategory(
      "Call mom",
      {
        explicit: "professional",
        projectCategory: "personal_projects",
        lastUsed: "body_mind",
        online: true,
      },
      inferRelationships
    );
    expect(result).toEqual({ category: "professional", unresolved: false, source: "explicit" });
  });

  it("project category wins when there is no explicit value", () => {
    const result = resolveTaskCategory(
      "Ship the build",
      { projectCategory: "personal_projects", lastUsed: "professional", online: true },
      inferRelationships
    );
    expect(result.category).toBe("personal_projects");
    expect(result.source).toBe("project");
  });

  it("AI wins over last-used when online and above the threshold", () => {
    const result = resolveTaskCategory(
      "Call mom",
      { lastUsed: "professional", online: true },
      inferRelationships
    );
    expect(result).toEqual({ category: "relationships", unresolved: false, source: "ai" });
  });

  it("AI is accepted exactly at the threshold (>=)", () => {
    const inferAtThreshold: InferCategoryFromTitle = () => ({
      category: "relationships",
      confidence: AI_CONFIDENCE_THRESHOLD,
    });
    const result = resolveTaskCategory("Call mom", { online: true }, inferAtThreshold);
    expect(result.source).toBe("ai");
  });

  it("falls back to last-used when the AI guess is below the threshold", () => {
    const result = resolveTaskCategory(
      "Call mom",
      { lastUsed: "professional", online: true },
      inferWeakly
    );
    expect(result).toEqual({ category: "professional", unresolved: false, source: "lastUsed" });
  });

  it("falls back to last-used when the AI abstains", () => {
    const result = resolveTaskCategory(
      "Do the thing",
      { lastUsed: "professional", online: true },
      inferNothing
    );
    expect(result.source).toBe("lastUsed");
  });

  it("skips the AI layer entirely when offline, even if it would be confident", () => {
    const infer = vi.fn(inferRelationships);
    const result = resolveTaskCategory(
      "Call mom",
      { lastUsed: "professional", online: false },
      infer
    );
    expect(infer).not.toHaveBeenCalled();
    expect(result).toEqual({ category: "professional", unresolved: false, source: "lastUsed" });
  });

  it("returns the unresolved invisible-plumbing fallback when nothing else resolves", () => {
    const result = resolveTaskCategory("Call mom", { online: false }, inferRelationships);
    expect(result).toEqual({
      category: DEFAULT_FALLBACK_CATEGORY,
      unresolved: true,
      source: "fallback",
    });
  });

  it("uses the fallback when online but the AI abstains and there is no last-used", () => {
    const result = resolveTaskCategory("Do the thing", { online: true }, inferNothing);
    expect(result.source).toBe("fallback");
    expect(result.unresolved).toBe(true);
  });

  it("honours a custom threshold (0 makes any AI opinion win)", () => {
    const result = resolveTaskCategory(
      "Call mom",
      { lastUsed: "professional", online: true },
      inferWeakly,
      0
    );
    expect(result.source).toBe("ai");
    expect(result.category).toBe("relationships");
  });
});
