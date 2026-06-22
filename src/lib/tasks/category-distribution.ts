import { PROJECT_CATEGORIES } from "../projects/categories";

import { type ClassifierConfig, DEFAULT_CLASSIFIER_CONFIG } from "./category-classifier";
import { type CategoryInference } from "./resolveTaskCategory";

// Phase 1 (1H / 1.AId / C4): the pure scoring core for the HOSTED category classifier.
// The sharper hosted model (Haiku) returns a probability distribution over the five
// categories; this parses it and applies the SAME floor + margin gate the local
// embeddings classifier uses (see category-classifier.ts), so the hosted server path and
// the local live path agree on when to commit vs. abstain (1.AIc). No model or async here
// — the model output is a string, injected — so this stays trivially testable, mirroring
// classifyEmbedding. The one-time bulk backfill applies the identical gate (0.3 / Q2).

/**
 * Parse a hosted-model JSON probability distribution over the categories and return a
 * confident pick, or null when the floor+margin gate isn't met (the resolver then falls
 * through to last-used / unresolved). Unknown keys are ignored; the kept scores are
 * renormalized to sum 1 so the floor stays meaningful.
 */
export function inferCategoryFromDistribution(
  text: string,
  config: ClassifierConfig = DEFAULT_CLASSIFIER_CONFIG
): CategoryInference | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;

  let raw: unknown;
  try {
    raw = JSON.parse(match[0]);
  } catch {
    return null;
  }
  if (typeof raw !== "object" || raw === null) return null;

  const rec = raw as Record<string, unknown>;
  const scores = PROJECT_CATEGORIES.map(
    (category) => [category, Number(rec[category]) || 0] as const
  );
  const total = scores.reduce((acc, [, value]) => acc + value, 0);
  if (total <= 0) return null;

  const ranked = scores
    .map(([category, value]) => [category, value / total] as const)
    .sort((a, b) => b[1] - a[1]);

  const [topCategory, top] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;

  if (top < config.floor) return null;
  if (top - runnerUp < config.margin) return null;

  return { category: topCategory, confidence: top };
}
